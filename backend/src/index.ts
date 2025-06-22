import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authenticateUser } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import memoriesRoutes from './routes/memories';
import peopleRoutes from './routes/people';
import nudgesRoutes from './routes/nudges';
import dashboardRoutes from './routes/dashboard';
import aiRoutes from './routes/ai';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', authenticateUser, memoriesRoutes);
app.use('/api/people', authenticateUser, peopleRoutes);
app.use('/api/nudges', authenticateUser, nudgesRoutes);
app.use('/api/dashboard', authenticateUser, dashboardRoutes);
app.use('/api/ai', authenticateUser, aiRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

export default app; 