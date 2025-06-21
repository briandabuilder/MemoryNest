import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult, query } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { createRecord, getRecordById, updateRecord, deleteRecord, listRecords, countRecords, searchRecords } from '../services/database';
import { addMemoryEmbedding, updateMemoryEmbedding, deleteMemoryEmbedding } from '../services/vectorStore';
import { summarizeMemory, generateEmbedding, transcribeAudio } from '../services/aiService';
import { Memory, CreateMemoryRequest, UpdateMemoryRequest, MemoryFilters, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and image files are allowed.'));
    }
  },
});

// Validation middleware
const validateCreateMemory = [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('content').trim().isLength({ min: 1, max: 10000 }),
  body('people').optional().isArray(),
  body('tags').optional().isArray(),
  body('location').optional().trim().isLength({ max: 200 }),
  body('weather').optional().trim().isLength({ max: 100 }),
  body('isPrivate').optional().isBoolean(),
];

const validateUpdateMemory = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('content').optional().trim().isLength({ min: 1, max: 10000 }),
  body('people').optional().isArray(),
  body('tags').optional().isArray(),
  body('location').optional().trim().isLength({ max: 200 }),
  body('weather').optional().trim().isLength({ max: 100 }),
  body('isPrivate').optional().isBoolean(),
];

// Create new memory
router.post('/', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]), validateCreateMemory, asyncHandler(async (req: Request, res: Response) => {
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
    title,
    content,
    people = [],
    tags = [],
    location,
    weather,
    isPrivate = false,
  }: CreateMemoryRequest = req.body;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const audioFile = files?.audioFile?.[0];
  const imageFile = files?.imageFile?.[0];

  try {
    let processedContent = content;
    let audioUrl: string | undefined;

    // Process audio file if provided
    if (audioFile) {
      const transcription = await transcribeAudio(audioFile.buffer);
      processedContent = `${content}\n\nVoice transcription: ${transcription}`;
      audioUrl = `/uploads/audio/${uuidv4()}-${audioFile.originalname}`;
      // TODO: Save audio file to storage
    }

    // Process image file if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = `/uploads/images/${uuidv4()}-${imageFile.originalname}`;
      // TODO: Save image file to storage
    }

    // Generate AI summary and extract emotions
    const aiSummary = await summarizeMemory({
      content: processedContent,
      people,
    });

    // Generate embedding for semantic search
    const embedding = await generateEmbedding(processedContent);

    // Create memory record
    const memoryData: Partial<Memory> = {
      id: uuidv4(),
      userId: req.user.id,
      title,
      content: processedContent,
      summary: aiSummary.summary,
      people,
      emotions: aiSummary.emotions,
      tags: [...tags, ...aiSummary.tags],
      location,
      weather,
      mood: aiSummary.mood,
      isPrivate,
      audioUrl,
      imageUrl,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const memory = await createRecord<Memory>('memories', memoryData);

    // Add to vector store
    await addMemoryEmbedding(
      memory.id,
      req.user.id,
      processedContent,
      aiSummary.summary,
      embedding,
      {
        title,
        people: people.join(','),
        tags: tags.join(','),
        mood: aiSummary.mood,
      }
    );

    logger.info(`Memory created: ${memory.id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: memory,
      message: 'Memory created successfully',
    });
  } catch (error) {
    logger.error('Memory creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create memory',
    });
  }
}));

// Get all memories with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'mood', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('people').optional().isArray(),
  query('tags').optional().isArray(),
  query('emotions').optional().isArray(),
  query('search').optional().trim(),
  query('isPrivate').optional().isBoolean(),
], asyncHandler(async (req: Request, res: Response) => {
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
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    people,
    tags,
    emotions,
    search,
    isPrivate,
  } = req.query;

  try {
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build filters
    const filters: MemoryFilters = {
      userId: req.user.id,
    };

    if (isPrivate !== undefined) {
      filters.isPrivate = isPrivate === 'true';
    }

    let memories: Memory[];

    // Use search if provided, otherwise use regular listing
    if (search) {
      memories = await searchRecords<Memory>(
        'memories',
        search as string,
        ['title', 'content', 'summary'],
        filters,
        {
          limit: parseInt(limit as string),
          offset,
        }
      );
    } else {
      memories = await listRecords<Memory>(
        'memories',
        filters,
        {
          limit: parseInt(limit as string),
          offset,
          orderBy: sortBy as string,
          orderDirection: sortOrder as 'asc' | 'desc',
        }
      );
    }

    // Apply additional filters in memory
    if (people && Array.isArray(people)) {
      memories = memories.filter(memory => 
        people.some(person => memory.people.includes(person as string))
      );
    }

    if (tags && Array.isArray(tags)) {
      memories = memories.filter(memory => 
        tags.some(tag => memory.tags.includes(tag as string))
      );
    }

    if (emotions && Array.isArray(emotions)) {
      memories = memories.filter(memory => 
        emotions.some(emotion => 
          memory.emotions.primary === emotion || 
          memory.emotions.secondary?.includes(emotion as string)
        )
      );
    }

    // Get total count for pagination
    const total = await countRecords('memories', { userId: req.user.id });
    const totalPages = Math.ceil(total / parseInt(limit as string));

    const response: PaginatedResponse<Memory> = {
      data: memories,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages,
      },
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Memory fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memories',
    });
  }
}));

// Get memory by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    const memory = await getRecordById<Memory>('memories', id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    // Check if user owns this memory
    if (memory.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    logger.error('Memory fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory',
    });
  }
}));

// Update memory
router.put('/:id', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]), validateUpdateMemory, asyncHandler(async (req: Request, res: Response) => {
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
  const updateData: Partial<UpdateMemoryRequest> = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    // Check if memory exists and user owns it
    const existingMemory = await getRecordById<Memory>('memories', id);
    if (!existingMemory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    if (existingMemory.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Process new files if provided
    let processedContent = updateData.content || existingMemory.content;
    let audioUrl = existingMemory.audioUrl;
    let imageUrl = existingMemory.imageUrl;

    if (files?.audioFile?.[0]) {
      const transcription = await transcribeAudio(files.audioFile[0].buffer);
      processedContent = `${updateData.content || existingMemory.content}\n\nVoice transcription: ${transcription}`;
      audioUrl = `/uploads/audio/${uuidv4()}-${files.audioFile[0].originalname}`;
    }

    if (files?.imageFile?.[0]) {
      imageUrl = `/uploads/images/${uuidv4()}-${files.imageFile[0].originalname}`;
    }

    // Regenerate AI summary if content changed
    let summary = existingMemory.summary;
    let emotions = existingMemory.emotions;
    let tags = updateData.tags || existingMemory.tags;
    let mood = existingMemory.mood;
    let embedding = existingMemory.embedding;

    if (updateData.content || files?.audioFile?.[0]) {
      const aiSummary = await summarizeMemory({
        content: processedContent,
        people: updateData.people || existingMemory.people,
      });

      summary = aiSummary.summary;
      emotions = aiSummary.emotions;
      tags = [...(updateData.tags || existingMemory.tags), ...aiSummary.tags];
      mood = aiSummary.mood;
      embedding = await generateEmbedding(processedContent);
    }

    // Update memory
    const updatedMemory = await updateRecord<Memory>('memories', id, {
      ...updateData,
      content: processedContent,
      summary,
      emotions,
      tags,
      mood,
      audioUrl,
      imageUrl,
      embedding,
      updatedAt: new Date(),
    });

    // Update vector store
    await updateMemoryEmbedding(
      id,
      processedContent,
      summary,
      embedding || [],
      {
        title: updateData.title || existingMemory.title,
        people: (updateData.people || existingMemory.people).join(','),
        tags: tags.join(','),
        mood,
      }
    );

    logger.info(`Memory updated: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: updatedMemory,
      message: 'Memory updated successfully',
    });
  } catch (error) {
    logger.error('Memory update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory',
    });
  }
}));

