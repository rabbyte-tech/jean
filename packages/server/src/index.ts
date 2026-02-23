import { createApp } from './app';
import { initializePreconfigs, getPreconfig, getDefaultPreconfig } from './core/preconfig';
import { scanTools } from './tools';
import { closeDatabase } from './store';
import type { ServerMessage, ClientMessage, Session, Message } from '@ai-agent/shared';
import { createSession, getSession, updateSession } from './store/sessions';
import { listMessages, createMessage } from './store/messages';
import { streamChat } from './core/agent';
import { createPendingApproval, resolveApproval } from './core/approvals';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Store connected clients with their session info
const clients = new Map<WebSocket, { sessionId?: string }>();

function getWsForSession(sessionId: string): WebSocket | undefined {
  for (const [ws, data] of clients.entries()) {
    if (data.sessionId === sessionId) {
      return ws;
    }
  }
  return undefined;
}

async function main() {
  console.log('Starting AI Agent Server...');
  
  // Check LLM configuration
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: LLM_API_KEY not set. Chat will not work.');
  } else {
    console.log(`LLM configured: ${process.env.LLM_PROVIDER || 'openai'} / ${process.env.LLM_MODEL || 'gpt-4o'}`);
  }
  
  // Initialize preconfigs
  console.log('Initializing preconfigs...');
  await initializePreconfigs();
  
  // Scan for tools
  console.log('Scanning for tools...');
  const tools = await scanTools();
  console.log(`Found ${tools.length} tools: ${tools.map(t => t.definition.name).join(', ')}`);
  
  // Create the app
  const app = createApp();
  
  console.log(`Server starting on http://${HOST}:${PORT}`);
  
  const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    
    async fetch(req) {
      const url = new URL(req.url);
      
      // Handle WebSocket upgrade
      if (url.pathname === '/ws') {
        const upgraded = server.upgrade(req);
        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
        return undefined;
      }
      
      // Handle API requests with Hono
      return app.fetch(req);
    },
    
    websocket: {
      open(ws) {
        clients.set(ws, {});
        console.log('Client connected. Total clients:', clients.size);
      },
      
      close(ws) {
        clients.delete(ws);
        console.log('Client disconnected. Total clients:', clients.size);
      },
      
      async message(ws, message) {
        try {
          const msg: ClientMessage = JSON.parse(message.toString());
          await handleClientMessage(ws, msg);
        } catch (err) {
          console.error('WebSocket message error:', err);
          ws.send(JSON.stringify({ type: 'error', code: 'parse_error', message: String(err) }));
        }
      },
    },
  });
  
  console.log(`AI Agent Server running at http://${HOST}:${PORT}`);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.stop();
    closeDatabase();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    server.stop();
    closeDatabase();
    process.exit(0);
  });
}

function send(ws: WebSocket, msg: ServerMessage) {
  ws.send(JSON.stringify(msg));
}

async function handleClientMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
  switch (msg.type) {
    case 'session.create': {
      const session = createSession({
        id: crypto.randomUUID(),
        preconfigId: msg.preconfigId || null,
        title: msg.title || 'New Session',
        status: 'active',
        metadata: null,
      });
      clients.set(ws, { sessionId: session.id });
      send(ws, { type: 'session.created', session });
      break;
    }
    
    case 'session.resume': {
      const session = getSession(msg.sessionId);
      if (!session) {
        send(ws, { type: 'error', code: 'not_found', message: 'Session not found' });
        return;
      }
      if (session.status === 'paused') {
        updateSession(msg.sessionId, { status: 'active' });
        const updated = getSession(msg.sessionId);
        send(ws, { type: 'session.resumed', session: updated! });
      } else {
        send(ws, { type: 'session.resumed', session });
      }
      clients.set(ws, { sessionId: session.id });
      break;
    }

    case 'session.update': {
      const session = getSession(msg.sessionId);
      if (!session) {
        send(ws, { type: 'error', code: 'not_found', message: 'Session not found' });
        return;
      }
      const updates: { preconfigId?: string } = {};
      if (msg.preconfigId !== undefined) {
        updates.preconfigId = msg.preconfigId;
      }
      const updated = updateSession(msg.sessionId, updates);
      send(ws, { type: 'session.updated', session: updated! });
      break;
    }
    
    case 'session.close': {
      updateSession(msg.sessionId, { status: 'closed' });
      send(ws, { type: 'session.closed', sessionId: msg.sessionId });
      break;
    }
    
    case 'chat.message': {
      await handleChat(ws, msg.sessionId, msg.content);
      break;
    }
    
    case 'tool.approval': {
      const resolved = resolveApproval(msg.toolCallId, msg.approved);
      if (!resolved) {
        console.warn('tool.approval received for unknown or expired toolCallId:', msg.toolCallId);
      }
      break;
    }
    
    default:
      send(ws, { type: 'error', code: 'unknown_message', message: 'Unknown message type' });
  }
}

