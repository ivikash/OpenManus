# OpenManus

OpenManus is a web application that allows users to control browser automation using natural language prompts. It leverages the browser-use library to enable AI-powered browser interactions.

## Features

- Natural language prompt input for browser automation
- Real-time logging of automation steps
- Clean, modern UI built with React and Shadcn UI
- WebSocket-based communication for real-time updates

## Architecture

### Frontend
- Next.js with React and TypeScript
- Shadcn UI components
- Socket.IO client for real-time communication

### Backend
- Express server
- Socket.IO for WebSocket communication
- Integration with browser-use for browser automation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An OpenAI API key for the browser-use library

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and add your OpenAI API key:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file and add your OpenAI API key

### Running the Application

1. Start the backend server:
   ```bash
   npm run server
   ```

2. In a separate terminal, start the frontend:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter a natural language prompt describing what you want the browser to do
2. Click "Run Automation" to start the process
3. Watch the automation logs in real-time as the browser performs the requested tasks

## Project Structure

```
/
├── app/                  # Next.js app directory
├── components/           # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and services
├── pages/                # Next.js pages (API routes)
├── public/               # Static assets
└── server/               # Backend server code
```

## License

MIT