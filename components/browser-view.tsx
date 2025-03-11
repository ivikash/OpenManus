import React from 'react';
import { Card, CardContent } from './ui/card';

interface BrowserViewProps {
  screenshot: string | null;
  isLoading: boolean;
}

export function BrowserView({ screenshot, isLoading }: BrowserViewProps) {
  return (
    <Card className="w-full h-full min-h-[400px] relative">
      <CardContent className="p-4">
        {isLoading && !screenshot && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        {screenshot && (
          <div className="w-full h-full">
            <img 
              src={`data:image/png;base64,${screenshot}`} 
              alt="Browser View" 
              className="w-full h-full object-contain"
            />
          </div>
        )}
        {!isLoading && !screenshot && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Browser view will appear here
          </div>
        )}
      </CardContent>
    </Card>
  );
}