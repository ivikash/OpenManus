# OpenManus

A web application that allows users to input prompts, which are then used to run browser-use automations. The application displays the automation steps in a chat panel in real-time.

## Architecture

For detailed architecture information, including data flow diagrams and dependency chains, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### Frontend
- Next.js with React and TypeScript
- Shadcn UI components
- Real-time updates with WebSockets

### Backend
- Node.js WebSocket server
- Python automation service
- Integration with browser-use library

## Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- uv (optional, for faster Python package installation)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/browser-use-demo.git
cd browser-use-demo
```

2. Install Node.js dependencies
```bash
npm install
```

3. Install Python package
```bash
# Using uv (recommended)
pip install uv
cd python_agent
uv pip install -e .
cd ..

# Or using pip
cd python_agent
pip install -e .
cd ..
```

4. Create a `.env` file based on `.env.example`
```bash
cp .env.example .env
```

5. Update the `.env` file with your configuration
```
PORT=3001
OPENAI_API_KEY=your_openai_api_key_if_using_openai
```

## Running the Application

1. Start the FastAPI server
```bash
npm run server
```

2. In a separate terminal, start the frontend development server
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
├── python_agent/               # Python package for browser automation
│   ├── browser_automation_agent/
│   │   ├── __init__.py
│   │   ├── agent.py           # Main agent implementation
│   │   ├── cli.py             # Command-line interface
│   │   ├── server.py          # FastAPI server
│   │   ├── models.py          # Pydantic models
│   │   └── logger.py          # Logging utilities
│   ├── setup.py               # Package setup file
│   ├── pyproject.toml         # Python project configuration
│   └── requirements.txt       # Python dependencies
├── src/
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   └── lib/                   # Utility functions and libraries
├── public/                    # Static assets
└── .env                       # Environment variables
```

## Configuration Options

The application supports various configuration options that can be set from the frontend:

### Model Provider
- Ollama (local models)
- OpenAI (cloud models)
- AWS Bedrock (cloud models)

### Models
- For Ollama: llama3.2, llama3, llama2
- For OpenAI: gpt-4o, gpt-4-turbo, gpt-4
- For AWS Bedrock: Claude 3 (Sonnet, Haiku, Opus), Llama 3 70B

### Browser Options
- Vision capabilities (on/off)
- Headless mode (on/off)
- Browser type (chromium, firefox, webkit)

## Development

### Running in Debug Mode
```bash
npm run server:debug
```

### Code Quality
```bash
# Format Python code
cd python_agent
ruff format .

# Lint Python code
ruff check .

# Lint TypeScript/JavaScript code
npm run lint
```

### Commit Convention
This project uses conventional commits. Please follow the [commit convention](./COMMIT_CONVENTION.md).

## API Documentation

When running the FastAPI server, API documentation is available at:
- Swagger UI: http://localhost:3001/docs
- ReDoc: http://localhost:3001/redoc

## WebSocket API

The WebSocket API allows real-time communication between the client and server:

### Client to Server Events
- `prompt:submit`: Submit a prompt for automation
- `automation:stop`: Stop the current automation

### Server to Client Events
- `automation:log`: Log message from the automation
- `automation:complete`: Automation completed
- `automation:error`: Error in automation

## License
[MIT](./LICENSE)
