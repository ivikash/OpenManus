import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  type: 'user' | 'system' | 'error';
  timestamp: string;
}

interface ChatPanelProps {
  messages: Message[];
}

export function ChatPanel({ messages }: ChatPanelProps) {
  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[420px] px-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-lg p-3",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto max-w-[80%]" 
                      : message.type === 'error'
                      ? "bg-destructive text-destructive-foreground max-w-[80%]"
                      : "bg-muted max-w-[80%]"
                  )}
                >
                  <div className="text-xs opacity-70 mb-1">{message.timestamp}</div>
                  <div className="text-sm">{message.text}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}