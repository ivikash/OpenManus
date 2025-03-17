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
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url.replace(/^http/, 'ws') + '/ws';
    this.connect();
  }

  private connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    logger.debug('Initializing WebSocket connection', { metadata: { url: this.url } });
    
    this.socket = new WebSocket(this.url);
    
    this.socket.onopen = () => {
      this.isConnected = true;
      logger.info('WebSocket connected');
      this.dispatchEvent('connect', null);
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      logger.warn('WebSocket disconnected');
      this.dispatchEvent('disconnect', null);
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      logger.error(`WebSocket error`, { metadata: { error } });
      this.dispatchEvent('connect_error', error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        logger.debug('WebSocket message received', { metadata: { event: message.event } });
        this.dispatchEvent(message.event, message.data);
      } catch (error) {
        logger.error('Error parsing WebSocket message', {
          metadata: { error, data: event.data }
        });
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(() => {
      if (!this.isConnected) {
        logger.info('Attempting to reconnect WebSocket');
        this.connect();
      } else if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    }, 5000);
  }

  public emit<T>(event: string, data: T): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = { event, data };
      this.socket.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', { metadata: { event } });
      return true;
    } else {
      logger.warn('Cannot send message, socket not connected');
      return false;
    }
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.messageListeners.has(event)) {
      this.messageListeners.set(event, []);
    }
    this.messageListeners.get(event)?.push(callback);
  }

  public off(event: string, callback?: (data: unknown) => void): void {
    if (!callback) {
      // Remove all listeners for this event
      this.messageListeners.delete(event);
      return;
    }

    const listeners = this.messageListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private dispatchEvent(event: string, data: unknown): void {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}

// Create a singleton instance
export const socket = new WebSocketClient(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

// Hook for components to use the socket
export function useSocketStatus(): boolean {
  const [isConnected, setIsConnected] = useState(socket.getConnectionStatus());

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return isConnected;
}
