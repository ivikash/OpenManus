import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { BrowserUseService } from './browser-service';

dotenv.config();

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Add a simple route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create a map to store browser-use services for each client
const browserUseServices = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Create a new browser-use service for this client
  const browserUseService = new BrowserUseService();
  browserUseServices.set(socket.id, browserUseService);
  
  // Forward browser-use service events to the client
  browserUseService.on('log', (message) => {
    socket.emit('automation:log', message);
  });
  
  browserUseService.on('complete', (result) => {
    socket.emit('automation:complete', result);
  });

  socket.on('prompt:submit', async (data) => {
    try {
      const { prompt, options = {} } = typeof data === 'string' 
        ? { prompt: data, options: {} } 
        : data;
      
      io.emit('automation:log', {
        id: Date.now().toString(),
        text: `Starting automation with prompt: "${prompt}"`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });

      // Run browser-use automation
      await browserUseService.runAutomation({
        task: prompt,
        model: options.model || 'llama2',
        useVision: options.useVision !== false,
        modelProvider: options.modelProvider || 'ollama',
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      console.error('Automation error:', error);
      
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
    const service = browserUseServices.get(socket.id);
    if (service) {
      service.stopAutomation();
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up the browser-use service
    const service = browserUseServices.get(socket.id);
    if (service) {
      service.stopAutomation();
      browserUseServices.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/health`);
});