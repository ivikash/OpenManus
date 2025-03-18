import { validatePromptPayload, validateAutomationOptions, ValidationError } from '../utils/validation';
import { AutomationOptions, PromptSubmitPayload } from '../types/automation';

describe('Validation Tests', () => {
  describe('validatePromptPayload', () => {
    it('should validate a correct payload', () => {
      const payload: PromptSubmitPayload = {
        prompt: 'Test prompt',
        options: {
          modelProvider: 'ollama',
          model: 'llama3.2',
          useVision: true,
          headless: true,
          browserType: 'chromium'
        }
      };

      expect(() => validatePromptPayload(payload)).not.toThrow();
    });

    it('should throw on missing prompt', () => {
      const payload = {
        options: {
          modelProvider: 'ollama',
          model: 'llama3.2',
          useVision: true,
          headless: true,
          browserType: 'chromium'
        }
      };

      expect(() => validatePromptPayload(payload)).toThrow(ValidationError);
    });

    it('should throw on missing options', () => {
      const payload = {
        prompt: 'Test prompt'
      };

      expect(() => validatePromptPayload(payload)).toThrow(ValidationError);
    });
  });

  describe('validateAutomationOptions', () => {
    it('should validate correct options', () => {
      const options: AutomationOptions = {
        modelProvider: 'ollama',
        model: 'llama3.2',
        useVision: true,
        headless: true,
        browserType: 'chromium'
      };

      expect(() => validateAutomationOptions(options)).not.toThrow();
    });

    it('should throw on invalid modelProvider', () => {
      const options = {
        modelProvider: 'invalid',
        model: 'llama3.2',
        useVision: true,
        headless: true,
        browserType: 'chromium'
      };

      expect(() => validateAutomationOptions(options as AutomationOptions)).toThrow(ValidationError);
    });

    it('should throw on invalid browserType', () => {
      const options = {
        modelProvider: 'ollama',
        model: 'llama3.2',
        useVision: true,
        headless: true,
        browserType: 'invalid'
      };

      expect(() => validateAutomationOptions(options as AutomationOptions)).toThrow(ValidationError);
    });

    it('should throw on invalid timeout', () => {
      const options = {
        modelProvider: 'ollama',
        model: 'llama3.2',
        useVision: true,
        headless: true,
        browserType: 'chromium',
        timeout: -1
      };

      expect(() => validateAutomationOptions(options as AutomationOptions)).toThrow(ValidationError);
    });

    it('should require awsRegion for Bedrock provider', () => {
      const options = {
        modelProvider: 'bedrock',
        model: 'claude3',
        useVision: true,
        headless: true,
        browserType: 'chromium'
      };

      expect(() => validateAutomationOptions(options as AutomationOptions)).toThrow(ValidationError);
    });

    it('should validate Bedrock options correctly', () => {
      const options = {
        modelProvider: 'bedrock',
        model: 'claude3',
        useVision: true,
        headless: true,
        browserType: 'chromium',
        awsRegion: 'us-east-1'
      };

      expect(() => validateAutomationOptions(options as AutomationOptions)).not.toThrow();
    });
  });
});
