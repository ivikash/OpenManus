/**
 * Types for browser automation
 */

export interface AutomationOptions {
  // Core options
  task: string;
  model?: string;
  useVision?: boolean;
  modelProvider?: string;
  apiKey?: string;
  
  // Browser options
  headless?: boolean;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  timeout?: number;
  
  // AWS Bedrock options
  awsRegion?: string;
  awsProfile?: string;
  
  // Additional options that can be passed to the browser-use agent
  additionalOptions?: Record<string, unknown>;
}

export interface LogMessage {
  id: string;
  text: string;
  type: string;
  timestamp: string;
}

export interface AutomationResult {
  success: boolean;
  stopped?: boolean;
  message?: string;
}

export interface PromptSubmission {
  prompt: string;
  options?: Partial<AutomationOptions>;
}
