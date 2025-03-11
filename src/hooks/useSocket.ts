'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/lib/logger';

/**
 * Custom hook for managing socket.io connections
 * 
 * This hook handles connecting to the socket server, managing connection state,
 * and proper cleanup when the component unmounts.
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    
    logger.debug('Initializing socket connection');
    
    function onConnect() {
      setIsConnected(true);
      logger.info('Socket connected', { 
        metadata: { socketId: socketInstance.id }
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      logger.warn('Socket disconnected');
    }

    function onError(error: Error) {
      logger.error(`Socket error: ${error.message}`, { 
        metadata: { stack: error.stack }
      });
    }

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onError);

    setSocket(socketInstance);

    return () => {
      logger.debug('Cleaning up socket connection');
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onError);
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}