// Delete memory
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  try {
    // Check if memory exists and user owns it
    const memory = await getRecordById<Memory>('memories', id);
    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    if (memory.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Delete from database
    await deleteRecord('memories', id);

    // Delete from vector store
    await deleteMemoryEmbedding(id);

    logger.info(`Memory deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    logger.error('Memory deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory',
    });
  }
}));

// Get memory statistics
router.get('/stats/overview', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const totalMemories = await countRecords('memories', { userId: req.user.id });
    
    // Get recent memories for mood calculation
    const recentMemories = await listRecords<Memory>(
      'memories',
      { userId: req.user.id },
      {
        limit: 50,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }
    );

    const averageMood = recentMemories.length > 0
      ? recentMemories.reduce((sum, memory) => sum + memory.mood, 0) / recentMemories.length
      : 0;

    const emotionCounts: Record<string, number> = {};
    recentMemories.forEach(memory => {
      emotionCounts[memory.emotions.primary] = (emotionCounts[memory.emotions.primary] || 0) + 1;
    });

    const mostFrequentEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    res.json({
      success: true,
      data: {
        totalMemories,
        averageMood: Math.round(averageMood * 10) / 10,
        mostFrequentEmotion,
        recentMemories: recentMemories.length,
      },
    });
  } catch (error) {
    logger.error('Memory stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory statistics',
    });
  }
}));

export default router; 