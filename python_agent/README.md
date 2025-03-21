# Browser Automation Agent

A Python package for browser automation using the browser-use library, designed to work with the OpenManus project.

## Installation

```bash
# Install development dependencies
pip install uv

# Install the package with uv
cd python_agent
uv pip install -e .

# Or install with pip
pip install -e .
```

## Usage

### FastAPI Server

The easiest way to use the browser automation agent is through the FastAPI server:

```bash
# Start the server
browser-agent-server

# Or with custom port
PORT=8000 browser-agent-server

# Or with debug logging
LOG_LEVEL=DEBUG browser-agent-server
```

The server provides:
- WebSocket endpoint at `/ws/{client_id}` for real-time communication
- REST API endpoints at `/api/health` and `/api/clients`
- Static file serving for the frontend

### Command Line Interface

You can also use the browser automation agent directly from the command line:

```bash
# Basic usage with Ollama (default)
browser-agent --task "Search for Python tutorials on Google"

# Using OpenAI
browser-agent --task "Search for Python tutorials on Google" --model-provider openai --api-key your_api_key

# Using AWS Bedrock with Claude
browser-agent --task "Search for Python tutorials on Google" --model-provider bedrock --model-name anthropic.claude-3-sonnet-20240229-v1:0 --aws-region us-east-1

# Disable vision capabilities
browser-agent --task "Search for Python tutorials on Google" --no-vision

# Run with visible browser
browser-agent --task "Search for Python tutorials on Google" --no-headless

# Use a specific browser type
browser-agent --task "Search for Python tutorials on Google" --browser-type firefox

# Set logging level and log file
browser-agent --task "Search for Python tutorials on Google" --log-level DEBUG --log-file ./browser_agent.log
```

### Python API

```python
import asyncio
from browser_automation_agent import BrowserAutomationAgent, ModelProvider

async def main():
    # Using Ollama
    agent = BrowserAutomationAgent(
        task="Search for Python tutorials on Google",
        model_provider=ModelProvider.OLLAMA,
        model_name="llama3.2",
        use_vision=True,
        headless=True
    )
    
    # Using OpenAI
    # agent = BrowserAutomationAgent(
    #     task="Search for Python tutorials on Google",
    #     model_provider=ModelProvider.OPENAI,
    #     model_name="gpt-4o",
    #     api_key="your-openai-api-key",
    #     use_vision=True
    # )
    
    # Using AWS Bedrock
    # agent = BrowserAutomationAgent(
    #     task="Search for Python tutorials on Google",
    #     model_provider=ModelProvider.BEDROCK,
    #     model_name="anthropic.claude-3-sonnet-20240229-v1:0",
    #     aws_region="us-east-1",
    #     aws_profile="default",  # Optional
    #     use_vision=True
    # )
    
    result = await agent.run()
    print("Automation completed")

if __name__ == "__main__":
    asyncio.run(main())
```

## Development

### Code Quality

This project uses:
- `ruff` for linting and formatting
- `uv` for dependency management

```bash
# Install development tools
pip install ruff uv

# Format code
ruff format .

# Lint code
ruff check .

# Install dependencies with uv
uv pip install -e .
```

## WebSocket API

The WebSocket API allows real-time communication between the client and server:

### Client to Server Events

- `prompt:submit`: Submit a prompt for automation
  ```json
  {
    "event": "prompt:submit",
    "data": {
      "prompt": "Search for Python tutorials",
      "options": {
        "modelProvider": "ollama",
        "model": "llama3.2",
        "useVision": true,
        "headless": true,
        "browserType": "chromium",
        "awsRegion": "us-east-1"
      }
    }
  }
  ```

- `automation:stop`: Stop the current automation
  ```json
  {
    "event": "automation:stop",
    "data": {}
  }
  ```

### Server to Client Events

- `automation:log`: Log message from the automation
  ```json
  {
    "event": "automation:log",
    "data": {
      "id": "123",
      "text": "Step 1: Opening Google search page",
      "type": "step",
      "timestamp": "12:34:56"
    }
  }
  ```

- `automation:complete`: Automation completed
  ```json
  {
    "event": "automation:complete",
    "data": {
      "success": true,
      "message": "Automation completed successfully"
    }
  }
  ```

- `automation:error`: Error in automation
  ```json
  {
    "event": "automation:error",
    "data": {
      "message": "Error message"
    }
  }
  ```

## Model Provider Details

### Ollama

Ollama provides local LLM execution. You need to have Ollama installed and running on your machine.

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull llama3.2

# Run the agent with Ollama
browser-agent --task "Search for Python tutorials" --model-provider ollama --model-name llama3.2
```

### OpenAI

OpenAI provides cloud-based LLMs. You need an API key from OpenAI.

```bash
# Set API key in environment
export OPENAI_API_KEY=your-api-key

# Run the agent with OpenAI
browser-agent --task "Search for Python tutorials" --model-provider openai --model-name gpt-4o
```

### AWS Bedrock

AWS Bedrock provides access to various foundation models. You need AWS credentials with Bedrock access.

```bash
# Configure AWS credentials
aws configure

# Run the agent with AWS Bedrock
browser-agent --task "Search for Python tutorials" --model-provider bedrock --model-name anthropic.claude-3-sonnet-20240229-v1:0
```
