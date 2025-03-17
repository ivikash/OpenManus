/**
 * Frontend logger utility
 * 
 * This module provides a consistent logging interface for the frontend
 * with different log levels and the ability to send logs to the server.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

interface LogOptions {
  // Additional metadata to include with the log
  metadata?: Record<string, unknown>;
  // Whether to send this log to the server
  sendToServer?: boolean;
}

// Get log level from environment or default to 'info' in production, 'debug' in development
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || DEFAULT_LOG_LEVEL;

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

// Check if the current log level should be displayed
const shouldLog = (level: LogLevel): boolean => {
  const configuredLevel = LOG_LEVEL as LogLevel;
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
};

// Format the log message with timestamp and level
const formatLogMessage = (level: LogLevel, message: string, options?: LogOptions): string => {
  const timestamp = new Date().toISOString();
  let metadata = '';
  if (options?.metadata) {
    try {
      // Handle WebSocket error objects specially
      if (options.metadata.error instanceof Error) {
        metadata = ` {"error": "${options.metadata.error.message}"}`;
      } else {
        metadata = ` ${JSON.stringify(options.metadata)}`;
      }
    } catch (err) {
      metadata = ` {"error": "Error stringifying metadata"}`;
    }
  }
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadata}`;
};

// Send log to server if needed
const sendLogToServer = (level: LogLevel, message: string, options?: LogOptions): void => {
  if (options?.sendToServer && typeof window !== 'undefined') {
    try {
      // This could be implemented with a fetch call to your API
      // or through a socket connection
      const logData = {
        level,
        message,
        timestamp: new Date().toISOString(),
        metadata: options.metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      // Example implementation - replace with your actual server logging endpoint
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logData),
      // }).catch(err => console.error('Failed to send log to server:', err));
      
      // For now, we'll just console log that we would send this to server
      console.debug('Would send to server:', logData);
    } catch (error) {
      console.error('Error sending log to server:', error);
    }
  }
};

// Create logger functions for each level
const createLogger = (level: LogLevel) => {
  return (message: string, options?: LogOptions): void => {
    if (!shouldLog(level)) return;
    
    const formattedMessage = formatLogMessage(level, message, options);
    
    // Log to console with appropriate method
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
      case 'trace':
      default:
        console.debug(formattedMessage);
        break;
    }
    
    // Send to server if requested
    sendLogToServer(level, message, options);
  };
};

// Export the logger functions
const logger = {
  trace: createLogger('trace'),
  debug: createLogger('debug'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  
  // Helper to log with component context
  component: (componentName: string) => ({
    trace: (message: string, options?: LogOptions) => 
      logger.trace(`[${componentName}] ${message}`, options),
    debug: (message: string, options?: LogOptions) => 
      logger.debug(`[${componentName}] ${message}`, options),
    info: (message: string, options?: LogOptions) => 
      logger.info(`[${componentName}] ${message}`, options),
    warn: (message: string, options?: LogOptions) => 
      logger.warn(`[${componentName}] ${message}`, options),
    error: (message: string, options?: LogOptions) => 
      logger.error(`[${componentName}] ${message}`, options),
  }),
};

export default logger;
