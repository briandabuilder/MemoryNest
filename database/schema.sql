-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE emotion_valence AS ENUM ('positive', 'negative', 'neutral');
CREATE TYPE nudge_type AS ENUM ('reconnect', 'log_memory', 'emotional_gap', 'person_reminder');
CREATE TYPE nudge_priority AS ENUM ('low', 'medium', 'high');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(255),
    avatar TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    people UUID[] DEFAULT '{}',
    emotions JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    location VARCHAR(255),
    weather VARCHAR(100),
    mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 10),
    is_private BOOLEAN DEFAULT false,
    audio_url TEXT,
    image_url TEXT,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nudges table
CREATE TABLE nudges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type nudge_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority nudge_priority NOT NULL DEFAULT 'medium',
    related_people UUID[] DEFAULT '{}',
    related_memories UUID[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_actioned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_people ON memories USING GIN(people);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_emotions ON memories USING GIN(emotions);
CREATE INDEX idx_memories_is_private ON memories(is_private);
CREATE INDEX idx_memories_mood ON memories(mood);
CREATE INDEX idx_nudges_user_id ON nudges(user_id);
CREATE INDEX idx_nudges_created_at ON nudges(created_at DESC);
CREATE INDEX idx_nudges_is_read ON nudges(is_read);
CREATE INDEX idx_nudges_type ON nudges(type);
CREATE INDEX idx_nudges_priority ON nudges(priority);

-- Full-text search indexes
CREATE INDEX idx_memories_content_fts ON memories USING GIN(to_tsvector('english', content));
CREATE INDEX idx_memories_title_fts ON memories USING GIN(to_tsvector('english', title));
CREATE INDEX idx_memories_summary_fts ON memories USING GIN(to_tsvector('english', summary));
CREATE INDEX idx_people_name_fts ON people USING GIN(to_tsvector('english', name));

-- Trigram indexes for fuzzy search
CREATE INDEX idx_memories_content_trgm ON memories USING GIN(content gin_trgm_ops);
CREATE INDEX idx_memories_title_trgm ON memories USING GIN(title gin_trgm_ops);
CREATE INDEX idx_people_name_trgm ON people USING GIN(name gin_trgm_ops);

-- Vector similarity search index (if using pgvector extension)
-- CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- People policies
CREATE POLICY "Users can view own people" ON people
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own people" ON people
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own people" ON people
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own people" ON people
    FOR DELETE USING (auth.uid() = user_id);

-- Memories policies
CREATE POLICY "Users can view own memories" ON memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
    FOR DELETE USING (auth.uid() = user_id);

-- Nudges policies
CREATE POLICY "Users can view own nudges" ON nudges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nudges" ON nudges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nudges" ON nudges
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nudges" ON nudges
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to search memories with full-text search
CREATE OR REPLACE FUNCTION search_memories(
    search_query TEXT,
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    summary TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    mood INTEGER,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.summary,
        m.content,
        m.created_at,
        m.mood,
        ts_rank(to_tsvector('english', m.title || ' ' || m.content || ' ' || m.summary), plainto_tsquery('english', search_query)) as similarity
    FROM memories m
    WHERE m.user_id = user_uuid
    AND (
        to_tsvector('english', m.title || ' ' || m.content || ' ' || m.summary) @@ plainto_tsquery('english', search_query)
        OR m.title ILIKE '%' || search_query || '%'
        OR m.content ILIKE '%' || search_query || '%'
        OR m.summary ILIKE '%' || search_query || '%'
    )
    ORDER BY similarity DESC, m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get memory statistics
CREATE OR REPLACE FUNCTION get_memory_stats(user_uuid UUID)
RETURNS TABLE (
    total_memories BIGINT,
    average_mood NUMERIC,
    most_frequent_emotion TEXT,
    memories_this_week BIGINT,
    people_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_memories,
        ROUND(AVG(mood)::NUMERIC, 1) as average_mood,
        (SELECT emotions->>'primary' 
         FROM memories 
         WHERE user_id = user_uuid 
         GROUP BY emotions->>'primary' 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as most_frequent_emotion,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::BIGINT as memories_this_week,
        (SELECT COUNT(DISTINCT unnest(people))::BIGINT 
         FROM memories 
         WHERE user_id = user_uuid 
         AND created_at >= NOW() - INTERVAL '7 days') as people_this_week
    FROM memories 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get person insights
CREATE OR REPLACE FUNCTION get_person_insights(user_uuid UUID)
RETURNS TABLE (
    person_id UUID,
    person_name VARCHAR(255),
    memory_count BIGINT,
    average_mood NUMERIC,
    most_frequent_emotion TEXT,
    last_interaction TIMESTAMP WITH TIME ZONE,
    relationship_strength INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as person_id,
        p.name as person_name,
        COUNT(m.id)::BIGINT as memory_count,
        ROUND(AVG(m.mood)::NUMERIC, 1) as average_mood,
        (SELECT emotions->>'primary' 
         FROM memories 
         WHERE user_id = user_uuid 
         AND p.id = ANY(people)
         GROUP BY emotions->>'primary' 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as most_frequent_emotion,
        MAX(m.created_at) as last_interaction,
        LEAST(10, GREATEST(1, 
            (COUNT(m.id) * 2) + 
            GREATEST(0, 10 - EXTRACT(DAY FROM NOW() - MAX(m.created_at)) / 30)
        ))::INTEGER as relationship_strength
    FROM people p
    LEFT JOIN memories m ON p.id = ANY(m.people) AND m.user_id = user_uuid
    WHERE p.user_id = user_uuid
    GROUP BY p.id, p.name
    ORDER BY relationship_strength DESC;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE VIEW memory_timeline AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as memory_count,
    ROUND(AVG(mood), 1) as average_mood,
    ARRAY_AGG(id ORDER BY created_at DESC) as memory_ids
FROM memories
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert sample data for testing (optional)
-- INSERT INTO users (id, email, password_hash, name) VALUES 
--     ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQJELp2O', 'Test User');

-- INSERT INTO people (id, user_id, name, relationship, tags) VALUES 
--     ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Sarah', 'Friend', ARRAY['close', 'supportive']),
--     ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'John', 'Colleague', ARRAY['work', 'professional']);

-- INSERT INTO memories (id, user_id, title, content, summary, people, emotions, tags, mood) VALUES 
--     ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Coffee with Sarah', 'Had a great coffee chat with Sarah today. We talked about our dreams and goals.', 'Enjoyed a meaningful conversation with Sarah about future aspirations', ARRAY['550e8400-e29b-41d4-a716-446655440001'], '{"primary": "happy", "secondary": ["excited", "grateful"], "intensity": 8, "valence": "positive"}', ARRAY['coffee', 'friendship', 'goals'], 9); 