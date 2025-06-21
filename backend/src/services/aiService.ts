import OpenAI from 'openai';
import { logger } from '../utils/logger';
import {
  AISummaryRequest,
  AISummaryResponse,
  AIQueryRequest,
  AIQueryResponse,
  Emotion,
  Memory,
  MemoryWithPeople,
} from '../types';
import { getDatabase } from './database';
import { searchMemoriesBySimilarity } from './vectorStore';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// Generate embeddings for text
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Failed to generate embedding:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
};

// Summarize memory content and extract emotions
export const summarizeMemory = async (
  request: AISummaryRequest
): Promise<AISummaryResponse> => {
  try {
    const prompt = `
You are an AI assistant that helps summarize personal memories and extract emotional insights.

Please analyze the following memory content and provide:
1. A concise summary (2-3 sentences)
2. Primary and secondary emotions
3. Emotional intensity (1-10 scale)
4. Emotional valence (positive/negative/neutral)
5. Relevant tags
6. People mentioned
7. Overall mood score (1-10 scale)

Memory content: "${request.content}"

Respond in the following JSON format:
{
  "summary": "Brief summary of the memory",
  "emotions": {
    "primary": "main emotion",
    "secondary": ["emotion1", "emotion2"],
    "intensity": 7,
    "valence": "positive"
  },
  "tags": ["tag1", "tag2", "tag3"],
  "people": ["person1", "person2"],
  "mood": 8
}
`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that analyzes personal memories and extracts emotional insights. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const result = JSON.parse(content);

    return {
      summary: result.summary,
      emotions: {
        primary: result.emotions.primary,
        secondary: result.emotions.secondary || [],
        intensity: result.emotions.intensity,
        valence: result.emotions.valence,
      },
      tags: result.tags || [],
      people: result.people || [],
      mood: result.mood,
    };
  } catch (error) {
    logger.error('Failed to summarize memory:', error);
    throw new Error(`Failed to summarize memory: ${error}`);
  }
};

// Process natural language queries
export const processMemoryQuery = async (
  request: AIQueryRequest
): Promise<AIQueryResponse> => {
  try {
    // First, generate embedding for the query
    const queryEmbedding = await generateEmbedding(request.query);

    // Search for similar memories
    const similarMemories = await searchMemoriesBySimilarity(
      queryEmbedding,
      request.userId,
      request.limit || 10,
      0.6
    );

    if (similarMemories.length === 0) {
      return {
        memories: [],
        query: request.query,
        explanation: 'No memories found matching your query.',
        confidence: 0,
      };
    }

    // Get full memory details from database
    const supabase = getDatabase();
    const memoryIds = similarMemories.map(m => m.memoryId);
    
    const { data: memories, error } = await supabase
      .from('memories')
      .select(`
        *,
        people:people(*)
      `)
      .in('id', memoryIds)
      .eq('userId', request.userId);

    if (error) {
      throw new Error(`Failed to fetch memories: ${error.message}`);
    }

    // Use AI to explain the results
    const explanationPrompt = `
You are an AI assistant that explains memory search results.

Query: "${request.query}"

Found ${memories.length} relevant memories. Please provide a brief explanation of why these memories are relevant to the query.

Memories found:
${memories.map((m, i) => `${i + 1}. ${m.summary} (${m.title})`).join('\n')}

Provide a 2-3 sentence explanation of the relevance and a confidence score (0-1).
`;

    const explanationResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that explains memory search results.',
        },
        {
          role: 'user',
          content: explanationPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const explanation = explanationResponse.choices[0]?.message?.content || 'Relevant memories found.';

    return {
      memories: memories as MemoryWithPeople[],
      query: request.query,
      explanation,
      confidence: similarMemories[0]?.similarity || 0,
    };
  } catch (error) {
    logger.error('Failed to process memory query:', error);
    throw new Error(`Failed to process query: ${error}`);
  }
};

