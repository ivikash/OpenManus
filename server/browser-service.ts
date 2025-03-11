import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

  constructor() {
    super();
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-use-'));
  }

  async runAutomation(options: BrowserUseOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation is already running');
    }

    // Note: We're not using headless option as it's not supported by the Agent class
    // The browser will use the library's default behavior

    this.isRunning = true;
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

      // Run the Python script
      this.pythonProcess = spawn('python', [scriptPath]);

      this.pythonProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          try {
            // Try to parse as JSON first (for structured logs)
            const jsonData = JSON.parse(output);
            
            // Emit the raw output for the server to handle
            this.emit('pythonOutput', output);
            
            // Also emit as a log if it's a regular message
            if (jsonData.type !== 'screenshot') {
              this.emit('log', {
                id: Date.now().toString(),
                text: jsonData.message || JSON.stringify(jsonData),
                type: jsonData.type || 'system',
                timestamp: new Date().toLocaleTimeString(),
              });
            }
          } catch (e) {
            // If not JSON, emit as plain text
            this.emit('log', {
              id: Date.now().toString(),
              text: output,
              type: 'system',
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }
      });

      this.pythonProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        if (error) {
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
          
          if (code === 0) {
            this.emit('log', {
              id: Date.now().toString(),
              text: 'Automation completed successfully',
              type: 'system',
              timestamp: new Date().toLocaleTimeString(),
            });
            this.emit('complete', { success: true });
            resolve();
          } else {
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

  private generatePythonScript(options: BrowserUseOptions): string {
    const modelProvider = options.modelProvider || 'openai';
    
    if (modelProvider === 'ollama') {
      return `
import asyncio
import json
import sys
from langchain_ollama import ChatOllama
from browser_use import Agent
import base64
from PIL import Image
from io import BytesIO

# Setup logging function
def log_message(message, type="system"):
    print(json.dumps({
        "type": type,
        "message": message
    }))
    sys.stdout.flush()

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
        # Initialize the Ollama LLM
        llm = ChatOllama(
            model="${options.model || 'llama2'}",
            num_ctx=32000,
        )
        
        # Create the agent with proper callbacks
        agent = Agent(
            task="${options.task.replace(/"/g, '\\"')}",
            llm=llm,
            use_vision=${options.useVision !== false ? 'True' : 'False'},
            register_new_step_callback=new_step_callback,
            register_done_callback=done_callback
        )
        
        # Run the agent
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
        log_message(f"Error: {str(e)}", "error")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
`;
    } else {
      // Default to OpenAI
      return `
import asyncio
import json
import sys
from langchain_openai import ChatOpenAI
from browser_use import Agent
import base64
from PIL import Image
from io import BytesIO

# Setup logging function
def log_message(message, type="system"):
    print(json.dumps({
        "type": type,
        "message": message
    }))
    sys.stdout.flush()

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
        # Initialize the LLM
        llm = ChatOpenAI(
            model="${options.model || 'gpt-4o'}",
            temperature=0.0,
        )
        
        # Create the agent with proper callbacks
        agent = Agent(
            task="${options.task.replace(/"/g, '\\"')}",
            llm=llm,
            use_vision=${options.useVision !== false ? 'True' : 'False'},
            register_new_step_callback=new_step_callback,
            register_done_callback=done_callback
        )
        
        # Run the agent
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
        log_message(f"Error: {str(e)}", "error")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
`;
    }
  }
}