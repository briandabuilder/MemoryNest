import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { listRecords, countRecords } from '../services/database';
import { analyzeEmotionalPatterns, generateMemoryInsights } from '../services/aiService';
import { Memory, Person, DashboardStats, MemoryTimeline, PersonInsights } from '../types';
import { logger } from '../utils/logger';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const router = Router();

// Get dashboard overview statistics
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    // Get basic counts
    const [totalMemories, totalPeople] = await Promise.all([
      countRecords('memories', { userId: req.user.id }),
      countRecords('people', { userId: req.user.id }),
    ]);

    // Get recent memories for calculations
    const recentMemories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        limit: 50,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    // Calculate average mood
    const averageMood = recentMemories.length > 0
      ? recentMemories.reduce((sum, memory) => sum + memory.mood, 0) / recentMemories.length
      : 0;

    // Get most frequent emotion
    const emotionCounts: Record<string, number> = {};
    recentMemories.forEach(memory => {
      emotionCounts[memory.emotions.primary] = (emotionCounts[memory.emotions.primary] || 0) + 1;
    });

    const mostFrequentEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    // Get memories from this week
    const weekAgo = subDays(new Date(), 7);
    const memoriesThisWeek = recentMemories.filter(memory => 
      new Date(memory.createdAt) >= weekAgo
    ).length;

    // Get people from this week
    const peopleThisWeek = new Set(
      memoriesThisWeek > 0 
        ? recentMemories
            .filter(memory => new Date(memory.createdAt) >= weekAgo)
            .flatMap(memory => memory.people)
        : []
    ).size;

    const stats: DashboardStats = {
      totalMemories,
      totalPeople,
      averageMood: Math.round(averageMood * 10) / 10,
      mostFrequentEmotion,
      memoriesThisWeek,
      peopleThisWeek,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview',
    });
  }
}));

// Get memory timeline
router.get('/timeline', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { days = 30 } = req.query;

  try {
    const startDate = subDays(new Date(), parseInt(days as string));
    
    const memories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    // Filter memories within the date range
    const filteredMemories = memories.filter(memory => 
      new Date(memory.createdAt) >= startDate
    );

    // Group memories by date
    const timelineMap = new Map<string, Memory[]>();
    
    filteredMemories.forEach(memory => {
      const dateKey = format(new Date(memory.createdAt), 'yyyy-MM-dd');
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, []);
      }
      timelineMap.get(dateKey)!.push(memory);
    });

    // Convert to timeline format
    const timeline: MemoryTimeline[] = Array.from(timelineMap.entries()).map(([date, memories]) => {
      const averageMood = memories.reduce((sum, memory) => sum + memory.mood, 0) / memories.length;
      
      return {
        date,
        memories,
        averageMood: Math.round(averageMood * 10) / 10,
      };
    });

    // Sort by date (newest first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    logger.error('Timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timeline',
    });
  }
}));

// Get people insights
router.get('/people-insights', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const [people, memories] = await Promise.all([
      listRecords<Person>('people', { userId: req.user.id }),
      listRecords<Memory>('memories', { userId: req.user.id }),
    ]);

    const insights: PersonInsights[] = people.map(person => {
      const personMemories = memories.filter(memory => 
        memory.people.includes(person.id)
      );

      const memoryCount = personMemories.length;
      const averageMood = memoryCount > 0
        ? personMemories.reduce((sum, memory) => sum + memory.mood, 0) / memoryCount
        : 0;

      // Get most frequent emotion
      const emotionCounts: Record<string, number> = {};
      personMemories.forEach(memory => {
        emotionCounts[memory.emotions.primary] = (emotionCounts[memory.emotions.primary] || 0) + 1;
      });

      const mostFrequentEmotion = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

      // Get last interaction
      const lastInteraction = memoryCount > 0
        ? Math.max(...personMemories.map(m => new Date(m.createdAt).getTime()))
        : null;

      // Calculate relationship strength (based on memory frequency and recency)
      let relationshipStrength = 0;
      if (memoryCount > 0) {
        const daysSinceLastMemory = lastInteraction 
          ? Math.floor((Date.now() - lastInteraction) / (1000 * 60 * 60 * 24))
          : 365;
        
        // Higher score for more memories and recent interactions
        relationshipStrength = Math.min(10, 
          Math.max(1, 
            (memoryCount * 2) + Math.max(0, 10 - daysSinceLastMemory / 30)
          )
        );
      }

      return {
        person,
        memoryCount,
        averageMood: Math.round(averageMood * 10) / 10,
        mostFrequentEmotion,
        lastInteraction: lastInteraction ? new Date(lastInteraction) : null,
        relationshipStrength: Math.round(relationshipStrength),
      };
    });

    // Sort by relationship strength (highest first)
    insights.sort((a, b) => b.relationshipStrength - a.relationshipStrength);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('People insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch people insights',
    });
  }
}));