// Generate smart nudges
export const generateNudges = async (
  userId: string,
  daysSinceLastMemory?: number,
  emotionalGaps?: string[],
  inactivePeople?: string[]
): Promise<Array<{
  type: 'reconnect' | 'log_memory' | 'emotional_gap' | 'person_reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  relatedPeople?: string[];
}>> => {
  try {
    const supabase = getDatabase();

    // Get user's recent memories and people
    const { data: recentMemories } = await supabase
      .from('memories')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(10);

    const { data: people } = await supabase
      .from('people')
      .select('*')
      .eq('userId', userId);

    const nudgePrompt = `
You are an AI assistant that generates personalized nudges to help users maintain their memory journal.

User context:
- Days since last memory: ${daysSinceLastMemory || 'Unknown'}
- Recent memories: ${recentMemories?.length || 0} in the last 10 entries
- Total people in their life: ${people?.length || 0}
- Emotional gaps mentioned: ${emotionalGaps?.join(', ') || 'None'}
- Inactive people: ${inactivePeople?.join(', ') || 'None'}

Generate 2-4 personalized nudges that could help the user. Consider:
1. If they haven't logged in a while, encourage them to capture today's moments
2. If they have emotional gaps, suggest reflecting on those emotions
3. If they haven't mentioned certain people recently, suggest reconnecting
4. If they've been having negative emotions, suggest positive reflection

For each nudge, provide:
- type: one of "reconnect", "log_memory", "emotional_gap", "person_reminder"
- title: short, engaging title
- message: friendly, encouraging message
- priority: "low", "medium", or "high"
- relatedPeople: array of person names if relevant

Respond in JSON format:
{
  "nudges": [
    {
      "type": "log_memory",
      "title": "Capture Today's Moments",
      "message": "How has your day been? Take a moment to reflect and capture what's been meaningful.",
      "priority": "medium",
      "relatedPeople": []
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that generates personalized nudges for memory journaling.',
        },
        {
          role: 'user',
          content: nudgePrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    return result.nudges || [];
  } catch (error) {
    logger.error('Failed to generate nudges:', error);
    throw new Error(`Failed to generate nudges: ${error}`);
  }
};

// Transcribe audio using Whisper
export const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      language: 'en',
    });

    return response.text;
  } catch (error) {
    logger.error('Failed to transcribe audio:', error);
    throw new Error(`Failed to transcribe audio: ${error}`);
  }
};

// Analyze emotional patterns
export const analyzeEmotionalPatterns = async (
  memories: Memory[]
): Promise<{
  dominantEmotions: string[];
  moodTrend: 'improving' | 'declining' | 'stable';
  emotionalGaps: string[];
  recommendations: string[];
}> => {
  try {
    const memorySummaries = memories
      .map(m => `${m.title}: ${m.summary} (Mood: ${m.mood}, Emotions: ${m.emotions.primary})`)
      .join('\n');

    const prompt = `
Analyze the following memory entries and identify emotional patterns:

${memorySummaries}

Provide analysis in JSON format:
{
  "dominantEmotions": ["emotion1", "emotion2"],
  "moodTrend": "improving|declining|stable",
  "emotionalGaps": ["missing_emotion1", "missing_emotion2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes emotional patterns in personal memories.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to analyze emotional patterns:', error);
    throw new Error(`Failed to analyze patterns: ${error}`);
  }
};

// Generate memory insights
export const generateMemoryInsights = async (
  memories: Memory[],
  people: any[]
): Promise<{
  insights: string[];
  patterns: string[];
  suggestions: string[];
}> => {
  try {
    const prompt = `
Analyze these memories and people to provide insights:

Memories: ${memories.length} total
People: ${people.map(p => p.name).join(', ')}

Recent memory themes: ${memories.slice(0, 5).map(m => m.title).join(', ')}

Provide insights in JSON format:
{
  "insights": ["insight1", "insight2"],
  "patterns": ["pattern1", "pattern2"],
  "suggestions": ["suggestion1", "suggestion2"]
}
`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that provides insights about personal memories and relationships.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to generate insights:', error);
    throw new Error(`Failed to generate insights: ${error}`);
  }
};

export default {
  generateEmbedding,
  summarizeMemory,
  processMemoryQuery,
  generateNudges,
  transcribeAudio,
  analyzeEmotionalPatterns,
  generateMemoryInsights,
}; 