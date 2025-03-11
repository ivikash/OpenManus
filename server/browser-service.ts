import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import logger from './utils/logger';

interface BrowserUseOptions {
  task: string;
  model?: string;
  useVision?: boolean;
  modelProvider?: string;
  apiKey?: string;
}

export class BrowserUseService extends EventEmitter {
  private pythonProcess: any = null;
  private isRunning = false;
  private tempDir: string;
  private serviceId: string;

  constructor() {
    super();
    this.serviceId = Math.random().toString(36).substring(2, 10);
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-use-'));
    logger.debug(`BrowserUseService created`, { 
      metadata: { 
        serviceId: this.serviceId,
        tempDir: this.tempDir 
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

    // Note: We're not using headless option as it's not supported by the Agent class
    // The browser will use the library's default behavior

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
    const model = options.model || (modelProvider === 'ollama' ? 'llama3.2' : 'gpt-4o');
    
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
      // Create a temporary Python script
      const scriptPath = path.join(this.tempDir, 'agent.py');
      const scriptContent = this.generatePythonScript(options);
      fs.writeFileSync(scriptPath, scriptContent);
      logger.debug(`Created Python script at ${scriptPath}`, { 
        metadata: { 
          serviceId: this.serviceId,
          scriptLength: scriptContent.length
        } 
      });

      // Run the Python script
      const pythonPath = '/Users/vikasagr/.pyenv/shims/python';
      logger.debug(`Starting Python process with command: ${pythonPath} ${scriptPath}`, {
        metadata: {
          serviceId: this.serviceId,
          pythonPath,
          scriptPath,
          timestamp: new Date().toISOString()
        }
      });
      
      // Set environment variables for the Python process
      const env = {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Force Python to run unbuffered
        BROWSER_USE_LOG_LEVEL: 'DEBUG'
      };
      
      this.pythonProcess = spawn(pythonPath, [scriptPath], { env });
      
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
            } catch (e) {
              // If parsing fails, emit as plain text
              logger.debug(`Failed to parse Python output line as JSON`, { 
                metadata: { 
                  serviceId: this.serviceId,
                  error: e instanceof Error ? e.message : String(e),
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

  /**
   * Generates a Python script for browser automation based on the provided options.
   * 
   * @param options - Configuration options for the browser automation
   * @returns A Python script as a string
   */
  private generatePythonScript(options: BrowserUseOptions): string {
    const modelProvider = options.modelProvider || 'ollama';
    // Escape the task string for Python triple quotes
    const escapedTask = options.task.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    return `#!/usr/bin/env python3
import asyncio
import json
import sys
import os
import traceback
import base64
from io import BytesIO

# First, print a simple message to confirm script execution
print("Python script starting...")
sys.stdout.flush()

try:
    ${modelProvider === 'ollama' 
      ? 'from langchain_ollama import ChatOllama' 
      : 'from langchain_openai import ChatOpenAI'}
    from browser_use import Agent
    from PIL import Image
    
    # Setup logging function
    def log_message(message, type="system"):
        print(json.dumps({
            "type": type,
            "message": message
        }))
        sys.stdout.flush()
    
    log_message("Python script started${modelProvider === 'ollama' ? '' : ' with OpenAI'}")
    log_message(f"Current working directory: {os.getcwd()}")
    log_message(f"Python version: {sys.version}")
    
    # Define callback functions for the Agent
    async def new_step_callback(browser_state, agent_output, step_number):
        log_message(f"Step {step_number}: {agent_output.action_description if hasattr(agent_output, 'action_description') else 'Processing...'}")
        
        # Capture and send screenshot if browser state is available
        if browser_state and hasattr(browser_state, 'page'):
            try:
                screenshot = await browser_state.page.screenshot()
                # Convert screenshot to base64
                img = Image.open(BytesIO(screenshot))
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                img_str = base64.b64encode(buffered.getvalue()).decode()
                
                # Send screenshot data
                print(json.dumps({
                    "type": "screenshot",
                    "data": img_str
                }))
                sys.stdout.flush()
            except Exception as e:
                log_message(f"Screenshot error: {str(e)}", "error")
    
    async def done_callback(history_list):
        log_message("Task completed")
    
    async def main():
        try:
            # Initialize the ${modelProvider === 'ollama' ? 'Ollama LLM' : 'LLM'}
            log_message("Initializing ${modelProvider === 'ollama' ? 'Ollama' : 'OpenAI'} with model: ${options.model || (modelProvider === 'ollama' ? 'llama3.2' : 'gpt-4o')}")
            llm = ${modelProvider === 'ollama' ? 'ChatOllama' : 'ChatOpenAI'}(
                model="${options.model || (modelProvider === 'ollama' ? 'llama3.2' : 'gpt-4o')}",
                ${modelProvider === 'ollama' ? 'num_ctx=32000,' : 'temperature=0.0,'}
            )
            
            task = """${escapedTask}"""
            log_message(f"Creating Agent with task: {task}")
            
            # Create the agent with proper callbacks
            agent = Agent(
                task=task,
                llm=llm,
                use_vision=${options.useVision !== false ? 'True' : 'False'},
                register_new_step_callback=new_step_callback,
                register_done_callback=done_callback
            )
            
            # Run the agent
            log_message("Running the agent...")
            result = await agent.run()
            
            # Print the final result
            if hasattr(result, 'final_result') and callable(result.final_result):
                final_result = result.final_result()
                if final_result:
                    log_message(f"Final result: {final_result}", "result")
            
            # Print visited URLs
            if hasattr(result, 'urls') and callable(result.urls):
                urls = result.urls()
                if urls:
                    log_message(f"Visited URLs: {', '.join(urls)}", "urls")
        
        except Exception as e:
            log_message(f"Error in main: {str(e)}", "error")
            log_message(f"Traceback: {traceback.format_exc()}", "error")
            sys.exit(1)
    
    if __name__ == "__main__":
        log_message("Starting main async function")
        asyncio.run(main())
        log_message("Main async function completed")
except Exception as e:
    print(f"CRITICAL ERROR: {str(e)}")
    print(f"TRACEBACK: {traceback.format_exc()}")
    sys.stdout.flush()
    sys.exit(1)
`;
  }
}