# MemoryNest 🧠💭

An AI-powered memory logging and semantic recall application that helps you capture, organize, and rediscover meaningful moments in your life.

## 🌟 Features

### Core Functionality
- **Voice & Text Memory Capture**: Log moments through voice transcription or text input
- **AI-Powered Summarization**: Automatic summarization and emotion extraction
- **Semantic Memory Search**: Natural language queries to find specific memories
- **Person-Based Organization**: Group memories by people with mood tracking
- **Smart Nudging System**: AI-generated reminders based on emotional patterns
- **Memory Visualization**: Dashboard showing memory patterns and connections

### AI Capabilities
- **OpenAI Integration**: GPT-4o for summarization and smart queries
- **Vector Embeddings**: text-embedding-3-small for semantic search
- **Emotion Analysis**: Automatic mood and emotion tagging
- **Intelligent Recall**: Natural language memory retrieval
- **Smart Nudges**: Proactive suggestions based on emotional gaps

## 🏗️ Architecture

```
MemoryNest/
├── frontend/                 # React + Tailwind UI
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Main app pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API integration
│   │   └── utils/           # Helper functions
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, etc.
│   │   └── utils/           # Helper functions
├── database/                 # Database schemas and migrations
├── ai-services/             # AI processing services
└── docs/                    # Documentation
```

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management
- **Web Speech API** for voice input

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **JWT** for authentication
- **OpenAI API** integration
- **ChromaDB** for vector storage

### Database
- **Supabase** (PostgreSQL) for relational data
- **ChromaDB** for vector embeddings
- **Redis** for caching (optional)

### AI Services
- **OpenAI GPT-4o** for summarization and queries
- **OpenAI text-embedding-3-small** for embeddings
- **OpenAI Whisper** for transcription

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MemoryNest
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   
   # Frontend environment
   cp frontend/.env.example frontend/.env
   ```

4. **Configure Environment Variables**
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `JWT_SECRET`: Secret for JWT tokens

5. **Database Setup**
   ```bash
   # Run database migrations
   cd backend
   npm run db:migrate
   ```

6. **Start Development Servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend directory)
   npm run dev
   ```

## 🎯 Usage

### Memory Capture
1. Click the "Capture Memory" button
2. Choose voice or text input
3. Describe your moment
4. AI automatically summarizes and extracts emotions
5. Memory is stored with semantic embeddings

### Memory Search
1. Use natural language queries like:
   - "Who have I felt most calm around?"
   - "Show me happy memories with Sarah"
   - "When did I feel anxious recently?"

### Smart Nudges
- Receive AI-generated reminders based on:
  - Long periods without logging
  - Emotional pattern gaps
  - Important people you haven't mentioned recently

## 🔧 Development

### Project Structure
- **Frontend**: React components with Tailwind styling
- **Backend**: Express API with TypeScript
- **AI Services**: OpenAI integration for processing
- **Database**: Supabase for data, ChromaDB for vectors

### Key Components
- **MemoryService**: Handles memory CRUD operations
- **AIService**: Manages OpenAI API calls
- **VectorService**: Handles embeddings and similarity search
- **NudgeService**: Generates smart reminders

## 📝 API Endpoints

### Memory Management
- `POST /api/memories` - Create new memory
- `GET /api/memories` - Get memories with filters
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory

### AI Services
- `POST /api/ai/summarize` - Summarize memory
- `POST /api/ai/query` - Semantic memory search
- `POST /api/ai/nudges` - Generate smart nudges

### People Management
- `GET /api/people` - Get all people
- `POST /api/people` - Create person
- `PUT /api/people/:id` - Update person

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Supabase for database infrastructure
- ChromaDB for vector storage
- React and Tailwind communities 