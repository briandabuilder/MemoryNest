import { ChromaClient, Collection } from 'chromadb';
import { logger } from '../utils/logger';

// ChromaDB client instance
let chromaClient: ChromaClient;
let memoryCollection: Collection;

// Initialize ChromaDB connection
export const initializeChromaDB = async (): Promise<void> => {
  try {
    const host = process.env.CHROMADB_HOST || 'localhost';
    const port = process.env.CHROMADB_PORT || '8000';
    const collectionName = process.env.CHROMADB_COLLECTION_NAME || 'memory_embeddings';

    // Initialize ChromaDB client
    chromaClient = new ChromaClient({
      path: `http://${host}:${port}`,
    });

    // Get or create collection
    try {
      memoryCollection = await chromaClient.getCollection({
        name: collectionName,
      });
      logger.info(`Connected to existing ChromaDB collection: ${collectionName}`);
    } catch (error) {
      // Collection doesn't exist, create it
      memoryCollection = await chromaClient.createCollection({
        name: collectionName,
        metadata: {
          description: 'Memory embeddings for semantic search',
          embedding_model: 'text-embedding-3-small',
        },
      });
      logger.info(`Created new ChromaDB collection: ${collectionName}`);
    }

    logger.info('ChromaDB initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize ChromaDB:', error);
    throw error;
  }
};

// Get ChromaDB collection
export const getMemoryCollection = (): Collection => {
  if (!memoryCollection) {
    throw new Error('ChromaDB not initialized');
  }
  return memoryCollection;
};

// Add memory embedding to vector store
export const addMemoryEmbedding = async (
  memoryId: string,
  userId: string,
  content: string,
  summary: string,
  embedding: number[],
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const collection = getMemoryCollection();

    await collection.add({
      ids: [memoryId],
      embeddings: [embedding],
      documents: [content],
      metadatas: [{
        userId,
        summary,
        type: 'memory',
        ...metadata,
      }],
    });

    logger.info(`Added memory embedding for memory ID: ${memoryId}`);
  } catch (error) {
    logger.error('Failed to add memory embedding:', error);
    throw new Error(`Failed to add memory embedding: ${error}`);
  }
};

// Update memory embedding
export const updateMemoryEmbedding = async (
  memoryId: string,
  content: string,
  summary: string,
  embedding: number[],
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const collection = getMemoryCollection();

    // First, delete the existing embedding
    await collection.delete({
      ids: [memoryId],
    });

    // Then add the updated embedding
    await collection.add({
      ids: [memoryId],
      embeddings: [embedding],
      documents: [content],
      metadatas: [{
        summary,
        type: 'memory',
        ...metadata,
      }],
    });

    logger.info(`Updated memory embedding for memory ID: ${memoryId}`);
  } catch (error) {
    logger.error('Failed to update memory embedding:', error);
    throw new Error(`Failed to update memory embedding: ${error}`);
  }
};

// Delete memory embedding
export const deleteMemoryEmbedding = async (memoryId: string): Promise<void> => {
  try {
    const collection = getMemoryCollection();

    await collection.delete({
      ids: [memoryId],
    });

    logger.info(`Deleted memory embedding for memory ID: ${memoryId}`);
  } catch (error) {
    logger.error('Failed to delete memory embedding:', error);
    throw new Error(`Failed to delete memory embedding: ${error}`);
  }
};

// Search memories by similarity
export const searchMemoriesBySimilarity = async (
  queryEmbedding: number[],
  userId: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<{
  memoryId: string;
  similarity: number;
  content: string;
  summary: string;
  metadata: Record<string, any>;
}>> => {
  try {
    const collection = getMemoryCollection();

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      where: {
        userId,
        type: 'memory',
      },
    });

    if (!results.ids || !results.ids[0]) {
      return [];
    }

    const memories = results.ids[0].map((id, index) => ({
      memoryId: id as string,
      similarity: results.distances?.[0]?.[index] || 0,
      content: results.documents?.[0]?.[index] || '',
      summary: results.metadatas?.[0]?.[index]?.summary || '',
      metadata: results.metadatas?.[0]?.[index] || {},
    }));

    // Filter by similarity threshold
    return memories.filter(memory => memory.similarity >= threshold);
  } catch (error) {
    logger.error('Failed to search memories by similarity:', error);
    throw new Error(`Failed to search memories: ${error}`);
  }
};

