import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Message {
  id: string;
  text: string;
  type: 'system' | 'user' | 'error';
  timestamp: string;
}

interface ChatPanelProps {
  messages: Message[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages }) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Automation Logs</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.type === 'system'
                  ? 'bg-secondary'
                  : message.type === 'error'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <div className="text-sm">{message.text}</div>
              <div className="text-xs mt-1 opacity-70">{message.timestamp}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
    </Card>
  );
};