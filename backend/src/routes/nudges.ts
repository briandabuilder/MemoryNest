import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { createRecord, getRecordById, updateRecord, deleteRecord, listRecords, countRecords } from '../services/database';
import { Nudge } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware
const validateCreateNudge = [
  body('type').isIn(['reconnect', 'log_memory', 'emotional_gap', 'person_reminder']),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('priority').isIn(['low', 'medium', 'high']),
  body('relatedPeople').optional().isArray(),
  body('relatedMemories').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
];

// Create new nudge
router.post('/', validateCreateNudge, asyncHandler(async (req: Request, res: Response) => {
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

  const {
    type,
    title,
    message,
    priority,
    relatedPeople = [],
    relatedMemories = [],
    expiresAt,
  } = req.body;

  try {
    const nudgeData: Partial<Nudge> = {
      id: uuidv4(),
      userId: req.user.id,
      type,
      title,
      message,
      priority,
      relatedPeople,
      relatedMemories,
      isRead: false,
      isActioned: false,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const nudge = await createRecord<Nudge>('nudges', nudgeData);

    logger.info(`Nudge created: ${nudge.id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: nudge,
      message: 'Nudge created successfully',
    });
  } catch (error) {
    logger.error('Nudge creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create nudge',
    });
  }
}));

// Get all nudges for user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { isRead, isActioned, type, priority } = req.query;

  try {
    // Build filters
    const filters: any = { userId: req.user.id };
    
    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }
    
    if (isActioned !== undefined) {
      filters.isActioned = isActioned === 'true';
    }
    
    if (type) {
      filters.type = type;
    }
    
    if (priority) {
      filters.priority = priority;
    }

    const nudges = await listRecords<Nudge>(
      'nudges',
      filters,
      {
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    // Filter out expired nudges
    const now = new Date();
    const activeNudges = nudges.filter(nudge => 
      !nudge.expiresAt || new Date(nudge.expiresAt) > now
    );

    res.json({
      success: true,
      data: activeNudges,
    });
  } catch (error) {
    logger.error('Nudges fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nudges',
    });
  }
}));

// Get nudge by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const nudge = await getRecordById<Nudge>('nudges', id);

    if (!nudge) {
      return res.status(404).json({
        success: false,
        error: 'Nudge not found',
      });
    }

    // Check if user owns this nudge
    if (nudge.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if nudge is expired
    if (nudge.expiresAt && new Date(nudge.expiresAt) <= new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Nudge has expired',
      });
    }

    res.json({
      success: true,
      data: nudge,
    });
  } catch (error) {
    logger.error('Nudge fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nudge',
    });
  }
}));

// Mark nudge as read
router.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const nudge = await getRecordById<Nudge>('nudges', id);

    if (!nudge) {
      return res.status(404).json({
        success: false,
        error: 'Nudge not found',
      });
    }

    if (nudge.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updatedNudge = await updateRecord<Nudge>('nudges', id, {
      isRead: true,
      updatedAt: new Date(),
    });

    logger.info(`Nudge marked as read: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: updatedNudge,
      message: 'Nudge marked as read',
    });
  } catch (error) {
    logger.error('Nudge read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark nudge as read',
    });
  }
}));

// Mark nudge as actioned
router.patch('/:id/action', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const nudge = await getRecordById<Nudge>('nudges', id);

    if (!nudge) {
      return res.status(404).json({
        success: false,
        error: 'Nudge not found',
      });
    }

    if (nudge.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updatedNudge = await updateRecord<Nudge>('nudges', id, {
      isActioned: true,
      updatedAt: new Date(),
    });

    logger.info(`Nudge marked as actioned: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: updatedNudge,
      message: 'Nudge marked as actioned',
    });
  } catch (error) {
    logger.error('Nudge action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark nudge as actioned',
    });
  }
}));

// Delete nudge
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const nudge = await getRecordById<Nudge>('nudges', id);

    if (!nudge) {
      return res.status(404).json({
        success: false,
        error: 'Nudge not found',
      });
    }

    if (nudge.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await deleteRecord('nudges', id);

    logger.info(`Nudge deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Nudge deleted successfully',
    });
  } catch (error) {
    logger.error('Nudge deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete nudge',
    });
  }
}));

// Get nudge statistics
router.get('/stats/overview', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const allNudges = await listRecords<Nudge>('nudges', { userId: req.user.id });
    
    // Filter out expired nudges
    const now = new Date();
    const activeNudges = allNudges.filter(nudge => 
      !nudge.expiresAt || new Date(nudge.expiresAt) > now
    );

    const unreadCount = activeNudges.filter(n => !n.isRead).length;
    const unactionedCount = activeNudges.filter(n => !n.isActioned).length;
    
    const typeCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    
    activeNudges.forEach(nudge => {
      typeCounts[nudge.type] = (typeCounts[nudge.type] || 0) + 1;
      priorityCounts[nudge.priority] = (priorityCounts[nudge.priority] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: activeNudges.length,
        unread: unreadCount,
        unactioned: unactionedCount,
        typeBreakdown: typeCounts,
        priorityBreakdown: priorityCounts,
      },
    });
  } catch (error) {
    logger.error('Nudge stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nudge statistics',
    });
  }
}));

// Mark all nudges as read
router.patch('/mark-all-read', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const unreadNudges = await listRecords<Nudge>(
      'nudges',
      { userId: req.user.id, isRead: false }
    );

    // Update all unread nudges
    const updatePromises = unreadNudges.map(nudge =>
      updateRecord<Nudge>('nudges', nudge.id, {
        isRead: true,
        updatedAt: new Date(),
      })
    );

    await Promise.all(updatePromises);

    logger.info(`All nudges marked as read by user ${req.user.id}`);

    res.json({
      success: true,
      message: `Marked ${unreadNudges.length} nudges as read`,
      data: { count: unreadNudges.length },
    });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all nudges as read',
    });
  }
}));

// Clean up expired nudges
router.delete('/cleanup/expired', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const allNudges = await listRecords<Nudge>('nudges', { userId: req.user.id });
    
    const now = new Date();
    const expiredNudges = allNudges.filter(nudge => 
      nudge.expiresAt && new Date(nudge.expiresAt) <= now
    );

    // Delete expired nudges
    const deletePromises = expiredNudges.map(nudge =>
      deleteRecord('nudges', nudge.id)
    );

    await Promise.all(deletePromises);

    logger.info(`Cleaned up ${expiredNudges.length} expired nudges for user ${req.user.id}`);

    res.json({
      success: true,
      message: `Cleaned up ${expiredNudges.length} expired nudges`,
      data: { count: expiredNudges.length },
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up expired nudges',
    });
  }
}));

export default router; 