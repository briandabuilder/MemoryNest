// Core Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  relationship?: string;
  avatar?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Emotion {
  primary: string;
  secondary?: string[];
  intensity: number; // 1-10 scale
  valence: 'positive' | 'negative' | 'neutral';
}

export interface Memory {
  id: string;
  userId: string;
  title: string;
  content: string;
  summary: string;
  people: string[]; // Person IDs
  emotions: Emotion;
  tags: string[];
  location?: string;
  weather?: string;
  mood: number; // 1-10 scale
  isPrivate: boolean;
  audioUrl?: string;
  imageUrl?: string;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryWithPeople extends Omit<Memory, 'people'> {
  people: Person[];
}

export interface Nudge {
  id: string;
  userId: string;
  type: 'reconnect' | 'log_memory' | 'emotional_gap' | 'person_reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  relatedPeople?: string[];
  relatedMemories?: string[];
  isRead: boolean;
  isActioned: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// AI Processing Types
export interface AISummaryRequest {
  content: string;
  people?: string[];
}

export interface AISummaryResponse {
  summary: string;
  emotions: Emotion;
  tags: string[];
  people: string[];
  mood: number;
}

export interface AIQueryRequest {
  query: string;
  userId: string;
  filters?: {
    people?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    emotions?: string[];
    tags?: string[];
  };
  limit?: number;
}

export interface AIQueryResponse {
  memories: MemoryWithPeople[];
  query: string;
  explanation: string;
  confidence: number;
}

export interface NudgeGenerationRequest {
  userId: string;
  daysSinceLastMemory?: number;
  emotionalGaps?: string[];
  inactivePeople?: string[];
}

export interface NudgeGenerationResponse {
  nudges: Omit<Nudge, 'id' | 'userId' | 'createdAt'>[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request Types
export interface CreateMemoryRequest {
  title: string;
  content: string;
  people?: string[];
  tags?: string[];
  location?: string;
  weather?: string;
  isPrivate?: boolean;
  audioFile?: Express.Multer.File;
  imageFile?: Express.Multer.File;
}

export interface UpdateMemoryRequest extends Partial<CreateMemoryRequest> {
  id: string;
}

export interface CreatePersonRequest {
  name: string;
  relationship?: string;
  avatar?: string;
  tags?: string[];
}

export interface UpdatePersonRequest extends Partial<CreatePersonRequest> {
  id: string;
}

export interface MemoryFilters {
  people?: string[];
  emotions?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  mood?: {
    min: number;
    max: number;
  };
  isPrivate?: boolean;
  search?: string;
}

// Vector Search Types
export interface VectorSearchRequest {
  query: string;
  userId: string;
  limit?: number;
  threshold?: number;
}

export interface VectorSearchResult {
  memoryId: string;
  similarity: number;
  content: string;
  summary: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Dashboard Types
export interface DashboardStats {
  totalMemories: number;
  totalPeople: number;
  averageMood: number;
  mostFrequentEmotion: string;
  memoriesThisWeek: number;
  peopleThisWeek: number;
}

export interface MemoryTimeline {
  date: string;
  memories: MemoryWithPeople[];
  averageMood: number;
}

export interface PersonInsights {
  person: Person;
  memoryCount: number;
  averageMood: number;
  mostFrequentEmotion: string;
  lastInteraction: Date;
  relationshipStrength: number; // 1-10 scale
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Utility Types
export type MemorySortBy = 'createdAt' | 'updatedAt' | 'mood' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  sortBy: MemorySortBy;
  sortOrder: SortOrder;
}

export interface PaginationOptions {
  page: number;
  limit: number;
} 