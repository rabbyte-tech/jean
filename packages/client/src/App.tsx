import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, Message, ServerMessage, ClientMessage, Preconfig, ToolCallBlock } from '@ai-agent/shared';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';
import './App.css';

const WS_URL = `ws://${window.location.hostname}:3000/ws`;
const API_URL = `http://${window.location.hostname}:3000/api`;

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [preconfigs, setPreconfigs] = useState<Preconfig[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Ref to store the latest handleServerMessage for the WebSocket
  const handleServerMessageRef = useRef<((msg: ServerMessage) => void) | null>(null);

  // Connect WebSocket
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };
    
    socket.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };
    
    socket.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      // Use the ref to get the latest handler
      handleServerMessageRef.current?.(msg);
    };
    
    setWs(socket);
    
    return () => socket.close();
  }, []);

  // Load initial data
  useEffect(() => {
    fetch(`${API_URL}/sessions`)
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(console.error);
    
    fetch(`${API_URL}/preconfigs`)
      .then(res => res.json())
      .then(data => setPreconfigs(data.preconfigs || []))
      .catch(console.error);
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session.created':
        setSessions(prev => [msg.session, ...prev]);
        setCurrentSession(msg.session);
        setMessages([]);
        break;
      
      case 'session.resumed':
        setCurrentSession(msg.session);
        fetch(`${API_URL}/sessions/${msg.session.id}/messages`)
          .then(res => res.json())
          .then(data => setMessages(data.messages || []))
          .catch(console.error);
        break;
      
      case 'chat.start':
        // Add placeholder message for streaming
        setMessages(prev => [...prev, {
          id: msg.messageId,
          role: 'assistant',
          content: [{ type: 'text', text: '' }],
          createdAt: new Date().toISOString(),
        }]);
        break;
      
      case 'chat.delta':
        // Append delta to the streaming message
        setMessages(prev => prev.map(m => {
          if (m.id === msg.messageId) {
            const currentText = (m.content[0] as { type: 'text'; text: string }).text || '';
            return {
              ...m,
              content: [{ type: 'text', text: currentText + msg.delta }],
            };
          }
          return m;
        }));
        break;
      
      case 'chat.tool_call':
        // Add tool call block to the current streaming message
        setMessages(prev => prev.map(m => {
          if (m.id === msg.messageId) {
            // Check if a tool_call with this toolName and needsApproval already exists
            // (race condition: tool.approval_required may have added it already)
            const existingToolCall = m.content.find(
              block => block.type === 'tool_call' && block.toolName === msg.toolCall.toolName && (block as any).needsApproval
            );
            if (existingToolCall) {
              // Block already exists from tool.approval_required - keep it as-is
              // Don't update the toolCallId, the approval system uses the one from tool.approval_required
              return m;
            }
            
            // No existing block, add new one
            return {
              ...m,
              content: [...m.content, { 
                type: 'tool_call', 
                toolCallId: msg.toolCall.toolCallId,
                toolName: msg.toolCall.toolName,
                args: msg.toolCall.args,
                pending: true
              }]
            };
          }
          return m;
        }));
        break;
      
      case 'chat.tool_result':
        // Update the message to add the tool result
        setMessages(prev => prev.map(m => {
          if (m.id === msg.messageId) {
            const hasToolCall = m.content.some(
              block => block.type === 'tool_call' && block.toolCallId === msg.toolCallId
            );
            if (hasToolCall) {
              // Remove pending flag from tool_call and add tool_result
              const updatedContent = m.content.map(block => {
                if (block.type === 'tool_call' && block.toolCallId === msg.toolCallId) {
                  const { pending, ...rest } = block as ToolCallBlock;
                  return rest; // Remove pending flag
                }
                return block;
              });
              return {
                ...m,
                content: [...updatedContent, {
                  type: 'tool_result',
                  toolCallId: msg.toolCallId,
                  toolName: msg.toolName,
                  result: msg.result,
                  isError: !!(msg.result && typeof msg.result === 'object' && 'error' in msg.result)
                }]
              };
            }
          }
          return m;
        }));
        break;
      
      case 'tool.approval_required':
        console.log('[DEBUG] tool.approval_required received:', msg);
        
        setMessages(prev => {
          console.log('[DEBUG] Current messages:', prev);
          
          // Search for existing tool_call block by toolName
          for (let i = prev.length - 1; i >= 0; i--) {
            const m = prev[i];
            if (m.role !== 'assistant') continue;
            
            for (let j = 0; j < m.content.length; j++) {
              const block = m.content[j];
              if (block.type === 'tool_call') {
                console.log(`[DEBUG] Found tool_call: toolName=${block.toolName}, needsApproval=${(block as any).needsApproval}`);
              }
              if (
                block.type === 'tool_call' && 
                block.toolName === msg.toolName &&
                !(block as any).needsApproval
              ) {
                console.log('[DEBUG] Match found! Updating block');
                // Found it! Update this block
                const updatedContent = [...m.content];
                updatedContent[j] = {
                  ...block,
                  toolCallId: msg.toolCallId, // Update to match the approval ID
                  needsApproval: true,
                  dangerous: msg.dangerous,
                  pending: false,
                };
                return [
                  ...prev.slice(0, i),
                  { ...m, content: updatedContent },
                  ...prev.slice(i + 1),
                ];
              }
            }
            
            // Didn't find tool_call in this message, but it's an assistant message
            // Add the tool_call block here (race condition: approval arrived before tool_call)
            console.log('[DEBUG] No tool_call found in assistant message, adding new block');
            const newToolCallBlock = {
              type: 'tool_call' as const,
              toolCallId: msg.toolCallId,
              toolName: msg.toolName,
              args: msg.args,
              needsApproval: true,
              dangerous: msg.dangerous,
              pending: false,
            };
            return [
              ...prev.slice(0, i),
              { ...m, content: [...m.content, newToolCallBlock] },
              ...prev.slice(i + 1),
            ];
          }
          
          console.log('[DEBUG] No assistant message found');
          return prev;
        });
        break;
      
      case 'chat.complete':
        // Replace the streaming message with the final one
        setMessages(prev => prev.map(m => 
          m.id === msg.message.id ? msg.message : m
        ));
        break;
      
      case 'error':
        console.error('Server error:', msg.code, msg.message);
        break;
      
      case 'session.closed':
        setSessions(prev => prev.filter(s => s.id !== msg.sessionId));
        if (currentSession?.id === msg.sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }
        break;

      case 'session.updated':
        // Update the session in the sessions list
        setSessions(prev => prev.map(s => 
          s.id === msg.session.id ? msg.session : s
        ));
        // Update current session if it matches
        if (currentSession?.id === msg.session.id) {
          setCurrentSession(msg.session);
        }
        break;
    }
  }, [currentSession]);

  // Keep the ref updated with the latest handler
  useEffect(() => {
    handleServerMessageRef.current = handleServerMessage;
  }, [handleServerMessage]);

  const sendMessage = useCallback((type: ClientMessage['type'], payload: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  }, [ws]);

  const createSession = useCallback((preconfigId?: string, title?: string) => {
    sendMessage('session.create', { preconfigId, title });
  }, [sendMessage]);

  const resumeSession = useCallback((sessionId: string) => {
    sendMessage('session.resume', { sessionId });
  }, [sendMessage]);

  const closeSession = useCallback((sessionId: string) => {
    sendMessage('session.close', { sessionId });
  }, [sendMessage]);

  const updateSessionPreconfig = useCallback((preconfigId: string) => {
    if (currentSession) {
      sendMessage('session.update', { sessionId: currentSession.id, preconfigId });
    }
  }, [currentSession, sendMessage]);

  const sendChatMessage = useCallback((content: string) => {
    if (currentSession) {
      // Add user message locally
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: content }],
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      sendMessage('chat.message', { sessionId: currentSession.id, content });
    }
  }, [currentSession, sendMessage]);

  const handleToolApproval = useCallback((toolCallId: string, approved: boolean) => {
    // Send approval response to server
    sendMessage('tool.approval', {
      toolCallId,
      approved,
    });
    
    // Update the message to remove needsApproval flag (add pending back while executing)
    setMessages(prev => prev.map(m => {
      const hasToolCall = m.content.some(
        block => block.type === 'tool_call' && block.toolCallId === toolCallId
      );
      if (hasToolCall) {
        return {
          ...m,
          content: m.content.map(block => {
            if (block.type === 'tool_call' && block.toolCallId === toolCallId) {
              const { needsApproval, dangerous, ...rest } = block as any;
              return {
                ...rest,
                pending: approved, // Show pending if approved, otherwise stays without pending (denied)
              };
            }
            return block;
          })
        };
      }
      return m;
    }));
  }, [sendMessage]);

  return (
    <div className="app">
      <aside className="sidebar">
        <SessionList
          sessions={sessions}
          preconfigs={preconfigs}
          currentSession={currentSession}
          connected={connected}
          onCreateSession={createSession}
          onResumeSession={resumeSession}
          onCloseSession={closeSession}
        />
      </aside>
      <main className="main">
        {currentSession ? (
          <ChatView
            session={currentSession}
            messages={messages}
            preconfigs={preconfigs}
            onSendMessage={sendChatMessage}
            onChangePreconfig={updateSessionPreconfig}
            onApproveTool={handleToolApproval}
          />
        ) : (
          <div className="empty-state">
            <h2>Select or create a session</h2>
            <p>Choose a session from the sidebar or create a new one to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
