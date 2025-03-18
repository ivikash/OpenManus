import { AutomationOptions, PromptSubmitPayload } from "@/types/automation";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validatePromptPayload(data: unknown): PromptSubmitPayload {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const payload = data as Partial<PromptSubmitPayload>;

  if (!payload.prompt || typeof payload.prompt !== 'string') {
    throw new ValidationError('Invalid payload: prompt must be a non-empty string');
  }

  if (!payload.options || typeof payload.options !== 'object') {
    throw new ValidationError('Invalid payload: options must be an object');
  }

  validateAutomationOptions(payload.options);

  return payload as PromptSubmitPayload;
}

export function validateAutomationOptions(options: Partial<AutomationOptions>): void {
  // Validate modelProvider
  if (!options.modelProvider || !['ollama', 'openai', 'bedrock'].includes(options.modelProvider)) {
    throw new ValidationError('Invalid options: modelProvider must be one of: ollama, openai, bedrock');
  }

  // Validate model
  if (!options.model || typeof options.model !== 'string') {
    throw new ValidationError('Invalid options: model must be a non-empty string');
  }

  // Validate browserType
  if (options.browserType && !['chromium', 'firefox', 'webkit'].includes(options.browserType)) {
    throw new ValidationError('Invalid options: browserType must be one of: chromium, firefox, webkit');
  }

  // Validate boolean fields
  if (options.useVision !== undefined && typeof options.useVision !== 'boolean') {
    throw new ValidationError('Invalid options: useVision must be a boolean');
  }

  if (options.headless !== undefined && typeof options.headless !== 'boolean') {
    throw new ValidationError('Invalid options: headless must be a boolean');
  }

  // Validate timeout
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number' || options.timeout < 0) {
      throw new ValidationError('Invalid options: timeout must be a positive number');
    }
  }

  // Validate AWS specific options for Bedrock
  if (options.modelProvider === 'bedrock') {
    if (!options.awsRegion) {
      throw new ValidationError('Invalid options: awsRegion is required for Bedrock provider');
    }
    if (typeof options.awsRegion !== 'string') {
      throw new ValidationError('Invalid options: awsRegion must be a string');
    }
  }
}
