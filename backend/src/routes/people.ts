import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { createRecord, getRecordById, updateRecord, deleteRecord, listRecords, countRecords } from '../services/database';
import { Person, CreatePersonRequest, UpdatePersonRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware
const validateCreatePerson = [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('relationship').optional().trim().isLength({ max: 100 }),
  body('avatar').optional().trim().isURL(),
  body('tags').optional().isArray(),
];

const validateUpdatePerson = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('relationship').optional().trim().isLength({ max: 100 }),
  body('avatar').optional().trim().isURL(),
  body('tags').optional().isArray(),
];

// Create new person
router.post('/', validateCreatePerson, asyncHandler(async (req: Request, res: Response) => {
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

  const { name, relationship, avatar, tags = [] }: CreatePersonRequest = req.body;

  try {
    // Check if person already exists for this user
    const existingPeople = await listRecords<Person>('people', { userId: req.user.id });
    const existingPerson = existingPeople.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingPerson) {
      return res.status(409).json({
        success: false,
        error: 'Person already exists',
        data: existingPerson,
      });
    }

    // Create person
    const personData: Partial<Person> = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      relationship,
      avatar,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const person = await createRecord<Person>('people', personData);

    logger.info(`Person created: ${person.id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: person,
      message: 'Person created successfully',
    });
  } catch (error) {
    logger.error('Person creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create person',
    });
  }
}));

// Get all people for user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const people = await listRecords<Person>(
      'people',
      { userId: req.user.id },
      {
        orderBy: 'name',
        orderDirection: 'asc',
      }
    );

    res.json({
      success: true,
      data: people,
    });
  } catch (error) {
    logger.error('People fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch people',
    });
  }
}));

// Get person by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const person = await getRecordById<Person>('people', id);

    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    // Check if user owns this person
    if (person.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: person,
    });
  } catch (error) {
    logger.error('Person fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch person',
    });
  }
}));

// Update person
router.put('/:id', validateUpdatePerson, asyncHandler(async (req: Request, res: Response) => {
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

  const { id } = req.params;
  const updateData: Partial<UpdatePersonRequest> = req.body;

  try {
    // Check if person exists and user owns it
    const existingPerson = await getRecordById<Person>('people', id);
    if (!existingPerson) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    if (existingPerson.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingPerson.name) {
      const existingPeople = await listRecords<Person>('people', { userId: req.user.id });
      const nameConflict = existingPeople.find(p => 
        p.id !== id && p.name.toLowerCase() === updateData.name!.toLowerCase()
      );
      
      if (nameConflict) {
        return res.status(409).json({
          success: false,
          error: 'Person with this name already exists',
        });
      }
    }

    // Update person
    const updatedPerson = await updateRecord<Person>('people', id, {
      ...updateData,
      updatedAt: new Date(),
    });

    logger.info(`Person updated: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: updatedPerson,
      message: 'Person updated successfully',
    });
  } catch (error) {
    logger.error('Person update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update person',
    });
  }
}));

// Delete person
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    // Check if person exists and user owns it
    const person = await getRecordById<Person>('people', id);
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    if (person.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if person is referenced in any memories
    const { countRecords } = await import('../services/database');
    const memoryCount = await countRecords('memories', { 
      userId: req.user.id,
      people: [id]
    });

    if (memoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete person who is referenced in memories',
        data: { memoryCount },
      });
    }

    // Delete person
    await deleteRecord('people', id);

    logger.info(`Person deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Person deleted successfully',
    });
  } catch (error) {
    logger.error('Person deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete person',
    });
  }
}));

// Get person statistics
router.get('/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    // Check if person exists and user owns it
    const person = await getRecordById<Person>('people', id);
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    if (person.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get memories for this person
    const memories = await listRecords('memories', { 
      userId: req.user.id,
      people: [id]
    });

    // Calculate statistics
    const memoryCount = memories.length;
    const averageMood = memoryCount > 0
      ? memories.reduce((sum: number, memory: any) => sum + memory.mood, 0) / memoryCount
      : 0;

    const emotionCounts: Record<string, number> = {};
    memories.forEach((memory: any) => {
      emotionCounts[memory.emotions.primary] = (emotionCounts[memory.emotions.primary] || 0) + 1;
    });

    const mostFrequentEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    const lastInteraction = memoryCount > 0
      ? Math.max(...memories.map((m: any) => new Date(m.createdAt).getTime()))
      : null;

    res.json({
      success: true,
      data: {
        person,
        memoryCount,
        averageMood: Math.round(averageMood * 10) / 10,
        mostFrequentEmotion,
        lastInteraction: lastInteraction ? new Date(lastInteraction) : null,
        emotionBreakdown: emotionCounts,
      },
    });
  } catch (error) {
    logger.error('Person stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch person statistics',
    });
  }
}));

// Search people
router.get('/search/:query', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { query } = req.params;

  try {
    const people = await listRecords<Person>('people', { userId: req.user.id });
    
    // Simple search implementation
    const filteredPeople = people.filter(person =>
      person.name.toLowerCase().includes(query.toLowerCase()) ||
      person.relationship?.toLowerCase().includes(query.toLowerCase()) ||
      person.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    res.json({
      success: true,
      data: filteredPeople,
    });
  } catch (error) {
    logger.error('People search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search people',
    });
  }
}));

export default router; 