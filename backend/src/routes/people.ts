import express from 'express';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { Person } from '../types';

const router = express.Router();

// Mock data for development
const mockPeople: Person[] = [
  {
    id: 'person-1',
    userId: 'user-1',
    name: 'Sarah Johnson',
    relationship: 'Best Friend',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    notes: 'We met in college and have been inseparable ever since. She loves hiking and photography.',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'person-2',
    userId: 'user-1',
    name: 'Mike Chen',
    relationship: 'Roommate',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    notes: 'Great roommate, always keeps the place clean. Loves cooking and watching movies.',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 'person-3',
    userId: 'user-2',
    name: 'Alex Rodriguez',
    relationship: 'Work Colleague',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    notes: 'We work together on the marketing team. Very creative and always has great ideas.',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

// Get all people for user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const userPeople = mockPeople.filter(person => person.userId === req.user!.id);
    
    return res.json({
      success: true,
      data: userPeople,
    });
  } catch (error) {
    return res.status(500).json({
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
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Person ID is required',
    });
  }

  try {
    const person = mockPeople.find(p => p.id === id);

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

    return res.json({
      success: true,
      data: person,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch person',
    });
  }
}));

// Create new person
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { name, relationship, avatar, notes } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required',
    });
  }

  try {
    const newPerson: Person = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      relationship,
      avatar,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPeople.push(newPerson);

    return res.json({
      success: true,
      data: newPerson,
      message: 'Person created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create person',
    });
  }
}));

// Update person
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const { id } = req.params;
  const { name, relationship, avatar, notes } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Person ID is required',
    });
  }

  try {
    const personIndex = mockPeople.findIndex(p => p.id === id);

    if (personIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    const person = mockPeople[personIndex];

    if (person && person.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Update person - ensure person exists before updating
    if (person) {
      if (name) person.name = name;
      if (relationship !== undefined) person.relationship = relationship;
      if (avatar !== undefined) person.avatar = avatar;
      if (notes !== undefined) person.notes = notes;
      person.updatedAt = new Date();
    }

    return res.json({
      success: true,
      data: person,
      message: 'Person updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
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

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Person ID is required',
    });
  }

  try {
    const personIndex = mockPeople.findIndex(p => p.id === id);

    if (personIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
      });
    }

    const person = mockPeople[personIndex];

    if (person && person.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Remove person
    mockPeople.splice(personIndex, 1);

    return res.json({
      success: true,
      message: 'Person deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete person',
    });
  }
}));

export default router; 