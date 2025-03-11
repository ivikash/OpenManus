const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a temporary directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-use-test-'));
console.log(`Created temp directory: ${tempDir}`);

// Create a simple Python script to test browser-use
const scriptPath = path.join(tempDir, 'browser_use_test.py');
const scriptContent = `
import asyncio
import json
import sys
import os
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

log_message("Python script started")
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
        # Initialize the Ollama LLM
        log_message("Initializing Ollama LLM with model: llama3.2")
        llm = ChatOllama(
            model="llama3.2",
            num_ctx=32000,
        )
        
        log_message("Creating Agent with task: Go to google.com and search for 'browser-use python library'")
        # Create the agent with proper callbacks
        agent = Agent(
            task="Go to google.com and search for 'browser-use python library'",
            llm=llm,
            use_vision=True,
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
        import traceback
        log_message(f"Error: {str(e)}", "error")
        log_message(f"Traceback: {traceback.format_exc()}", "error")
        sys.exit(1)

if __name__ == "__main__":
    log_message("Starting main async function")
    asyncio.run(main())
    log_message("Main async function completed")
`;

fs.writeFileSync(scriptPath, scriptContent);
console.log(`Created browser-use test script at: ${scriptPath}`);

// Run the Python script
console.log('Starting Python process with browser-use...');
const pythonPath = '/Users/vikasagr/.pyenv/shims/python';
const pythonProcess = spawn(pythonPath, [scriptPath]);

pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`Python stdout: ${output}`);
    
    try {
        const jsonData = JSON.parse(output);
        console.log(`Parsed JSON: ${JSON.stringify(jsonData)}`);
    } catch (e) {
        console.log(`Not JSON: ${e.message}`);
    }
});

pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data.toString().trim()}`);
});

pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
});