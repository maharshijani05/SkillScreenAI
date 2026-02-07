import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket || socket.disconnected) {
    const token = localStorage.getItem('token');
    socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

// Wait for the socket to be connected before resolving
export const getConnectedSocket = (): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (s.connected) {
      resolve(s);
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);

    s.once('connect', () => {
      clearTimeout(timeout);
      resolve(s);
    });
    s.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
