import apiService from './api';
import { 
  Memory, 
  CreateMemoryRequest, 
  UpdateMemoryRequest, 
  QueryRequest, 
  QueryResponse,
  SummarizeRequest,
  SummarizeResponse,
  PaginatedResponse,
  ApiResponse,
  Person,
  CreatePersonRequest,
  UpdatePersonRequest,
  Nudge,
  CreateNudgeRequest,
  DashboardStats
} from '../types';

class MemoryService {
  async createMemory(data: CreateMemoryRequest): Promise<Memory> {
    const response = await apiService.post<ApiResponse<Memory>>('/memories', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create memory');
    }
    
    return response.data;
  }

  async getMemories(params?: {
    page?: number;
    limit?: number;
    person_id?: string;
    mood?: string;
    emotions?: string[];
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<PaginatedResponse<Memory>> {
    const response = await apiService.get<ApiResponse<PaginatedResponse<Memory>>>('/memories', params);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch memories');
    }
    
    return response.data;
  }

  async getMemory(id: string): Promise<Memory> {
    const response = await apiService.get<ApiResponse<Memory>>(`/memories/${id}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch memory');
    }
    
    return response.data;
  }

  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<Memory> {
    const response = await apiService.put<ApiResponse<Memory>>(`/memories/${id}`, data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update memory');
    }
    
    return response.data;
  }

  async deleteMemory(id: string): Promise<void> {
    const response = await apiService.delete<ApiResponse<void>>(`/memories/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete memory');
    }
  }

  async searchMemories(query: string, filters?: {
    people?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    mood?: string;
    emotions?: string[];
  }): Promise<QueryResponse> {
    const request: QueryRequest = { query, filters };
    const response = await apiService.post<ApiResponse<QueryResponse>>('/ai/query', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to search memories');
    }
    
    return response.data;
  }

  async summarizeMemory(content: string): Promise<SummarizeResponse> {
    const request: SummarizeRequest = { content };
    const response = await apiService.post<ApiResponse<SummarizeResponse>>('/ai/summarize', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to summarize memory');
    }
    
    return response.data;
  }

  async getMemoriesByPerson(personId: string, params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<Memory>> {
    const response = await apiService.get<ApiResponse<PaginatedResponse<Memory>>>(
      `/memories/person/${personId}`, 
      params
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch memories by person');
    }
    
    return response.data;
  }

  async getMemoriesByMood(mood: string, params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<Memory>> {
    const response = await apiService.get<ApiResponse<PaginatedResponse<Memory>>>(
      `/memories/mood/${mood}`, 
      params
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch memories by mood');
    }
    
    return response.data;
  }

  async getRecentMemories(limit: number = 10): Promise<Memory[]> {
    const response = await apiService.get<ApiResponse<Memory[]>>('/memories/recent', { limit });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch recent memories');
    }
    
    return response.data;
  }

  async getMemoryStats(): Promise<{
    total: number;
    this_week: number;
    this_month: number;
    mood_distribution: Array<{ mood: string; count: number }>;
    top_emotions: Array<{ emotion: string; count: number }>;
  }> {
    const response = await apiService.get<ApiResponse<any>>('/memories/stats');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch memory stats');
    }
    
    return response.data;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch dashboard stats');
    }
    
    return response.data;
  }

  async getPeople(): Promise<Person[]> {
    const response = await apiService.get<ApiResponse<Person[]>>('/people');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch people');
    }
    
    return response.data;
  }

  async createPerson(data: CreatePersonRequest): Promise<Person> {
    const response = await apiService.post<ApiResponse<Person>>('/people', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create person');
    }
    
    return response.data;
  }

  async updatePerson(id: string, data: UpdatePersonRequest): Promise<Person> {
    const response = await apiService.put<ApiResponse<Person>>(`/people/${id}`, data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update person');
    }
    
    return response.data;
  }

  async deletePerson(id: string): Promise<void> {
    const response = await apiService.delete<ApiResponse<void>>(`/people/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete person');
    }
  }

  async getNudges(): Promise<Nudge[]> {
    const response = await apiService.get<ApiResponse<Nudge[]>>('/nudges');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch nudges');
    }
    
    return response.data;
  }

  async createNudge(data: CreateNudgeRequest): Promise<Nudge> {
    const response = await apiService.post<ApiResponse<Nudge>>('/nudges', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create nudge');
    }
    
    return response.data;
  }

  async markNudgeAsRead(nudgeId: string): Promise<void> {
    const response = await apiService.patch<ApiResponse<void>>(`/nudges/${nudgeId}/read`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to mark nudge as read');
    }
  }

  async generateNudge(type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone'): Promise<Nudge> {
    const response = await apiService.post<ApiResponse<Nudge>>('/ai/nudges', { type });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to generate nudge');
    }
    
    return response.data;
  }

  async exportMemories(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await apiService.get(`/memories/export`, { format }, {
      responseType: 'blob',
    });
    
    return response;
  }

  async importMemories(file: File): Promise<{ imported: number; errors: string[] }> {
    const response = await apiService.upload<ApiResponse<{ imported: number; errors: string[] }>>(
      '/memories/import',
      file
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to import memories');
    }
    
    return response.data;
  }

  async getMemorySuggestions(query: string): Promise<string[]> {
    const response = await apiService.get<ApiResponse<string[]>>('/ai/suggestions', { query });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get suggestions');
    }
    
    return response.data;
  }

  async analyzeMemorySentiment(memoryId: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: Array<{ emotion: string; score: number }>;
  }> {
    const response = await apiService.get<ApiResponse<any>>(`/memories/${memoryId}/sentiment`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to analyze sentiment');
    }
    
    return response.data;
  }
}

export const memoryService = new MemoryService();
export default memoryService; 