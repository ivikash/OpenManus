export interface AutomationOptions {
  modelProvider: 'ollama' | 'openai' | 'bedrock';
  model: string;
  useVision: boolean;
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
  timeout?: number;
  awsRegion?: string;
  awsProfile?: string;
  additionalOptions?: Record<string, unknown>;
}

export interface PromptSubmitPayload {
  prompt: string;
  options: AutomationOptions;
}

export const DEFAULT_OPTIONS: Partial<AutomationOptions> = {
  modelProvider: 'ollama',
  model: 'deepseek-r1:8b',
  useVision: true,
  headless: true,
  browserType: 'chromium',
  timeout: 60000
};