// Search memories by text query (requires embedding the query first)
export const searchMemoriesByText = async (
  query: string,
  userId: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<{
  memoryId: string;
  similarity: number;
  content: string;
  summary: string;
  metadata: Record<string, any>;
}>> => {
  try {
    // This function requires the query to be embedded first
    // The embedding should be done by the AI service
    throw new Error('Text search requires query embedding. Use searchMemoriesBySimilarity with pre-embedded query.');
  } catch (error) {
    logger.error('Failed to search memories by text:', error);
    throw error;
  }
};

// Get all memory embeddings for a user
export const getUserMemoryEmbeddings = async (
  userId: string,
  limit: number = 100
): Promise<Array<{
  memoryId: string;
  content: string;
  summary: string;
  metadata: Record<string, any>;
}>> => {
  try {
    const collection = getMemoryCollection();

    const results = await collection.get({
      where: {
        userId,
        type: 'memory',
      },
      limit,
    });

    if (!results.ids) {
      return [];
    }

    return results.ids.map((id, index) => ({
      memoryId: id as string,
      content: results.documents?.[index] || '',
      summary: results.metadatas?.[index]?.summary || '',
      metadata: results.metadatas?.[index] || {},
    }));
  } catch (error) {
    logger.error('Failed to get user memory embeddings:', error);
    throw new Error(`Failed to get user memories: ${error}`);
  }
};

// Get memory embedding by ID
export const getMemoryEmbedding = async (
  memoryId: string
): Promise<{
  memoryId: string;
  content: string;
  summary: string;
  embedding: number[];
  metadata: Record<string, any>;
} | null> => {
  try {
    const collection = getMemoryCollection();

    const results = await collection.get({
      ids: [memoryId],
      include: ['embeddings'],
    });

    if (!results.ids || results.ids.length === 0) {
      return null;
    }

    return {
      memoryId: results.ids[0] as string,
      content: results.documents?.[0] || '',
      summary: results.metadatas?.[0]?.summary || '',
      embedding: results.embeddings?.[0] || [],
      metadata: results.metadatas?.[0] || {},
    };
  } catch (error) {
    logger.error('Failed to get memory embedding:', error);
    throw new Error(`Failed to get memory embedding: ${error}`);
  }
};

// Get collection statistics
export const getCollectionStats = async (): Promise<{
  totalMemories: number;
  totalUsers: number;
  averageEmbeddingDimension: number;
}> => {
  try {
    const collection = getMemoryCollection();

    const results = await collection.get({
      limit: 1000, // Get a sample to calculate stats
    });

    const totalMemories = results.ids?.length || 0;
    const uniqueUsers = new Set(results.metadatas?.map(m => m.userId) || []).size;
    
    // Calculate average embedding dimension
    let totalDimension = 0;
    let embeddingCount = 0;
    
    if (results.embeddings) {
      results.embeddings.forEach(embedding => {
        if (embedding) {
          totalDimension += embedding.length;
          embeddingCount++;
        }
      });
    }

    const averageEmbeddingDimension = embeddingCount > 0 ? totalDimension / embeddingCount : 0;

    return {
      totalMemories,
      totalUsers: uniqueUsers,
      averageEmbeddingDimension,
    };
  } catch (error) {
    logger.error('Failed to get collection stats:', error);
    throw new Error(`Failed to get collection stats: ${error}`);
  }
};

// Clear all embeddings for a user
export const clearUserEmbeddings = async (userId: string): Promise<void> => {
  try {
    const collection = getMemoryCollection();

    await collection.delete({
      where: {
        userId,
        type: 'memory',
      },
    });

    logger.info(`Cleared all embeddings for user: ${userId}`);
  } catch (error) {
    logger.error('Failed to clear user embeddings:', error);
    throw new Error(`Failed to clear user embeddings: ${error}`);
  }
};

export default {
  initializeChromaDB,
  getMemoryCollection,
  addMemoryEmbedding,
  updateMemoryEmbedding,
  deleteMemoryEmbedding,
  searchMemoriesBySimilarity,
  searchMemoriesByText,
  getUserMemoryEmbeddings,
  getMemoryEmbedding,
  getCollectionStats,
  clearUserEmbeddings,
}; 