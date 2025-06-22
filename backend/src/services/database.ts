import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Database client instance
let supabase: SupabaseClient;

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    logger.info('Supabase database connected successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

// Get database client
export const getDatabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Database not initialized');
  }
  return supabase;
};

// Helper function to handle database errors
export const handleDatabaseError = (error: any, operation: string): never => {
  logger.error(`Database error in ${operation}:`, error);
  
  if (error.code === '23505') { // Unique violation
    throw new Error('Resource already exists');
  }
  
  if (error.code === '23503') { // Foreign key violation
    throw new Error('Referenced resource does not exist');
  }
  
  if (error.code === '42P01') { // Undefined table
    throw new Error('Database table not found');
  }
  
  throw new Error(`Database operation failed: ${error.message}`);
};

// Generic CRUD operations
export const createRecord = async <T>(
  table: string,
  data: Partial<T>
): Promise<T> => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, `create ${table}`);
    }

    return result as T;
  } catch (error) {
    return handleDatabaseError(error, `create ${table}`);
  }
};

export const getRecordById = async <T>(
  table: string,
  id: string
): Promise<T | null> => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      return handleDatabaseError(error, `get ${table} by id`);
    }

    return data as T;
  } catch (error) {
    return handleDatabaseError(error, `get ${table} by id`);
  }
};

export const updateRecord = async <T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T> => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, `update ${table}`);
    }

    return result as T;
  } catch (error) {
    return handleDatabaseError(error, `update ${table}`);
  }
};

export const deleteRecord = async (
  table: string,
  id: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      return handleDatabaseError(error, `delete ${table}`);
    }
  } catch (error) {
    return handleDatabaseError(error, `delete ${table}`);
  }
};

export const listRecords = async <T>(
  table: string,
  filters?: Record<string, any>,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }
): Promise<T[]> => {
  try {
    let query = supabase.from(table).select('*');

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.orderDirection !== 'desc',
      });
    }

    const { data, error } = await query;

    if (error) {
      return handleDatabaseError(error, `list ${table}`);
    }

    return data as T[];
  } catch (error) {
    return handleDatabaseError(error, `list ${table}`);
  }
};

// Count records
export const countRecords = async (
  table: string,
  filters?: Record<string, any>
): Promise<number> => {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      return handleDatabaseError(error, `count ${table}`);
    }

    return count || 0;
  } catch (error) {
    return handleDatabaseError(error, `count ${table}`);
  }
};

// Search records with full-text search
export const searchRecords = async <T>(
  table: string,
  searchTerm: string,
  searchColumns: string[],
  filters?: Record<string, any>,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<T[]> => {
  try {
    let query = supabase
      .from(table)
      .select('*')
      .or(searchColumns.map(col => `${col}.ilike.%${searchTerm}%`).join(','));

    // Apply additional filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return handleDatabaseError(error, `search ${table}`);
    }

    return data as T[];
  } catch (error) {
    return handleDatabaseError(error, `search ${table}`);
  }
};

// Transaction helper (if needed for complex operations)
export const withTransaction = async <T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> => {
  // Note: Supabase doesn't support traditional transactions in the same way
  // This is a placeholder for future implementation
  return callback(supabase);
};

export default {
  initializeDatabase,
  getDatabase,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
  listRecords,
  countRecords,
  searchRecords,
  withTransaction,
}; 