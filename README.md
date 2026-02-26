# Jean2

A monorepo for building and deploying AI agent applications with a modern tech stack.

## Tech Stack

### Server
- **Bun**: Fast JavaScript runtime and toolkit
- **Hono**: Fast and lightweight web framework
- **AI SDK**: Built-in support for AI models and tool integration
- **SQLite**: Embedded database for local persistence

### Client
- **React 19**: Latest React version with improved performance
- **Vite**: Next-generation frontend tooling
- **TypeScript**: Type-safe development

## Getting Started

### Prerequisites

- Bun >= 1.0.0

### Installation

```bash
bun install
```

### Development

Run all services in development mode:

```bash
bun run dev
```

Run specific service:

```bash
# Server only
bun run dev:server

# Client only
bun run dev:client
```

### Build

Build all packages:

```bash
bun run build
```

### Type Check

```bash
bun run typecheck
```

### Lint

```bash
bun run lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Server Configuration
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)

### Database
- `DATABASE_PATH`: SQLite database file path (default: ./data/agent.db)

### Optional Paths
- `PRECONFIGS_PATH`: Preconfigs directory (default: ~/.jean2/preconfigs)
- `TOOLS_PATH`: Tools directory (default: ./packages/server/data/tools)

### LLM Provider API Keys (set the ones you need)
- `LLM_OPENAI_API_KEY`: OpenAI API key
- `LLM_ANTHROPIC_API_KEY`: Anthropic API key
- `LLM_OPENROUTER_API_KEY`: OpenRouter API key
- `LLM_GOOGLE_API_KEY`: Google AI API key

### LLM Settings
- `LLM_BASE_URL`: Optional base URL override
- `LLM_MAX_TOKENS`: Maximum output tokens (default: 4096)
- `LLM_TEMPERATURE`: Response temperature (default: 0.7)

## API Endpoints

Once the server is running:

### Root
- `GET /` - Server status and info

### API
- `GET /api/info` - Server information
- `GET /api/health` - Health check
- `GET /api/models` - List available models

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create a new session
- `GET /api/sessions/:id` - Get a session
- `PUT /api/sessions/:id` - Update a session
- `DELETE /api/sessions/:id` - Delete a session
- `GET /api/sessions/:id/messages` - Get messages for a session

### Preconfigs
- `GET /api/preconfigs` - List all preconfigs
- `POST /api/preconfigs` - Create a new preconfig
- `GET /api/preconfigs/:id` - Get a preconfig
- `PUT /api/preconfigs/:id` - Update a preconfig
- `DELETE /api/preconfigs/:id` - Delete a preconfig

### Tools
- `GET /api/tools` - List all available tools
- `GET /api/tools/:name` - Get a specific tool

### WebSocket
- `GET /ws?sessionId=xxx` - WebSocket connection for real-time chat

## Project Structure

```
jean/
├── packages/
│   ├── server/          # Backend API server
│   ├── client/          # Frontend React application
│   └── shared/          # Shared types and utilities
```

### Server

- `src/index.ts` - Entry point and WebSocket handling
- `src/app.ts` - Hono app and REST API routes
- `src/core/` - Core agent logic and preconfig management
- `src/tools/` - Tool definitions and execution
- `src/store/` - SQLite database layer
- `src/config/` - Model configuration

### Client

- `src/main.tsx` - Application entry point
- `src/App.tsx` - Main application component
- `src/components/` - React components

### Shared

- `src/index.ts` - Shared types, interfaces, and utilities

## License

Apache 2.0
