// User types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Memory types
export interface Memory {
  id: string;
  userId?: string;
  user_id?: string;
  content: string;
  summary: string;
  mood: string | number;
  emotions: string[];
  people?: string[];
  people_mentioned?: string[];
  location?: string;
  weather?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  embedding_id?: string;
  embedding?: number[];
  isPrivate?: boolean;
}

export interface CreateMemoryRequest {
  content: string;
  people_mentioned?: string[];
  location?: string;
  weather?: string;
  tags?: string[];
}

export interface UpdateMemoryRequest {
  content?: string;
  summary?: string;
  mood?: string;
  emotions?: string[];
  people_mentioned?: string[];
  location?: string;
  weather?: string;
  tags?: string[];
}

// Person types
export interface Person {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  avatar_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonRequest {
  name: string;
  relationship: string;
  avatar_url?: string;
  notes?: string;
}

export interface UpdatePersonRequest {
  name?: string;
  relationship?: string;
  avatar_url?: string;
  notes?: string;
}

// Nudge types
export interface Nudge {
  id: string;
  user_id: string;
  type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone';
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface CreateNudgeRequest {
  type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone';
  title: string;
  message: string;
  action_url?: string;
  expires_at?: string;
}

// AI Service types
export interface SummarizeRequest {
  content: string;
}

export interface SummarizeResponse {
  summary: string;
  mood: string;
  emotions: string[];
  people_mentioned: string[];
}

export interface QueryRequest {
  query: string;
  filters?: {
    people?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    mood?: string;
    emotions?: string[];
  };
  limit?: number;
}

export interface QueryResponse {
  memories: Memory[];
  relevance_scores: number[];
  total_count: number;
}

export interface GenerateNudgeRequest {
  user_id: string;
  type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone';
}

export interface GenerateNudgeResponse {
  nudge: Nudge;
}

// Dashboard types
export interface DashboardStats {
  total_memories: number;
  total_people: number;
  memories_this_week: number;
  average_mood: string;
  top_emotions: Array<{
    emotion: string;
    count: number;
  }>;
  recent_activity: Array<{
    type: 'memory' | 'person' | 'nudge';
    title: string;
    timestamp: string;
  }>;
}

export interface MemoryAnalytics {
  daily_counts: Array<{
    date: string;
    count: number;
  }>;
  mood_distribution: Array<{
    mood: string;
    count: number;
  }>;
  people_frequency: Array<{
    person_id: string;
    person_name: string;
    count: number;
  }>;
  emotion_trends: Array<{
    emotion: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentage_change: number;
  }>;
}

// Voice transcription types
export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
}

// API Response types
export interface ApiResponse<T> {
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
    total_pages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ModalState {
  isOpen: boolean;
  type: 'memory' | 'person' | 'nudge' | 'confirm' | null;
  data?: any;
}

// Navigation types
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
} 