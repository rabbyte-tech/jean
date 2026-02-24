import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, Message, ServerMessage, ClientMessage, Preconfig } from '@ai-agent/shared';
import SessionList from '@/components/SessionList';
import ChatView from '@/components/ChatView';
import './App.css';

const WS_URL = `ws://${window.location.hostname}:3000/ws`;
const API_URL = `http://${window.location.hostname}:3000/api`;

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [preconfigs, setPreconfigs] = useState<Preconfig[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, Message[]>>({});
  const messages = currentSession ? (messagesBySession[currentSession.id] || []) : [];
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionUsage, setSessionUsage] = useState<{ 
    promptTokens: number; 
    completionTokens: number; 
    totalTokens: number 
  }>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o');
  const [models, setModels] = useState<Array<{
    id: string;
    name: string;
    contextWindow: number;
    tier: 'budget' | 'standard' | 'premium';
    providerId: string;
    providerName: string;
  }>>([]);
  const [defaultModel, setDefaultModel] = useState<string>('gpt-4o');

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

    fetch(`${API_URL}/models`)
      .then(res => res.json())
      .then(data => {
        setModels(data.models || []);
        setDefaultModel(data.defaultModel || 'gpt-4o');
      })
      .catch(console.error);
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session.created':
        setSessions(prev => [msg.session, ...prev]);
        setCurrentSession(msg.session);
        setMessagesBySession(prev => ({
          ...prev,
          [msg.session.id]: []
        }));
        setSessionUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
        setCurrentModel(defaultModel);
        break;
      
      case 'session.resumed':
        setCurrentSession(msg.session);
        // Always fetch from API to get the latest persisted messages,
        // then merge with any in-memory messages (for mid-stream joins)
        fetch(`${API_URL}/sessions/${msg.session.id}/messages`)
          .then(res => res.json())
          .then(data => {
            setMessagesBySession(prev => {
              const dbMessages: Message[] = data.messages || [];
              const inMemoryMessages: Message[] = prev[msg.session.id] || [];
              
              // Merge: Start with DB messages, then add/update with in-memory messages
              // In-memory messages take precedence (they have streaming content)
              const mergedMap = new Map<string, Message>(dbMessages.map((m) => [m.id, m]));
              
              // Add/update with in-memory messages
              for (const m of inMemoryMessages) {
                mergedMap.set(m.id, m);
              }
              
              // Convert back to array, sorted by createdAt
              const merged = Array.from(mergedMap.values()).sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              
              return {
                ...prev,
                [msg.session.id]: merged
              };
            });
            setSessionUsage(msg.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
            setCurrentModel(msg.session.selectedModel || defaultModel);
          })
          .catch(console.error);
        break;
      
      case 'chat.start':
        // Add placeholder message for streaming
        setMessagesBySession(prev => ({
          ...prev,
          [msg.sessionId]: [...(prev[msg.sessionId] || []), {
            id: msg.messageId,
            role: 'assistant',
            content: [{ type: 'text', text: '' }],
            createdAt: new Date().toISOString(),
          }]
        }));
        break;
      
      case 'chat.delta':
        // Append delta to the streaming message
        setMessagesBySession(prev => {
          const sessionMessages = prev[msg.sessionId] || [];
          return {
            ...prev,
            [msg.sessionId]: sessionMessages.map(m => {
              if (m.id === msg.messageId) {
                const currentText = (m.content[0] as { type: 'text'; text: string }).text || '';
                return { ...m, content: [{ type: 'text', text: currentText + msg.delta }] };
              }
              return m;
            })
          };
        });
        break;
      
      case 'chat.tool_call':
        // Add tool call block to the current streaming message
        setMessagesBySession(prev => {
          const sessionMessages = prev[msg.sessionId] || [];
          return {
            ...prev,
            [msg.sessionId]: sessionMessages.map(m => {
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
            })
          };
        });
        break;
      
      case 'chat.tool_result':
        // Update the message to add the tool result
        setMessagesBySession(prev => {
          const sessionMessages = prev[msg.sessionId] || [];
          return {
            ...prev,
            [msg.sessionId]: sessionMessages.map(m => {
              if (m.id === msg.messageId) {
                const hasToolCall = m.content.some(
                  block => block.type === 'tool_call' && block.toolCallId === msg.toolCallId
                );
                if (hasToolCall) {
                  // Remove pending flag from tool_call and add tool_result
                  const updatedContent = m.content.map(block => {
                    if (block.type === 'tool_call' && block.toolCallId === msg.toolCallId) {
                      const { pending: _pending, ...rest } = block as any;
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
            })
          };
        });
        break;
      
      case 'tool.approval_required':
        console.log('[DEBUG] tool.approval_required received:', msg);
        
        setMessagesBySession(prev => {
          if (!currentSession) return prev;
          console.log('[DEBUG] Current messages:', prev[currentSession.id]);
          
          const sessionMessages = prev[currentSession.id] || [];
          
          // Search for existing tool_call block by toolName
          for (let i = sessionMessages.length - 1; i >= 0; i--) {
            const m = sessionMessages[i];
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
                const updatedMessages = [
                  ...sessionMessages.slice(0, i),
                  { ...m, content: updatedContent },
                  ...sessionMessages.slice(i + 1),
                ];
                return {
                  ...prev,
                  [currentSession.id]: updatedMessages
                };
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
            const updatedMessages = [
              ...sessionMessages.slice(0, i),
              { ...m, content: [...m.content, newToolCallBlock] },
              ...sessionMessages.slice(i + 1),
            ];
            return {
              ...prev,
              [currentSession.id]: updatedMessages
            };
          }
          
          console.log('[DEBUG] No assistant message found');
          return prev;
        });
        break;
      
      case 'chat.complete':
        // Replace the streaming message with the final one
        setMessagesBySession(prev => {
          const sessionMessages = prev[msg.sessionId] || [];
          return {
            ...prev,
            [msg.sessionId]: sessionMessages.map(m => m.id === msg.message.id ? msg.message : m)
          };
        });
        break;
      
      case 'chat.usage':
        // Only process messages for the current session
        if (msg.sessionId !== currentSession?.id) return;
        // Update cumulative usage for this session
        setSessionUsage(prev => ({
          promptTokens: prev.promptTokens + msg.usage.promptTokens,
          completionTokens: prev.completionTokens + msg.usage.completionTokens,
          totalTokens: prev.totalTokens + msg.usage.totalTokens,
        }));
        // Update the current model from the server
        setCurrentModel(msg.model);
        break;
      
      case 'chat.user_message':
        // Add user message to the session's messages
        setMessagesBySession(prev => ({
          ...prev,
          [msg.sessionId]: [...(prev[msg.sessionId] || []), msg.message]
        }));
        break;
      
      case 'error':
        console.error('Server error:', msg.code, msg.message);
        break;
      
      case 'session.closed':
        setSessions(prev => prev.filter(s => s.id !== msg.sessionId));
        // Clear that session's messages from the map
        setMessagesBySession(prev => {
          const newMap = { ...prev };
          delete newMap[msg.sessionId];
          return newMap;
        });
        if (currentSession?.id === msg.sessionId) {
          setCurrentSession(null);
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
  }, [currentSession, messagesBySession]);

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

  const updateSessionModel = useCallback((modelId: string, providerId: string) => {
    if (currentSession) {
      sendMessage('session.update_model', { sessionId: currentSession.id, modelId, providerId });
    }
  }, [currentSession, sendMessage]);

  const sendChatMessage = useCallback((content: string) => {
    if (currentSession) {
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
    setMessagesBySession(prev => {
      if (!currentSession) return prev;
      const sessionMessages = prev[currentSession.id] || [];
      return {
        ...prev,
        [currentSession.id]: sessionMessages.map(m => {
          const hasToolCall = m.content.some(
            block => block.type === 'tool_call' && block.toolCallId === toolCallId
          );
          if (hasToolCall) {
            return {
              ...m,
              content: m.content.map(block => {
                if (block.type === 'tool_call' && block.toolCallId === toolCallId) {
                  const { needsApproval: _needsApproval, dangerous: _dangerous, ...rest } = block as any;
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
        })
      };
    });
  }, [currentSession, sendMessage]);

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
            models={models}
            defaultModel={defaultModel}
            onSendMessage={sendChatMessage}
            onChangePreconfig={updateSessionPreconfig}
            onChangeModel={updateSessionModel}
            onApproveTool={handleToolApproval}
            usage={sessionUsage}
            modelName={currentModel}
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
