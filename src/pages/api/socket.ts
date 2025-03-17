import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

interface PromptOptions {
  model: string;
  modelProvider: string;
}

interface PromptData {
  prompt: string;
  options: PromptOptions;
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if ((res.socket as { server: { io?: unknown } }).server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new Server((res.socket as { server: { io?: unknown } }).server);
  (res.socket as { server: { io?: unknown } }).server.io = io;

  io.on('connection', socket => {
    console.log(`Socket ${socket.id} connected`);

    socket.on('prompt:submit', async (data: PromptData) => {
      try {
        console.log('Received prompt:', data);
        
        // Emit a log message to acknowledge receipt
        socket.emit('automation:log', {
          id: Date.now().toString(),
          text: `Processing prompt with ${data.options.modelProvider} - ${data.options.model}`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString()
        });

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Emit completion
        socket.emit('automation:complete');

      } catch (error) {
        console.error('Error processing prompt:', error);
        socket.emit('automation:error', {
          message: error instanceof Error ? error.message : 'An error occurred while processing your request'
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  res.end();
};

export default SocketHandler;
