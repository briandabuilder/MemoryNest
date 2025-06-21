import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { processMemoryQuery, generateNudges, analyzeEmotionalPatterns, generateMemoryInsights } from '../services/aiService';
import { listRecords } from '../services/database';
import { AIQueryRequest, Memory, Person } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware
const validateQuery = [
  body('query').trim().isLength({ min: 1, max: 500 }),
  body('limit').optional().isInt({ min: 1, max: 50 }),
  body('filters').optional().isObject(),
];

// Process natural language memory query
router.post('/query', validateQuery, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { query, limit, filters }: AIQueryRequest = req.body;

  try {
    const result = await processMemoryQuery({
      query,
      userId: req.user.id,
      filters,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('AI query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
    });
  }
}));

// Generate smart nudges
router.post('/nudges', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { daysSinceLastMemory, emotionalGaps, inactivePeople } = req.body;

  try {
    const nudges = await generateNudges(
      req.user.id,
      daysSinceLastMemory,
      emotionalGaps,
      inactivePeople
    );

    res.json({
      success: true,
      data: { nudges },
    });
  } catch (error) {
    logger.error('Nudge generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate nudges',
    });
  }
}));

// Analyze emotional patterns
router.post('/analyze-emotions', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { limit = 100 } = req.body;

  try {
    // Get user's recent memories
    const memories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        limit: parseInt(limit),
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
      error: 'Failed to analyze emotions',
    });
  }
}));

// Generate memory insights
router.post('/insights', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { limit = 50 } = req.body;

  try {
    // Get user's recent memories and people
    const [memories, people] = await Promise.all([
      listRecords<Memory>(
        'memories',
        { userId: req.user.id },
        {
          limit: parseInt(limit),
          orderBy: 'createdAt',
          orderDirection: 'desc',
        }
      ),
      listRecords<Person>(
        'people',
        { userId: req.user.id },
        {
          orderBy: 'name',
          orderDirection: 'asc',
        }
      ),
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
    logger.error('Insights generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
    });
  }
}));

// Get AI-powered recommendations
router.get('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    // Get user's recent data
    const [memories, people] = await Promise.all([
      listRecords<Memory>(
        'memories',
        { userId: req.user.id },
        {
          limit: 20,
          orderBy: 'createdAt',
          orderDirection: 'desc',
        }
      ),
      listRecords<Person>(
        'people',
        { userId: req.user.id },
        {
          orderBy: 'name',
          orderDirection: 'asc',
        }
      ),
    ]);

    const recommendations = [];

    // Generate recommendations based on data
    if (memories.length === 0) {
      recommendations.push({
        type: 'first_memory',
        title: 'Start Your Journey',
        message: 'Log your first memory to begin your personal story',
        priority: 'high',
      });
    } else {
      // Check for emotional gaps
      const emotions = memories.map(m => m.emotions.primary);
      const uniqueEmotions = [...new Set(emotions)];
      
      if (uniqueEmotions.length < 3) {
        recommendations.push({
          type: 'emotional_diversity',
          title: 'Explore Your Emotions',
          message: 'Try reflecting on different emotional experiences',
          priority: 'medium',
        });
      }

      // Check for people diversity
      if (people.length > 0 && memories.length > 0) {
        const peopleInMemories = new Set(memories.flatMap(m => m.people));
        const inactivePeople = people.filter(p => !peopleInMemories.has(p.id));
        
        if (inactivePeople.length > 0) {
          recommendations.push({
            type: 'reconnect',
            title: 'Reconnect with People',
            message: `Consider logging memories about ${inactivePeople[0].name}`,
            priority: 'medium',
            relatedPeople: [inactivePeople[0].id],
          });
        }
      }

      // Check for recent activity
      const lastMemory = memories[0];
      const daysSinceLastMemory = Math.floor(
        (Date.now() - new Date(lastMemory.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastMemory > 7) {
        recommendations.push({
          type: 'log_memory',
          title: 'Capture Today\'s Moments',
          message: 'It\'s been a while since your last memory. How has your day been?',
          priority: 'high',
        });
      }
    }

    res.json({
      success: true,
      data: { recommendations },
    });
  } catch (error) {
    logger.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
    });
  }
}));

// Get AI service status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    res.json({
      success: true,
      data: {
        openai: {
          configured: hasOpenAIKey,
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        },
        services: {
          summarization: hasOpenAIKey,
          semanticSearch: hasOpenAIKey,
          emotionAnalysis: hasOpenAIKey,
          nudgeGeneration: hasOpenAIKey,
        },
      },
    });
  } catch (error) {
    logger.error('AI status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI status',
    });
  }
}));

export default router; 