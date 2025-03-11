'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PromptInput } from '@/components/prompt-input';
import { ChatPanel } from '@/components/chat-panel';
import { BrowserView } from './components/browser-view';
import { useSocket } from '@/hooks/use-socket';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  text: string;
  type: 'system' | 'user' | 'error';
  timestamp: string;
}

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Add connection status message
    if (isConnected) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: 'Connected to server',
          type: 'system',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }

    // Listen for automation logs
    socket.on('automation:log', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for browser screenshots
    socket.on('automation:screenshot', (data: { data: string }) => {
      setScreenshot(data.data);
    });

    // Listen for automation completion
    socket.on('automation:complete', () => {
      setIsLoading(false);
    });

    // Listen for automation errors
    socket.on('automation:error', (error: { message: string }) => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `Error: ${error.message}`,
          type: 'error',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setIsLoading(false);
    });

    return () => {
      socket.off('automation:log');
      socket.off('automation:screenshot');
      socket.off('automation:complete');
      socket.off('automation:error');
    };
  }, [socket, isConnected]);

  const handleSubmitPrompt = (prompt: string, options: { model: string, modelProvider: string } = { model: 'llama2', modelProvider: 'ollama' }) => {
    if (!socket || !isConnected) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: 'Not connected to server. Please try again.',
          type: 'error',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    // Reset screenshot when starting new task
    setScreenshot(null);

    // Add user prompt to messages
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: prompt,
        type: 'user',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setIsLoading(true);
    socket.emit('prompt:submit', { 
      prompt, 
      options: {
        model: options?.model || 'llama2',
        modelProvider: options?.modelProvider || 'ollama'
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <PromptInput onSubmit={handleSubmitPrompt} isLoading={isLoading} />
              </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground">
              {isConnected ? (
                <span className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                  Connected to server
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                  Disconnected from server
                </span>
              )}
            </div>
            <ChatPanel messages={messages} />
          </div>
          <div className="h-[600px]">
            <BrowserView screenshot={screenshot} isLoading={isLoading} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}