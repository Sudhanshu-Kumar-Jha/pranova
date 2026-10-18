import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Role } from '@prisma/client';
import { handleEmergencyEvent, EmergencySosPayload } from './emergency.handler.js';
import { JwtUtils } from '../utils/jwt.js';
import { TokenPayload } from '../types/auth.types.js';

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(null, true); // Allow connection in dev
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Section A.2: Strict Socket Handshake Authentication Middleware
  io.use((socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!rawToken) {
        console.warn(`[SOCKET] Handshake rejected: No auth token provided by ${socket.id}`);
        return next(new Error('Authentication error: Missing authentication token'));
      }

      const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
        ? rawToken.slice(7).trim()
        : String(rawToken).trim();

      const decoded = JwtUtils.verifyAccessToken(token);
      socket.data.user = decoded;
      return next();
    } catch (err: any) {
      console.warn(`[SOCKET] Handshake authentication failed for ${socket.id}: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as TokenPayload;
    console.log(`[SOCKET] Client connected: ${socket.id} (User: ${user?.userId}, Role: ${user?.role})`);

    // Section A.2: Auto-join verified rooms based on role
    if (user?.role === Role.ADMIN) {
      socket.join('admin_room');
      console.log(`[SOCKET] Admin socket ${socket.id} joined 'admin_room'`);
    } else if (user?.role === Role.CARE_MANAGER) {
      socket.join('care_managers');
      socket.join(`care_manager_${user.userId}`);
      console.log(`[SOCKET] Care Manager socket ${socket.id} joined 'care_managers' & 'care_manager_${user.userId}'`);
    } else if (user?.role === Role.PATIENT) {
      socket.join(`patient_${user.userId}`);
      console.log(`[SOCKET] Patient socket ${socket.id} joined 'patient_${user.userId}'`);
    }

    // Explicit room join handler for backwards compatibility
    socket.on('admin:join', () => {
      if (user?.role === Role.ADMIN) {
        socket.join('admin_room');
        socket.emit('admin:joined', { message: 'Connected to Emergency Alert Stream' });
      } else {
        socket.emit('error', { message: 'Forbidden: Admin role required' });
      }
    });

    // Section A.2: Reject emergency:sos emissions if socket role is not PATIENT
    socket.on('emergency:sos', async (payload: EmergencySosPayload, callback?: (res: { success: boolean; data?: unknown; message?: string }) => void) => {
      try {
        if (user?.role !== Role.PATIENT) {
          console.warn(`[SOCKET] Rejected emergency:sos from non-PATIENT role: ${user?.role} (${socket.id})`);
          if (typeof callback === 'function') {
            return callback({
              success: false,
              message: 'Forbidden: Only authenticated patients may broadcast emergency SOS',
            });
          }
          return;
        }

        console.log(`[SOCKET] Verified emergency:sos from patient ${user.userId}:`, payload);
        const verifiedPayload: EmergencySosPayload = {
          ...payload,
          patientId: user.userId,
        };

        const result = await handleEmergencyEvent(io!, socket, verifiedPayload);
        if (typeof callback === 'function') {
          callback({ success: true, data: result });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to process emergency SOS';
        console.error(`[SOCKET] Error handling emergency:sos:`, error);
        if (typeof callback === 'function') {
          callback({ success: false, message: msg });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet. Call initSocketIO first.');
  }
  return io;
};
