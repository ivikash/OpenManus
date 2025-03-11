import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { SocketService } from '@/lib/socket-service';

export const config = {
  api: {
    bodyParser: false,
  },
};

const socketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket?.server.io) {
    console.log('Initializing Socket.IO server...');
    
    const httpServer: NetServer = res.socket.server as any;
    const socketService = new SocketService();
    socketService.initialize(httpServer);
    
    res.socket.server.io = true;
  }

  res.end();
};

export default socketHandler;