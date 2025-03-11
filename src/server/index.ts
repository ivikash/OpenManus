import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { BrowserUseService } from './browser-service';
import logger from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

dotenv.config();

// Add request ID middleware
const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  next();
};

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Apply middleware
app.use(addRequestId);
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming request`, { 
    metadata: {
      method: req.method,
      path: req.path,
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
  
  // Log response when finished
  res.on('finish', () => {
    logger.info(`Request completed`, {
      metadata: {
        method: req.method,
        path: req.path,
        requestId: req.id,
        statusCode: res.statusCode,
        responseTime: Date.now() - req.startTime
      }
    });
  });
  
  req.startTime = Date.now();
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Add a root route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('Browser Use Server is running');
});

// Add a simple route for testing
app.get('/api/health', (req: Request, res: Response) => {
  logger.debug('Health check endpoint called', { metadata: { requestId: req.id } });
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create a map to store browser-use services for each client
const browserUseServices = new Map();

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Create a new browser-use service for this client
  const browserUseService = new BrowserUseService();
  browserUseServices.set(socket.id, browserUseService);
  
  // Forward browser-use service events to the client
  browserUseService.on('log', (message) => {
    logger.debug(`Emitting log to client: ${socket.id}`, { metadata: { message } });
    socket.emit('automation:log', message);
  });
  
  browserUseService.on('complete', (result) => {
    logger.info(`Automation complete for client: ${socket.id}`, { metadata: { result } });
    socket.emit('automation:complete', result);
  });

  // Handle Python process output
  browserUseService.on('pythonOutput', (data) => {
    try {
      const jsonData = JSON.parse(data);
      logger.debug('Received Python output', { metadata: { type: jsonData.type } });
      
      // Handle screenshot data
      if (jsonData.type === 'screenshot' && jsonData.data) {
        logger.debug('Emitting screenshot to client');
        socket.emit('automation:screenshot', { data: jsonData.data });
      }
      // Handle other log messages
      else if (jsonData.type && jsonData.message) {
        logger.debug(`Emitting log message: ${jsonData.message}`, { metadata: { type: jsonData.type } });
        socket.emit('automation:log', {
          id: Date.now().toString(),
          text: jsonData.message,
          type: jsonData.type,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (e) {
      // If not JSON, emit as plain text
      logger.debug(`Emitting non-JSON output: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
      socket.emit('automation:log', {
        id: Date.now().toString(),
        text: data,
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  });

  socket.on('prompt:submit', async (data) => {
    try {
      const { prompt, options = {} } = typeof data === 'string' 
        ? { prompt: data, options: {} } 
        : data;
      
      // Enhanced logging for prompt submission
      logger.info(`Received prompt submission from client: ${socket.id}`, {
        metadata: {
          prompt,
          options,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        }
      });
      
      // Log detailed options
      const modelProvider = options.modelProvider || 'ollama';
      const model = options.model || (modelProvider === 'ollama' ? 'llama3.2' : 'gpt-4o');
      const useVision = options.useVision !== false;
      
      logger.debug(`Automation configuration details`, {
        metadata: {
          modelProvider,
          model,
          useVision,
          socketId: socket.id,
          clientIP: socket.handshake.address
        }
      });
      
      // Send detailed log to client
      io.emit('automation:log', {
        id: Date.now().toString(),
        text: `Starting automation with prompt: "${prompt}"`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });
      
      // Add configuration details to log
      io.emit('automation:log', {
        id: Date.now().toString(),
        text: `Configuration: Model Provider: ${modelProvider}, Model: ${model}, Vision: ${useVision ? 'Enabled' : 'Disabled'}`,
        type: 'config',
        timestamp: new Date().toLocaleTimeString(),
      });

      // Run browser-use automation
      await browserUseService.runAutomation({
        task: prompt,
        model: options.model || 'llama3.2',
        useVision: options.useVision !== false,
        modelProvider: options.modelProvider || 'ollama',
        apiKey: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      logger.error(`Automation error for client: ${socket.id}`, {
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          socketId: socket.id
        }
      });
      
      socket.emit('automation:log', {
        id: Date.now().toString(),
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
        timestamp: new Date().toLocaleTimeString(),
      });
      
      socket.emit('automation:error', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  socket.on('automation:stop', () => {
    logger.info(`Stopping automation for client: ${socket.id}`);
    const service = browserUseServices.get(socket.id);
    if (service) {
      service.stopAutomation();
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Clean up the browser-use service
    const service = browserUseServices.get(socket.id);
    if (service) {
      service.stopAutomation();
      browserUseServices.delete(socket.id);
      logger.debug(`Cleaned up browser service for client: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API endpoint: http://localhost:${PORT}/api/health`);
});
