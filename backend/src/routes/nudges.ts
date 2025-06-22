import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Nudge } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Mock data for development
const mockNudges: Nudge[] = [
  {
    id: 'nudge-1',
    userId: 'user-1',
    title: 'Remember to call mom',
    content: 'Call mom to check in and see how she\'s doing',
    type: 'reminder',
    scheduledFor: new Date('2024-01-15T10:00:00Z'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'nudge-2',
    userId: 'user-1',
    title: 'Review project notes',
    content: 'Go through the project notes from yesterday\'s meeting',
    type: 'reminder',
    scheduledFor: new Date('2024-01-16T14:00:00Z'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'nudge-3',
    userId: 'user-2',
    title: 'Weekly reflection',
    content: 'Take time to reflect on this week\'s achievements and challenges',
    type: 'reflection',
    scheduledFor: new Date('2024-01-20T18:00:00Z'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Get all nudges for the authenticated user
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const userNudges = mockNudges.filter(nudge => nudge.userId === req.user!.id);

  res.json({
    success: true,
    data: userNudges,
  });
}));

// Get a specific nudge by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'Nudge ID is required',
    });
    return;
  }

  const nudge = mockNudges.find(n => n.id === id);

  if (!nudge) {
    res.status(404).json({
      success: false,
      error: 'Nudge not found',
    });
    return;
  }

  if (nudge.userId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  res.json({
    success: true,
    data: nudge,
  });
}));

// Create a new nudge
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { title, content, type, scheduledFor, isActive = true } = req.body;

  if (!title || !content || !type) {
    res.status(400).json({
      success: false,
      error: 'Title, content, and type are required',
    });
    return;
  }

  if (!['reminder', 'memory', 'reflection'].includes(type)) {
    res.status(400).json({
      success: false,
      error: 'Type must be reminder, memory, or reflection',
    });
    return;
  }

  const newNudge: Nudge = {
    id: uuidv4(),
    userId: req.user.id,
    title,
    content,
    type,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockNudges.push(newNudge);

  res.status(201).json({
    success: true,
    data: newNudge,
  });
}));

// Update a nudge
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { id } = req.params;
  const { title, content, type, scheduledFor, isActive } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'Nudge ID is required',
    });
    return;
  }

  const nudgeIndex = mockNudges.findIndex(n => n.id === id);

  if (nudgeIndex === -1) {
    res.status(404).json({
      success: false,
      error: 'Nudge not found',
    });
    return;
  }

  const nudge = mockNudges[nudgeIndex];

  if (!nudge) {
    res.status(404).json({
      success: false,
      error: 'Nudge not found',
    });
    return;
  }

  if (nudge.userId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  // Update nudge properties
  if (title) nudge.title = title;
  if (content) nudge.content = content;
  if (type) {
    if (!['reminder', 'memory', 'reflection'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Type must be reminder, memory, or reflection',
      });
      return;
    }
    nudge.type = type;
  }
  if (scheduledFor) nudge.scheduledFor = new Date(scheduledFor);
  if (isActive !== undefined) nudge.isActive = isActive;
  nudge.updatedAt = new Date();

  res.json({
    success: true,
    data: nudge,
  });
}));

// Delete a nudge
router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'Nudge ID is required',
    });
    return;
  }

  const nudgeIndex = mockNudges.findIndex(n => n.id === id);

  if (nudgeIndex === -1) {
    res.status(404).json({
      success: false,
      error: 'Nudge not found',
    });
    return;
  }

  const nudge = mockNudges[nudgeIndex];

  if (!nudge) {
    res.status(404).json({
      success: false,
      error: 'Nudge not found',
    });
    return;
  }

  if (nudge.userId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  mockNudges.splice(nudgeIndex, 1);

  res.json({
    success: true,
    message: 'Nudge deleted successfully',
  });
}));

export default router; 