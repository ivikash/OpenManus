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
            this.emit('log', {
              id: Date.now().toString(),
              text: jsonData.message || JSON.stringify(jsonData),
              type: jsonData.type || 'system',
              timestamp: new Date().toLocaleTimeString(),
            });
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

# Custom event handler for logging
class EventHandler:
    def __call__(self, event):
        # Format the event as JSON for structured logging
        if isinstance(event, dict):
            print(json.dumps({
                "type": "system",
                "message": event.get("message", str(event))
            }))
        else:
            print(json.dumps({
                "type": "system",
                "message": str(event)
            }))
        sys.stdout.flush()

async def main():
    try:
        # Initialize the Ollama LLM
        llm = ChatOllama(
            model="${options.model || 'llama3.2'}",
            num_ctx=32000,
        )
        
        # Create the agent
        agent = Agent(
            task="${options.task.replace(/"/g, '\\"')}",
            llm=llm,
            use_vision=${options.useVision !== false ? 'True' : 'False'},
            onEvent=EventHandler()
        )
        
        # Run the agent
        result = await agent.run()
        
        # Print the final result
        if result.final_result():
            print(json.dumps({
                "type": "result",
                "message": f"Final result: {result.final_result()}"
            }))
        
        # Print visited URLs
        urls = result.urls()
        if urls:
            print(json.dumps({
                "type": "urls",
                "message": f"Visited URLs: {', '.join(urls)}"
            }))
    
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": f"Error: {str(e)}"
        }))
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

# Custom event handler for logging
class EventHandler:
    def __call__(self, event):
        # Format the event as JSON for structured logging
        if isinstance(event, dict):
            print(json.dumps({
                "type": "system",
                "message": event.get("message", str(event))
            }))
        else:
            print(json.dumps({
                "type": "system",
                "message": str(event)
            }))
        sys.stdout.flush()

async def main():
    try:
        # Initialize the LLM
        llm = ChatOpenAI(
            model="${options.model || 'gpt-4o'}",
            temperature=0.0,
        )
        
        # Create the agent
        agent = Agent(
            task="${options.task.replace(/"/g, '\\"')}",
            llm=llm,
            use_vision=${options.useVision !== false ? 'True' : 'False'},
            onEvent=EventHandler()
        )
        
        # Run the agent
        result = await agent.run()
        
        # Print the final result
        if result.final_result():
            print(json.dumps({
                "type": "result",
                "message": f"Final result: {result.final_result()}"
            }))
        
        # Print visited URLs
        urls = result.urls()
        if urls:
            print(json.dumps({
                "type": "urls",
                "message": f"Visited URLs: {', '.join(urls)}"
            }))
    
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": f"Error: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
`;
    }
  }
}