/**
 * Hono Application Setup
 *
 * Core application configuration for the AI Agent Server.
 * Includes REST API endpoints and WebSocket handler.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import types from shared
import type {
  SessionStatus,
  ToolDefinition,
} from '@ai-agent/shared';

// Import store operations
import {
  createSession,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
} from './store/sessions';
import {
  createMessage,
  listMessages,
} from './store/messages';

// Import preconfig operations
import {
  listPreconfigs,
  getPreconfig,
  createPreconfig,
  updatePreconfig,
  deletePreconfig,
} from './core/preconfig';

// Import tool operations
import { listTools, getTool } from './tools';

export function createApp() {
  const app = new Hono();

  // Middleware
  app.use('*', cors());
  app.use('*', logger());
  app.use('*', prettyJSON());

  // ============================================================================
  // Root and Health Endpoints
  // ============================================================================

  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      message: 'AI Agent Server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // API Info Endpoints
  // ============================================================================

  // GET /api/info - Server information
  app.get('/api/info', (c) => {
    return c.json({
      name: 'AI Agent Server',
      version: '1.0.0',
      runtime: 'bun',
      features: {
        websocket: true,
        sessions: true,
        preconfigs: true,
        tools: true,
      },
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/health - Health check
  app.get('/api/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // Sessions API
  // ============================================================================

  // GET /api/sessions - List all sessions
  app.get('/api/sessions', async (c) => {
    try {
      const status = c.req.query('status') as SessionStatus | undefined;
      const sessions = listSessions(status);
      return c.json({ sessions });
    } catch (err: any) {
      console.log('\n');
      console.log('========== SESSIONS ERROR ==========');
      console.log('Error:', err?.message || err);
      console.log('Stack:', err?.stack);
      console.log('====================================\n');
      return c.json({ error: 'Internal error', message: err?.message || String(err) }, 500);
    }
  });

  // POST /api/sessions - Create a new session
  app.post('/api/sessions', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    
    const session = createSession({
      id: body.id || crypto.randomUUID(),
      preconfigId: body.preconfigId || null,
      title: body.title || 'New Session',
      status: 'active',
      metadata: body.metadata || null,
    });
    
    return c.json({ session }, 201);
  });

  // GET /api/sessions/:id - Get a session by ID
  app.get('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = getSession(id);
    
    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    return c.json({ session });
  });

  // PUT /api/sessions/:id - Update a session
  app.put('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    
    const session = updateSession(id, {
      title: body.title,
      status: body.status,
      metadata: body.metadata,
    });
    
    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    return c.json({ session });
  });

  // DELETE /api/sessions/:id - Delete a session
  app.delete('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = deleteSession(id);
    
    if (!deleted) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    return c.json({ success: true });
  });

  // POST /api/sessions/:id/pause - Pause a session
  app.post('/api/sessions/:id/pause', async (c) => {
    const id = c.req.param('id');
    
    const session = updateSession(id, { status: 'paused' });
    
    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    return c.json({ session });
  });

  // POST /api/sessions/:id/resume - Resume a session
  app.post('/api/sessions/:id/resume', async (c) => {
    const id = c.req.param('id');
    
    const session = updateSession(id, { status: 'active' });
    
    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    return c.json({ session });
  });

  // ============================================================================
  // Messages API
  // ============================================================================

  // GET /api/sessions/:id/messages - Get messages for a session
  app.get('/api/sessions/:id/messages', async (c) => {
    const sessionId = c.req.param('id');
    
    // Verify session exists
    const session = getSession(sessionId);
    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }
    
    const messages = listMessages(sessionId);
    return c.json({ messages });
  });

  // ============================================================================
  // Preconfigs API
  // ============================================================================

  // GET /api/preconfigs - List all preconfigs
  app.get('/api/preconfigs', async (c) => {
    const preconfigs = await listPreconfigs();
    return c.json({ preconfigs });
  });

  // POST /api/preconfigs - Create a new preconfig
  app.post('/api/preconfigs', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    
    const preconfig = await createPreconfig({
      name: body.name || 'Custom Preconfig',
      description: body.description || '',
      systemPrompt: body.systemPrompt || '',
      tools: body.tools || null,
      model: body.model || null,
      provider: body.provider || null,
      settings: body.settings || null,
      isDefault: false,
    });
    
    return c.json({ preconfig }, 201);
  });

  // GET /api/preconfigs/:id - Get a preconfig by ID
  app.get('/api/preconfigs/:id', async (c) => {
    const id = c.req.param('id');
    const preconfig = await getPreconfig(id);
    
    if (!preconfig) {
      return c.json({ error: 'Not Found', message: 'Preconfig not found' }, 404);
    }
    
    return c.json({ preconfig });
  });

  // PUT /api/preconfigs/:id - Update a preconfig
  app.put('/api/preconfigs/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    
    const preconfig = await updatePreconfig(id, {
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      tools: body.tools,
      model: body.model,
      provider: body.provider,
      settings: body.settings,
      isDefault: body.isDefault,
    });
    
    if (!preconfig) {
      return c.json({ error: 'Not Found', message: 'Preconfig not found' }, 404);
    }
    
    return c.json({ preconfig });
  });

  // DELETE /api/preconfigs/:id - Delete a preconfig
  app.delete('/api/preconfigs/:id', async (c) => {
    const id = c.req.param('id');
    
    // Check if preconfig exists
    const preconfig = await getPreconfig(id);
    if (!preconfig) {
      return c.json({ error: 'Not Found', message: 'Preconfig not found' }, 404);
    }
    
    // Prevent deleting default preconfigs
    if (preconfig.isDefault) {
      return c.json({ error: 'Forbidden', message: 'Cannot delete default preconfig' }, 403);
    }
    
    const deleted = await deletePreconfig(id);
    
    if (!deleted) {
      return c.json({ error: 'Internal Server Error', message: 'Failed to delete preconfig' }, 500);
    }
    
    return c.json({ success: true });
  });

  // ============================================================================
  // Tools API
  // ============================================================================

  // GET /api/tools - List all available tools
  app.get('/api/tools', async (c) => {
    try {
      const tools = await listTools();
      return c.json({ tools });
    } catch (error) {
      return c.json({ tools: [] });
    }
  });

  // GET /api/tools/:name - Get a specific tool by name
  app.get('/api/tools/:name', async (c) => {
    const name = c.req.param('name');
    
    try {
      const tool = await getTool(name);
      
      if (!tool) {
        return c.json({ error: 'Not Found', message: 'Tool not found' }, 404);
      }
      
      return c.json({ tool: tool.definition });
    } catch (error) {
      return c.json({ error: 'Not Found', message: 'Tool not found' }, 404);
    }
  });

  // ============================================================================
  // WebSocket Handler
  // ============================================================================

  // WebSocket endpoint: GET /ws
  app.get('/ws', async (c) => {
    if (!c.req.raw.headers.get('upgrade')?.toLowerCase()) {
      return c.json({ error: 'Bad Request', message: 'Expected WebSocket upgrade' }, 400);
    }
    
    const sessionId = c.req.query('sessionId');
    
    return c.json({
      message: 'WebSocket endpoint - requires WebSocket upgrade support',
      protocol: 'ai-agent-ws',
      version: '1.0.0',
      sessionId
    });
  });

  // ============================================================================
  // 404 and Error Handlers
  // ============================================================================

  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        path: c.req.path,
        method: c.req.method
      },
      404
    );
  });

  app.onError((err, c) => {
    console.log('\n');
    console.log('========== ERROR ==========');
    console.log('Message:', err.message);
    console.log('Path:', c.req.path);
    console.log('Method:', c.req.method);
    console.log('Stack:', err.stack);
    console.log('============================\n');
    
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        path: c.req.path,
        method: c.req.method
      },
      500
    );
  });

  return app;
}

export default createApp;
