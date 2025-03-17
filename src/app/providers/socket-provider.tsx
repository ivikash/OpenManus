"use client";

import React, { createContext, useEffect, useState } from 'react';

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: unknown) => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create WebSocket connection
    const wsUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                 `ws://${window.location.hostname}:3001/ws`;
    
    const socketInstance = new WebSocket(wsUrl);
    
    // Set up event listeners
    socketInstance.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    socketInstance.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        setSocket(null);
      }, 3000);
    };
    
    socketInstance.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socketInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Save socket instance
    setSocket(socketInstance);
    
    // Clean up on unmount
    return () => {
      socketInstance.close();
    };
  }, []);

  // Function to send messages
  const sendMessage = (event: string, data: unknown) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ event, data }));
    } else {
      console.error('Cannot send message, socket not connected');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
}
