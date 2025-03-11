import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface BrowserViewProps {
  screenshot: string | null;
  isLoading: boolean;
}

export function BrowserView({ screenshot, isLoading }: BrowserViewProps) {
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardContent className="p-4 h-full flex items-center justify-center">
        {isLoading && !screenshot ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : screenshot ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={`data:image/png;base64,${screenshot}`} 
              alt="Browser View" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="text-muted-foreground text-xl font-medium">
            Browser view will appear here!!!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
