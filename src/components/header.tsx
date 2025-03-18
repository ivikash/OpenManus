'use client';

import React from 'react';

export const Header = () => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-md w-9 h-9 flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            OM
          </div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Open Manus</h1>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Automation with AI
        </div>
      </div>
    </header>
  );
};

export default Header;
