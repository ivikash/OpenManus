import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded-md w-8 h-8 flex items-center justify-center text-primary-foreground font-bold">
            BU
          </div>
          <h1 className="text-xl font-bold">Browser Use Demo</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Browser Automation with AI
        </div>
      </div>
    </header>
  );
};