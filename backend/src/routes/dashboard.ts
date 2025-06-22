import express from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Mock dashboard data
const getMockDashboardData = (userId: string) => {
  const baseData = {
    totalMemories: 12,
    averageMood: 7.8,
    mostFrequentEmotion: 'joy',
    recentMemories: 3,
    totalPeople: 8,
    activeNudges: 2,
    weeklyStats: {
      memoriesCreated: 3,
      moodTrend: [7, 8, 6, 9, 7, 8, 8],
      topEmotions: ['joy', 'contentment', 'excitement'],
      topTags: ['nature', 'friends', 'food']
    },
    recentActivity: [
      {
        id: 'activity-1',
        type: 'memory_created',
        title: 'Created memory: Coffee with an Old Friend',
        timestamp: new Date('2024-06-21T14:30:00Z'),
        description: 'You logged a new memory about reconnecting with Jessica'
      },
      {
        id: 'activity-2',
        type: 'person_added',
        title: 'Added person: Mike Chen',
        timestamp: new Date('2024-06-20T10:15:00Z'),
        description: 'You added Mike Chen as a new person in your network'
      },
      {
        id: 'activity-3',
        type: 'nudge_created',
        title: 'Created nudge: Call Mom',
        timestamp: new Date('2024-06-19T16:45:00Z'),
        description: 'You set a reminder to call your mom'
      }
    ],
    insights: [
      {
        id: 'insight-1',
        type: 'mood_pattern',
        title: 'Your mood is highest on weekends',
        description: 'Based on your recent memories, you tend to feel happier and more relaxed on Saturdays and Sundays.',
        confidence: 0.85
      },
      {
        id: 'insight-2',
        type: 'person_connection',
        title: 'You haven\'t logged memories with Sarah recently',
        description: 'It\'s been 2 weeks since your last memory involving Sarah. Consider reaching out to maintain your connection.',
        confidence: 0.72
      },
      {
        id: 'insight-3',
        type: 'emotion_trend',
        title: 'You\'ve been feeling more connected lately',
        description: 'Your recent memories show an increase in feelings of connection and belonging.',
        confidence: 0.68
      }
    ]
  };

  // Customize data based on user
  if (userId === 'user-2') {
    baseData.totalMemories = 8;
    baseData.averageMood = 8.2;
    baseData.mostFrequentEmotion = 'accomplishment';
    baseData.totalPeople = 5;
    baseData.activeNudges = 1;
  } else if (userId === 'user-3') {
    baseData.totalMemories = 15;
    baseData.averageMood = 7.5;
    baseData.mostFrequentEmotion = 'contentment';
    baseData.totalPeople = 12;
    baseData.activeNudges = 3;
  }

  return baseData;
};

// Get dashboard overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const dashboardData = getMockDashboardData(req.user.id);
    
    return res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
}));

// Get dashboard stats (alias for overview)
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const dashboardData = getMockDashboardData(req.user.id);
    
    return res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
}));

// Get weekly stats
router.get('/weekly-stats', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const dashboardData = getMockDashboardData(req.user.id);
    
    return res.json({
      success: true,
      data: dashboardData.weeklyStats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly stats',
    });
  }
}));

// Get recent activity
router.get('/recent-activity', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const dashboardData = getMockDashboardData(req.user.id);
    
    return res.json({
      success: true,
      data: dashboardData.recentActivity,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
    });
  }
}));

// Get insights
router.get('/insights', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const dashboardData = getMockDashboardData(req.user.id);
    
    return res.json({
      success: true,
      data: dashboardData.insights,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
    });
  }
}));

export default router; 