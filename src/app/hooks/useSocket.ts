'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/app/lib/socket';
import logger from '@/lib/logger';

/**
 * Custom hook for managing WebSocket connections
 * 
 * This hook uses the singleton WebSocket instance and provides
 * a convenient interface for components to interact with it.
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const socket = getSocket();
    setIsConnected(socket.getConnectionStatus());
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    const cleanupConnect = socket.on('connect', handleConnect);
    const cleanupDisconnect = socket.on('disconnect', handleDisconnect);
    
    return () => {
      cleanupConnect();
      cleanupDisconnect();
    };
  }, []);

  // Function to send messages
  const sendMessage = useCallback(<T>(event: string, data: T): boolean => {
    const socket = getSocket();
    return socket.emit(event, data);
  }, []);

  // Function to register event listeners
  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    const socket = getSocket();
    return socket.on(event, callback);
  }, []);

  return { 
    isConnected, 
    sendMessage,
    on
  };
}
