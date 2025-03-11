import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInitializer = async () => {
      // Make sure the socket server is initialized
      await fetch('/api/socket');
      
      const socketIo = io();
      
      socketIo.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });
      
      socketIo.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      setSocket(socketIo);
    };

    socketInitializer();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return { socket, isConnected };
};