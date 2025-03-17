'use client';

import { useEffect, useState, useCallback } from 'react';
import logger from '@/lib/logger';

// Define types for WebSocket messages
interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
}

/**
 * Custom hook for managing WebSocket connections
 * 
 * This hook handles connecting to the WebSocket server, managing connection state,
 * and proper cleanup when the component unmounts.
 */
export function useSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageListeners] = useState<Map<string, ((data: unknown) => void)[]>>(new Map());

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = socketUrl.replace(/^http/, 'ws') + '/ws';
    
    logger.debug('Initializing WebSocket connection', { metadata: { url: wsUrl } });
    
    const socketInstance = new WebSocket(wsUrl);
    
    socketInstance.onopen = () => {
      setIsConnected(true);
      logger.info('WebSocket connected');
    };

    socketInstance.onclose = () => {
      setIsConnected(false);
      logger.warn('WebSocket disconnected');
    };

    socketInstance.onerror = (error) => {
      logger.error(`WebSocket error`, { 
        metadata: { error }
      });
    };

    socketInstance.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        logger.debug('WebSocket message received', { 
          metadata: { event: message.event }
        });
        
        // Dispatch to registered listeners
        if (messageListeners.has(message.event)) {
          const listeners = messageListeners.get(message.event) || [];
          listeners.forEach(listener => listener(message.data));
        }
      } catch (error) {
        logger.error('Error parsing WebSocket message', {
          metadata: { error, data: event.data }
        });
      }
    };

    setSocket(socketInstance);

    // Attempt to reconnect on disconnect
    const reconnectInterval = setInterval(() => {
      if (!isConnected && socketInstance.readyState === WebSocket.CLOSED) {
        logger.info('Attempting to reconnect WebSocket');
        const newSocket = new WebSocket(wsUrl);
        setSocket(newSocket);
      }
    }, 5000);

    return () => {
      logger.debug('Cleaning up WebSocket connection');
      clearInterval(reconnectInterval);
      socketInstance.close();
    };
  }, [messageListeners, isConnected]);

  // Function to send messages
  const sendMessage = useCallback(<T>(event: string, data: T): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = { event, data };
      socket.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', { 
        metadata: { event }
      });
      return true;
    } else {
      logger.warn('Cannot send message, socket not connected');
      return false;
    }
  }, [socket]);

  // Function to register event listeners
  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!messageListeners.has(event)) {
      messageListeners.set(event, []);
    }
    messageListeners.get(event)?.push(callback);
    
    // Return function to remove the listener
    return () => {
      const listeners = messageListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }, [messageListeners]);

  return { 
    socket, 
    isConnected, 
    sendMessage,
    on
  };
}