async function handleChat(ws: WebSocket, sessionId: string, content: string) {
  // Check for API key
  if (!process.env.LLM_API_KEY) {
    send(ws, { type: 'error', code: 'no_api_key', message: 'LLM_API_KEY not configured' });
    return;
  }
  
  const session = getSession(sessionId);
  if (!session) {
    send(ws, { type: 'error', code: 'not_found', message: 'Session not found' });
    return;
  }
  
  // Get preconfig
  const preconfig = session.preconfigId 
    ? await getPreconfig(session.preconfigId)
    : await getDefaultPreconfig();
  
  if (!preconfig) {
    send(ws, { type: 'error', code: 'no_preconfig', message: 'No preconfig found' });
    return;
  }
  
  // Store user message
  const userMsgId = crypto.randomUUID();
  createMessage({
    id: userMsgId,
    sessionId,
    role: 'user',
    content: [{ type: 'text', text: content }],
  });
  
  // Get message history
  const history = listMessages(sessionId);
  
  // Generate assistant message ID
  const assistantMsgId = crypto.randomUUID();
  
  // Send chat start
  send(ws, { type: 'chat.start', sessionId, messageId: assistantMsgId });

  // Create approval callback that communicates with client
  const onToolApprovalRequired = async (toolCall: any, dangerous: boolean): Promise<boolean> => {
    // Send approval request to client
    const clientWs = getWsForSession(sessionId);
    
    if (clientWs) {
      send(clientWs, {
        type: 'tool.approval_required',
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        dangerous,
      });
    } else {
      console.warn('Could not find client WebSocket for session:', sessionId);
    }
    
    // Wait for client response
    return createPendingApproval(toolCall, dangerous);
  };

  try {
    // Stream the response
    for await (const event of streamChat({
      sessionId,
      preconfig,
      messages: history,
      onToolApprovalRequired,
    })) {
      switch (event.type) {
        case 'delta':
          send(ws, { type: 'chat.delta', sessionId, messageId: assistantMsgId, delta: event.content });
          break;
          
        case 'tool_call':
          send(ws, { type: 'chat.tool_call', sessionId, messageId: assistantMsgId, toolCall: event.toolCall });
          break;
          
        case 'tool_result':
          send(ws, { 
            type: 'chat.tool_result', 
            sessionId, 
            messageId: assistantMsgId,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            result: event.result 
          });
          break;
          
        case 'complete':
          // Store assistant message
          const assistantMessage: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: event.message.content,
            createdAt: event.message.createdAt,
          };
          createMessage({
            id: assistantMsgId,
            sessionId,
            role: 'assistant',
            content: event.message.content,
          });
          send(ws, { type: 'chat.complete', sessionId, message: assistantMessage });
          break;
      }
    }
  } catch (err: any) {
    console.error('Chat error:', err);
    send(ws, { type: 'error', code: 'chat_error', message: err.message || 'Chat failed' });
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
