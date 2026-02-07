import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow localhost, Vercel deploys, and undefined origin (server-to-server)
        if (
          !origin ||
          origin.includes('localhost') ||
          origin.endsWith('.vercel.app')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT authentication middleware for socket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id;

      // Token doesn't contain role, so look it up from DB
      try {
        const { default: User } = await import('../models/User.js');
        const user = await User.findById(socket.userId).select('role');
        socket.userRole = user?.role || 'candidate';
      } catch {
        socket.userRole = 'candidate';
      }

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Candidates join their attempt room
    socket.on('join-assessment', (attemptId) => {
      socket.join(`attempt:${attemptId}`);
      socket.attemptId = attemptId;
      console.log(`User ${socket.userId} joined attempt room: ${attemptId}`);
    });

    // Recruiters join job monitoring room
    socket.on('join-monitoring', (jobId) => {
      if (socket.userRole === 'recruiter' || socket.userRole === 'admin') {
        socket.join(`monitor:${jobId}`);
        console.log(`Recruiter ${socket.userId} monitoring job: ${jobId}`);
      }
    });

    // Candidate sends proctoring violation
    socket.on('proctoring-violation', (data) => {
      // Broadcast to recruiters monitoring this job
      if (data.jobId) {
        io.to(`monitor:${data.jobId}`).emit('candidate-violation', {
          candidateId: socket.userId,
          attemptId: data.attemptId,
          violation: data.violation,
          integrityScore: data.integrityScore,
          strikeCount: data.strikeCount,
          timestamp: new Date(),
        });
      }
    });

    // Candidate sends integrity score update
    socket.on('integrity-update', (data) => {
      if (data.jobId) {
        io.to(`monitor:${data.jobId}`).emit('candidate-integrity-update', {
          candidateId: socket.userId,
          attemptId: data.attemptId,
          integrityScore: data.integrityScore,
          strikeCount: data.strikeCount,
          attentionData: data.attentionData,
        });
      }
    });

    // Candidate sends frame snapshot for monitoring
    socket.on('frame-snapshot', (data) => {
      if (data.jobId) {
        io.to(`monitor:${data.jobId}`).emit('candidate-snapshot', {
          candidateId: socket.userId,
          attemptId: data.attemptId,
          frame: data.frame,
          timestamp: new Date(),
        });
      }
    });

    // Auto-submit notification
    socket.on('auto-submit', (data) => {
      if (data.jobId) {
        io.to(`monitor:${data.jobId}`).emit('candidate-auto-submitted', {
          candidateId: socket.userId,
          attemptId: data.attemptId,
          reason: data.reason,
          timestamp: new Date(),
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