// Get emotional analysis
router.get('/emotional-analysis', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { limit = 100 } = req.query;

  try {
    const memories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        limit: parseInt(limit as string),
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    if (memories.length === 0) {
      return res.json({
        success: true,
        data: {
          dominantEmotions: [],
          moodTrend: 'stable',
          emotionalGaps: [],
          recommendations: ['Start logging your first memory to get emotional insights!'],
        },
      });
    }

    const analysis = await analyzeEmotionalPatterns(memories);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Emotional analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emotional analysis',
    });
  }
}));

// Get memory insights
router.get('/memory-insights', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { limit = 50 } = req.query;

  try {
    const [memories, people] = await Promise.all([
      listRecords<Memory>(
        'memories',
        { userId: req.user.id },
        {
          limit: parseInt(limit as string),
          orderBy: 'createdAt',
          orderDirection: 'desc',
        }
      ),
      listRecords<Person>('people', { userId: req.user.id }),
    ]);

    if (memories.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: ['Start your memory journey by logging your first moment!'],
          patterns: [],
          suggestions: ['Try logging a memory about someone important to you'],
        },
      });
    }

    const insights = await generateMemoryInsights(memories, people);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Memory insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory insights',
    });
  }
}));

// Get activity heatmap data
router.get('/activity-heatmap', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { year } = req.query;
  const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

  try {
    const memories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    // Filter memories for the target year
    const yearMemories = memories.filter(memory => {
      const memoryYear = new Date(memory.createdAt).getFullYear();
      return memoryYear === targetYear;
    });

    // Create heatmap data
    const heatmapData: Record<string, number> = {};
    
    yearMemories.forEach(memory => {
      const dateKey = format(new Date(memory.createdAt), 'yyyy-MM-dd');
      heatmapData[dateKey] = (heatmapData[dateKey] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        year: targetYear,
        heatmap: heatmapData,
        totalMemories: yearMemories.length,
      },
    });
  } catch (error) {
    logger.error('Activity heatmap error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity heatmap',
    });
  }
}));

// Get mood trends
router.get('/mood-trends', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { days = 30 } = req.query;

  try {
    const startDate = subDays(new Date(), parseInt(days as string));
    
    const memories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    // Filter memories within the date range
    const filteredMemories = memories.filter(memory => 
      new Date(memory.createdAt) >= startDate
    );

    // Group by week for trend analysis
    const weeklyData: Record<string, { count: number; totalMood: number; avgMood: number }> = {};
    
    filteredMemories.forEach(memory => {
      const weekKey = format(new Date(memory.createdAt), 'yyyy-\'W\'ww');
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { count: 0, totalMood: 0, avgMood: 0 };
      }
      weeklyData[weekKey].count++;
      weeklyData[weekKey].totalMood += memory.mood;
    });

    // Calculate averages
    Object.keys(weeklyData).forEach(week => {
      weeklyData[week].avgMood = weeklyData[week].totalMood / weeklyData[week].count;
    });

    // Convert to array format
    const trends = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      count: data.count,
      averageMood: Math.round(data.avgMood * 10) / 10,
    }));

    // Sort by week
    trends.sort((a, b) => a.week.localeCompare(b.week));

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Mood trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mood trends',
    });
  }
}));

export default router; 