import express from 'express';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler';
import { Memory, CreateMemoryRequest, UpdateMemoryRequest, MemoryFilters } from '../types';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Mock data for development
const mockMemories: Memory[] = [
  {
    id: 'memory-1',
    userId: 'user-1',
    title: 'First Day at the Beach',
    content: 'Today was absolutely amazing! I went to the beach for the first time this summer. The water was crystal clear and the waves were perfect for swimming. I spent hours just floating in the ocean, feeling completely at peace. The sun was warm but not too hot, and there was a gentle breeze that kept everything comfortable.',
    summary: 'A perfect beach day with clear water and gentle waves',
    people: ['Sarah', 'Mike'],
    emotions: ['joy', 'peace', 'excitement'],
    tags: ['beach', 'summer', 'swimming', 'nature'],
    mood: 9,
    location: 'Santa Monica Beach',
    weather: 'Sunny, 75°F',
    isPrivate: false,
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15')
  },
  {
    id: 'memory-2',
    userId: 'user-1',
    title: 'Coffee with an Old Friend',
    content: 'Met up with Jessica today after not seeing her for almost a year. We caught up over coffee at our favorite café downtown. It was incredible how we just picked up right where we left off. She told me about her new job and I shared my recent travels. The conversation flowed so naturally, and we ended up talking for three hours!',
    summary: 'Reconnecting with an old friend over coffee after a year apart',
    people: ['Jessica'],
    emotions: ['happiness', 'nostalgia', 'connection'],
    tags: ['friendship', 'coffee', 'reunion', 'conversation'],
    mood: 8,
    location: 'Downtown Café',
    weather: 'Partly cloudy, 68°F',
    isPrivate: false,
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date('2024-06-10')
  },
  {
    id: 'memory-3',
    userId: 'user-2',
    title: 'Hiking Adventure',
    content: 'Went on an incredible hiking trip today! The trail was challenging but the views were absolutely breathtaking. I reached the summit just as the sun was setting, and the colors were indescribable. Orange, pink, and purple painted the sky. I felt so accomplished and connected to nature.',
    summary: 'Challenging hike with breathtaking sunset views from the summit',
    people: ['Alex', 'David'],
    emotions: ['accomplishment', 'awe', 'connection'],
    tags: ['hiking', 'nature', 'sunset', 'adventure'],
    mood: 9,
    location: 'Mount Wilson Trail',
    weather: 'Clear, 72°F',
    isPrivate: false,
    createdAt: new Date('2024-06-12'),
    updatedAt: new Date('2024-06-12')
  }
];

// Create new memory
router.post('/', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
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

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  
  // Process files (simplified for demo)
  let audioUrl: string | undefined;
  let imageUrl: string | undefined;
  
  if (files && files.audioFile) {
    audioUrl = `/uploads/audio/${uuidv4()}.mp3`;
  }
  
  if (files && files.imageFile) {
    imageUrl = `/uploads/images/${uuidv4()}.jpg`;
  }

  // Create memory record
  const memoryData: Partial<Memory> = {
    id: uuidv4(),
    userId: req.user.id,
    title,
    content,
    summary: `Summary of: ${title}`,
    people,
    emotions: ['joy', 'contentment'],
    tags: [...tags, 'new-memory'],
    mood: 7,
    isPrivate,
    embedding: [0.1, 0.2, 0.3], // Mock embedding
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add optional properties only if they have values
  if (location) memoryData.location = location;
  if (weather) memoryData.weather = weather;
  if (audioUrl) memoryData.audioUrl = audioUrl;
  if (imageUrl) memoryData.imageUrl = imageUrl;

  const newMemory = memoryData as Memory;
  mockMemories.push(newMemory);

  return res.json({
    success: true,
    data: newMemory,
    message: 'Memory created successfully',
  });
}));

// Get all memories for user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { page = 1, limit = 10, search, tags, people } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    // Filter memories by user
    let filteredMemories = mockMemories.filter(memory => memory.userId === req.user!.id);

    // Apply search filter
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredMemories = filteredMemories.filter(memory =>
        memory.title.toLowerCase().includes(searchTerm) ||
        memory.content.toLowerCase().includes(searchTerm)
      );
    }

    // Apply tag filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filteredMemories = filteredMemories.filter(memory =>
        memory.tags?.some(tag => tagArray.includes(tag))
      );
    }

    // Apply people filter
    if (people) {
      const peopleArray = Array.isArray(people) ? people : [people];
      filteredMemories = filteredMemories.filter(memory =>
        memory.people?.some(person => peopleArray.includes(person))
      );
    }

    // Sort by creation date (newest first)
    filteredMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedMemories = filteredMemories.slice(offset, offset + limitNum);

    const response = {
      memories: paginatedMemories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredMemories.length,
        pages: Math.ceil(filteredMemories.length / limitNum),
      },
    };

    return res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch memories',
    });
  }
}));

