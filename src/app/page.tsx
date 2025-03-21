'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/footer';
import { ChatPanel } from '@/components/chat-panel';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent } from '@/components/ui/card';

// Dynamically import components that might cause hydration issues
const Header = dynamic(() => import('@/components/header').then(mod => ({ default: mod.Header })), { ssr: true });
const PromptForm = dynamic(() => import('@/components/prompt-form').then(mod => ({ default: mod.default })), { ssr: true });

interface Message {
  id: string;
  text: string;
  type: 'system' | 'user' | 'error';
  timestamp: string;
}

interface PromptOptions {
  model: string;
  modelProvider: string;
}

export default function Home() {
  const { isConnected, sendMessage, on } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration issues by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
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

    // Register event listeners using the new 'on' method
    const unsubscribeLog = on('automation:log', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    const unsubscribeComplete = on('automation:complete', () => {
      setIsLoading(false);
    });

    const unsubscribeError = on('automation:error', (error: { message: string }) => {
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

    // Clean up listeners when component unmounts
    return () => {
      unsubscribeLog();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [isConnected, on]);

  const handleSubmitPrompt = (prompt: string, options?: PromptOptions) => {
    if (!isConnected) {
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

    // Add user prompt to messages
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `Starting automation with prompt: "${prompt}"`,
        type: 'user',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setIsLoading(true);
    sendMessage('prompt:submit', { 
      prompt, 
      options: {
        model: options?.model || 'deepseek-r1:8b',
        modelProvider: options?.modelProvider || 'ollama'
      }
    });
  };

  // Don't render until client-side to prevent hydration issues
  if (!isMounted) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <PromptForm 
                  // onSubmit={handleSubmitPrompt} 
                  // isLoading={isLoading} 
                  // isDisabled={!isConnected}
                />
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
          </div>
          <div className="h-[600px] flex flex-col">
            <ChatPanel messages={messages} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
