import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import logger from './utils/logger';
import { AutomationOptions } from './types/automation';

// Re-export the types for convenience
export { AutomationOptions };

// Internal interface used by the service
interface BrowserUseOptions {
  task: string;
  model?: string;
  useVision?: boolean;
  modelProvider?: string;
  apiKey?: string;
  headless?: boolean;
  browserType?: string;
  timeout?: number;
  awsRegion?: string;
  awsProfile?: string;
  additionalOptions?: Record<string, unknown>;
}

export class BrowserUseService extends EventEmitter {
  private pythonProcess: ReturnType<typeof spawn> | null = null;
  private isRunning = false;
  private serviceId: string;

  constructor() {
    super();
    this.serviceId = Math.random().toString(36).substring(2, 10);
    logger.debug(`BrowserUseService created`, { 
      metadata: { 
        serviceId: this.serviceId
      } 
    });
  }

  async runAutomation(options: BrowserUseOptions): Promise<void> {
    if (this.isRunning) {
      logger.warn(`Automation already running`, { 
        metadata: { 
          serviceId: this.serviceId 
        } 
      });
      throw new Error('Automation is already running');
    }

    this.isRunning = true;
    logger.info(`Starting automation`, { 
      metadata: { 
        serviceId: this.serviceId,
        task: options.task,
        model: options.model,
        useVision: options.useVision,
        modelProvider: options.modelProvider,
        timestamp: new Date().toISOString()
      } 
    });
    
    // Log detailed options for debugging
    const modelProvider = options.modelProvider || 'ollama';
    const model = options.model || (modelProvider === 'ollama' ? 'deepseek-r1:8b' : 'gpt-4o');
    
    logger.debug(`Automation options details`, {
      metadata: {
        serviceId: this.serviceId,
        task: options.task,
        modelProvider,
        model,
        useVision: options.useVision !== false,
        apiKeyProvided: !!options.apiKey,
        timestamp: new Date().toISOString()
      }
    });
    
    this.emit('log', {
      id: Date.now().toString(),
      text: `Starting automation with task: "${options.task}"`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      // Prepare command line arguments for the Python package
      const args = [
        '--task', options.task,
        '--model-provider', modelProvider,
        '--model-name', model
      ];
      
      // Add optional arguments
      if (options.useVision === false) {
        args.push('--no-vision');
      }
      
      if (options.apiKey) {
        args.push('--api-key', options.apiKey);
      }
      
      // Add headless mode argument
      if (options.headless !== undefined) {
        args.push(options.headless ? '--headless' : '--no-headless');
      }
      
      if (options.browserType) {
        args.push('--browser-type', options.browserType);
      }
      
      if (options.timeout) {
        args.push('--timeout', options.timeout.toString());
      }
      
      // Add AWS Bedrock specific options
      if (modelProvider === 'bedrock') {
        if (options.awsRegion) {
          args.push('--aws-region', options.awsRegion);
        }
        
        if (options.awsProfile) {
          args.push('--aws-profile', options.awsProfile);
        }
      }
      
      // Add logging options
      args.push('--log-level', 'INFO');
      
      // Set environment variables for the Python process
      const env = {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Force Python to run unbuffered
        BROWSER_USE_LOG_LEVEL: 'DEBUG',
        OPENAI_API_KEY: ''
      };
      
      // If using OpenAI and no API key was provided as an argument, try to use the one from env
      if (modelProvider === 'openai' && !options.apiKey && process.env.OPENAI_API_KEY) {
        env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      }
      
      logger.debug(`Starting browser-agent with arguments`, {
        metadata: {
          serviceId: this.serviceId,
          args: args.join(' '),
          timestamp: new Date().toISOString()
        }
      });
      
      // Start the Python process using the browser-agent CLI
      this.pythonProcess = spawn('browser-agent', args, { env });
      
      if (!this.pythonProcess || !this.pythonProcess.pid) {
        throw new Error('Failed to start Python process');
      }
      
      logger.debug(`Started Python process`, { 
        metadata: { 
          serviceId: this.serviceId,
          pid: this.pythonProcess.pid,
          timestamp: new Date().toISOString()
        } 
      });

      this.pythonProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          // First log the raw output for debugging
          logger.debug(`Raw Python stdout:`, { 
            metadata: { 
              serviceId: this.serviceId,
              output: output.substring(0, 500) + (output.length > 500 ? '...' : ''),
              timestamp: new Date().toISOString()
            } 
          });
          
          // Process each line separately as Python might output multiple JSON objects
          const lines = output.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              // Try to parse as JSON
              if (line.trim().startsWith('{')) {
                const jsonData = JSON.parse(line.trim());
                
                // Log the parsed data for debugging
                logger.debug(`Parsed Python JSON output`, {
                  metadata: {
                    serviceId: this.serviceId,
                    type: jsonData.type,
                    hasMessage: !!jsonData.message,
                    hasData: !!jsonData.data,
                    timestamp: new Date().toISOString()
                  }
                });
                
                // Emit the raw output for the server to handle
                this.emit('pythonOutput', line.trim());
                
                // Also emit as a log if it's a regular message
                if (jsonData.type !== 'screenshot') {
                  this.emit('log', {
                    id: Date.now().toString(),
                    text: jsonData.message || JSON.stringify(jsonData),
                    type: jsonData.type || 'system',
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              } else {
                // Handle non-JSON output (like browser-use logs)
                logger.debug(`Non-JSON Python output`, { 
                  metadata: { 
                    serviceId: this.serviceId,
                    line: line.trim(),
                    timestamp: new Date().toISOString()
                  } 
                });
                
                this.emit('log', {
                  id: Date.now().toString(),
                  text: line.trim(),
                  type: 'debug',
                  timestamp: new Date().toLocaleTimeString(),
                });
              }
            } catch (error) {
              // If parsing fails, emit as plain text
              logger.debug(`Failed to parse Python output line as JSON`, { 
                metadata: { 
                  serviceId: this.serviceId,
                  error: error instanceof Error ? error.message : String(error),
                  line: line.trim(),
                  timestamp: new Date().toISOString()
                } 
              });
              
              this.emit('log', {
                id: Date.now().toString(),
                text: line.trim(),
                type: 'system',
                timestamp: new Date().toLocaleTimeString(),
              });
            }
          }
        }
      });

      this.pythonProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        if (error) {
          logger.error(`Python process error`, { 
            metadata: { 
              serviceId: this.serviceId,
              error,
              timestamp: new Date().toISOString()
            } 
          });
          
          this.emit('log', {
            id: Date.now().toString(),
            text: `Error: ${error}`,
            type: 'error',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      });

      return new Promise((resolve, reject) => {
        if (!this.pythonProcess) {
          reject(new Error('Python process not initialized'));
          return;
        }
        
        this.pythonProcess.on('close', (code: number) => {
          this.isRunning = false;
          logger.info(`Python process exited with code ${code}`, { 
            metadata: { 
              serviceId: this.serviceId,
              exitCode: code,
              timestamp: new Date().toISOString()
            } 
          });
          
          if (code === 0) {
            logger.info(`Automation completed successfully`, {
              metadata: {
                serviceId: this.serviceId,
                timestamp: new Date().toISOString()
              }
            });
            
            this.emit('log', {
              id: Date.now().toString(),
              text: 'Automation completed successfully',
              type: 'system',
              timestamp: new Date().toLocaleTimeString(),
            });
            this.emit('complete', { success: true });
            resolve();
          } else {
            logger.error(`Automation failed with exit code: ${code}`, {
              metadata: {
                serviceId: this.serviceId,
                exitCode: code,
                timestamp: new Date().toISOString()
              }
            });
            
            this.emit('log', {
              id: Date.now().toString(),
              text: `Automation failed with exit code: ${code}`,
              type: 'error',
              timestamp: new Date().toLocaleTimeString(),
            });
            this.emit('complete', { success: false });
            reject(new Error(`Process exited with code ${code}`));
          }
        });
      });
    } catch (error) {
      this.isRunning = false;
      logger.error(`Error in runAutomation`, {
        metadata: {
          serviceId: this.serviceId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        }
      });
      
      this.emit('log', {
        id: Date.now().toString(),
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
        timestamp: new Date().toLocaleTimeString(),
      });
      this.emit('complete', { success: false });
      throw error;
    }
  }

  stopAutomation(): void {
    if (this.pythonProcess && this.isRunning) {
      logger.info(`Stopping automation`, { 
        metadata: { 
          serviceId: this.serviceId,
          pid: this.pythonProcess.pid
        } 
      });
      
      this.pythonProcess.kill();
      this.isRunning = false;
      this.emit('log', {
        id: Date.now().toString(),
        text: 'Automation stopped by user',
        type: 'system',
        timestamp: new Date().toLocaleTimeString(),
      });
      this.emit('complete', { success: false, stopped: true });
    }
  }
}
