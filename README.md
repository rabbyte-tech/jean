# AI Agent Server

A monorepo for building and deploying AI agent applications with a modern tech stack.

## Tech Stack

### Server
- **Hono**: Fast and lightweight web framework for building web servers
- **AI SDK**: Built-in support for AI models and tool integration
- **SQLite**: Embedded database for local persistence

### Client
- **React 19**: Latest React version with improved performance
- **Vite**: Next-generation frontend tooling
- **Tailwind CSS**: Utility-first CSS framework

## Structure

```
ai-agent-server/
├── packages/
│   ├── server/          # Backend API server
│   ├── client/          # Frontend React application
│   └── shared/          # Shared types and utilities
└── tools/               # Build and development scripts
```

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0

### Installation

```bash
npm install
```

### Development

Run all services in development mode:

```bash
npm run dev
```

Run specific service:

```bash
# Server only
npm run dev:server

# Client only
npm run dev:client
```

### Build

Build all packages:

```bash
npm run build
```

Build specific package:

```bash
npm run build:server
npm run build:client
```

### Clean

Remove all build artifacts:

```bash
npm run clean
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `SERVER_HOST`: Server host address
- `SERVER_PORT`: Server port
- `DATABASE_PATH`: SQLite database file path
- `AI_MODEL`: AI model to use (e.g., gpt-4o-mini)
- `AI_TEMPERATURE`: Response temperature
- `AI_MAX_TOKENS`: Maximum token limit
- `TOOL_TIMEOUT_MS`: Default tool timeout
- `CORS_ORIGIN`: CORS allowed origins

## API Endpoints

Once the server is running:

- `GET /` - Server status and info
- `GET /health` - Health check
- `GET /api/v1` - API overview
- `GET /api/v1/agents` - Agent management
- `GET /api/v1/tools` - Tool listing
- `GET /api/v1/sessions` - Session management

## Project Structure

### Server

- `src/index.ts` - Entry point
- `src/app.ts` - Hono app configuration
- `src/routes/` - API route handlers
- `src/core/` - Core agent logic
- `src/tools/` - Tool definitions
- `src/store/` - SQLite database layer
- `src/types/` - Shared types

### Client

- `src/main.tsx` - Application entry point
- `src/App.tsx` - Main application component
- `src/components/` - React components
- `src/pages/` - Page components
- `src/hooks/` - Custom hooks
- `src/utils/` - Utility functions

### Shared

- `src/` - Shared types, interfaces, and utilities

## License

MIT
