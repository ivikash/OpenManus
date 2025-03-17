"use client";

import React, { createContext, useEffect, useState } from 'react';
import { getSocket } from '@/app/lib/socket';

interface SocketContextType {
  isConnected: boolean;
  sendMessage: (event: string, data: unknown) => boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
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
  const sendMessage = (event: string, data: unknown): boolean => {
    const socket = getSocket();
    return socket.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
}
