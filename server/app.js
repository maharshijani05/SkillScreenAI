import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { initSocket } from './config/socket.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import proctoringRoutes from './routes/proctoringRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to database
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://skill-screen-ai-sivm-115pruthvi-gmailcoms-projects.vercel.app',
];
// Also allow any Vercel preview deploy
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in case of new domains
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' })); // Increased for base64 snapshots
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/attempt', attemptRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