// Get recent memories
router.get('/recent', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { limit = 5 } = req.query;
  const limitNum = parseInt(limit as string);

  try {
    // Filter memories by user and sort by creation date (newest first)
    const userMemories = mockMemories
      .filter(memory => memory.userId === req.user!.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitNum);

    return res.json({
      success: true,
      data: userMemories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent memories',
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
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Memory ID is required',
    });
  }

  try {
    const memory = mockMemories.find(m => m.id === id);

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

    return res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch memory',
    });
  }
}));

// Update memory
router.put('/:id', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;
  const updateData: Partial<UpdateMemoryRequest> = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Memory ID is required',
    });
  }

  try {
    const memoryIndex = mockMemories.findIndex(m => m.id === id);

    if (memoryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    const memory = mockMemories[memoryIndex];

    // Check if user owns this memory
    if (memory && memory.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Process files
    let audioUrl: string | undefined;
    let imageUrl: string | undefined;
    
    if (files && files.audioFile) {
      audioUrl = `/uploads/audio/${uuidv4()}.mp3`;
    }
    
    if (files && files.imageFile) {
      imageUrl = `/uploads/images/${uuidv4()}.jpg`;
    }

    // Update memory
    const updateDataToSave: Partial<Memory> = {
      updatedAt: new Date(),
    };

    // Add update data properties
    if (updateData.title) updateDataToSave.title = updateData.title;
    if (updateData.content) updateDataToSave.content = updateData.content;
    if (updateData.people) updateDataToSave.people = updateData.people;
    if (updateData.tags) updateDataToSave.tags = updateData.tags;
    if (updateData.location) updateDataToSave.location = updateData.location;
    if (updateData.weather) updateDataToSave.weather = updateData.weather;
    if (updateData.isPrivate !== undefined) updateDataToSave.isPrivate = updateData.isPrivate;
    if (audioUrl) updateDataToSave.audioUrl = audioUrl;
    if (imageUrl) updateDataToSave.imageUrl = imageUrl;

    // Apply updates - ensure the memory exists before updating
    if (mockMemories[memoryIndex]) {
      Object.assign(mockMemories[memoryIndex], updateDataToSave);
    }

    const updatedMemory = mockMemories[memoryIndex];

    return res.json({
      success: true,
      data: updatedMemory,
      message: 'Memory updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
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

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Memory ID is required',
    });
  }

  try {
    const memoryIndex = mockMemories.findIndex(m => m.id === id);

    if (memoryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    const memory = mockMemories[memoryIndex];

    // Check if user owns this memory
    if (memory && memory.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Remove memory
    mockMemories.splice(memoryIndex, 1);

    return res.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
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
    const userMemories = mockMemories.filter(memory => memory.userId === req.user!.id);
    
    const totalMemories = userMemories.length;
    const averageMood = userMemories.length > 0 
      ? userMemories.reduce((sum, memory) => sum + (memory.mood || 0), 0) / userMemories.length 
      : 0;
    
    // Get most frequent emotion
    const emotionCounts: { [key: string]: number } = {};
    userMemories.forEach(memory => {
      memory.emotions?.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });
    
    const mostFrequentEmotion = Object.keys(emotionCounts).length > 0
      ? Object.keys(emotionCounts).reduce((a, b) => {
          const countA = emotionCounts[a] || 0;
          const countB = emotionCounts[b] || 0;
          return countA > countB ? a : b;
        })
      : 'No emotions recorded';

    // Get recent memories (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMemories = userMemories.filter(memory => 
      new Date(memory.createdAt) > sevenDaysAgo
    );

    return res.json({
      success: true,
      data: {
        totalMemories,
        averageMood: Math.round(averageMood * 10) / 10,
        mostFrequentEmotion,
        recentMemories: recentMemories.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch memory statistics',
    });
  }
}));

export default router; 