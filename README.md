# Browser Use Demo

A Next.js application demonstrating browser automation capabilities.

## Project Structure

The project follows a clean, organized structure with all code residing in the `src` directory:

```
src/
├── app/             # Next.js App Router components
├── components/      # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and services
├── pages/           # API routes (Pages Router)
├── providers/       # React context providers
└── server/          # Server-side code for browser automation
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. In a separate terminal, start the automation server:
   ```bash
   npm run server
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Browser automation with Python
- Real-time communication via Socket.io
- Live browser screenshots
- Model selection for AI-powered automation

## Development

This project uses:
- Next.js for the frontend
- TypeScript for type safety
- Socket.io for real-time communication
- Commitizen for standardized commit messages

## Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.
See [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md) for details.