'use client';

import { useEffect, useState } from 'react';
import logger from './logger';

// Define types for WebSocket messages
interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private messageListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds

  constructor(url: string) {
    this.url = url.replace(/^http/, 'ws') + '/ws';
    // Only connect in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    logger.debug('Initializing WebSocket connection', { metadata: { url: this.url } });
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        logger.info('WebSocket connected');
        this.dispatchEvent('connect', null);
      };

      this.socket.onclose = (event) => {
        if (this.isConnected) {
          this.isConnected = false;
          logger.warn('WebSocket disconnected', { 
            metadata: { 
              code: event.code,
              reason: event.reason || 'No reason provided'
            }
          });
          this.dispatchEvent('disconnect', null);
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        logger.error(`WebSocket connection error`, { 
          metadata: { error: 'Connection failed' } 
        });
        this.dispatchEvent('connect_error', { message: 'Connection failed' });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          logger.debug('WebSocket message received', { metadata: { event: message.event } });
          this.dispatchEvent(message.event, message.data);
        } catch (error) {
          logger.error('Error parsing WebSocket message', {
            metadata: { 
              error: error instanceof Error ? error.message : 'Unknown error',
              data: typeof event.data === 'string' ? event.data.substring(0, 100) : 'Non-string data'
            }
          });
        }
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection', {
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          url: this.url
        }
      });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        logger.info('Attempting to reconnect WebSocket', {
          metadata: {
            attempt: this.reconnectAttempts + 1,
            maxAttempts: this.maxReconnectAttempts,
            delay: this.reconnectDelay
          }
        });
        this.reconnectAttempts++;
        this.connect();
        // Exponential backoff with max delay
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    }, this.reconnectDelay);
  }

  public emit<T>(event: string, data: T): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const message: WebSocketMessage<T> = { event, data };
        this.socket.send(JSON.stringify(message));
        logger.debug('WebSocket message sent', { metadata: { event } });
        return true;
      } catch (error) {
        logger.error('Error sending message', {
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            event
          }
        });
        return false;
      }
    } else {
      logger.warn('Cannot send message, socket not connected');
      return false;
    }
  }

  public on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.messageListeners.has(event)) {
      this.messageListeners.set(event, []);
    }
    this.messageListeners.get(event)?.push(callback);
    
    // Return cleanup function
    return () => this.off(event, callback);
  }

  public off(event: string, callback?: (data: unknown) => void): void {
    if (!callback) {
      this.messageListeners.delete(event);
      return;
    }

    const listeners = this.messageListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.messageListeners.delete(event);
      }
    }
  }

  private dispatchEvent(event: string, data: unknown): void {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}`, {
            metadata: { 
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      });
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnection attempts
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
  }
}

// Create a singleton instance
let socket: WebSocketClient | null = null;

// Function to get or create the socket instance
export function getSocket(): WebSocketClient {
  if (!socket && typeof window !== 'undefined') {
    socket = new WebSocketClient(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
  }
  return socket!;
}

// Hook for components to use the socket
export function useSocketStatus(): boolean {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const socketInstance = getSocket();
    setIsConnected(socketInstance.getConnectionStatus());
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const cleanupConnect = socketInstance.on('connect', handleConnect);
    const cleanupDisconnect = socketInstance.on('disconnect', handleDisconnect);

    return () => {
      cleanupConnect();
      cleanupDisconnect();
    };
  }, []);

  return isConnected;
}
