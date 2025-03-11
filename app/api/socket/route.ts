import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', socket => {
    console.log(`Socket ${socket.id} connected`);

    socket.on('prompt:submit', async (data: { prompt: string, options: { model: string, modelProvider: string } }) => {
      try {
        console.log('Received prompt:', data);
        
        // Emit a log message to acknowledge receipt
        socket.emit('automation:log', {
          id: Date.now().toString(),
          text: `Processing prompt with ${data.options.modelProvider} - ${data.options.model}`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString()
        });

        // TODO: Add your automation logic here
        // For now, just emit a mock screenshot after a delay
        setTimeout(() => {
          socket.emit('automation:screenshot', {
            data: 'mock-base64-screenshot-data'
          });
          
          socket.emit('automation:complete');
        }, 2000);

      } catch (error) {
        console.error('Error processing prompt:', error);
        socket.emit('automation:error', {
          message: error.message || 'An error occurred while processing your request'
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