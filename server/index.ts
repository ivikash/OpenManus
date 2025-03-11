import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Agent } from 'browser-use';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Custom event handler for browser-use
const customEventHandler = (event: any) => {
  io.emit('automation:log', {
    id: Date.now().toString(),
    text: event.message || JSON.stringify(event),
    type: 'system',
    timestamp: new Date().toLocaleTimeString(),
  });
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('prompt:submit', async (prompt: string) => {
    try {
      io.emit('automation:log', {
        id: Date.now().toString(),
        text: `Starting automation with prompt: "${prompt}"`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });

      // Initialize browser-use agent
      const agent = new Agent({
        task: prompt,
        llm: new ChatOpenAI({ model: 'gpt-4o' }),
        onEvent: customEventHandler,
      });

      // Run the agent
      await agent.run();

      io.emit('automation:log', {
        id: Date.now().toString(),
        text: 'Automation completed successfully',
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });

      io.emit('automation:complete');
    } catch (error) {
      console.error('Automation error:', error);
      
      io.emit('automation:log', {
        id: Date.now().toString(),
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
        timestamp: new Date().toLocaleTimeString(),
      });
      
      io.emit('automation:error', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});