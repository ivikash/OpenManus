'use client';

import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import logger from '@/lib/logger';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logger.info('Application initialized', {
      metadata: {
        userAgent: navigator.userAgent,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
      }
    });
    
    // Log errors
    const handleError = (event: ErrorEvent) => {
      logger.error(`Unhandled error: ${event.message}`, {
        metadata: {
          stack: event.error?.stack,
          source: event.filename,
          line: event.lineno,
          column: event.colno
        }
      });
    };
    
    // Add event listeners
    window.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
