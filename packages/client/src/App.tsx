import { useState, useEffect, useCallback } from 'react';
import type { Session, Message, ServerMessage, ClientMessage, Preconfig, ToolCallBlock } from '@ai-agent/shared';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';
import ApprovalDialog from './components/ApprovalDialog';
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
  const [approvalRequest, setApprovalRequest] = useState<{
    toolCall: ToolCallBlock;
    dangerous: boolean;
    resolve: (approved: boolean) => void;
  } | null>(null);

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
      handleServerMessage(msg);
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
            // Find the last assistant message (streaming) and add the tool call
            return {
              ...m,
              content: [...m.content, { 
                type: 'tool_call', 
                toolCallId: msg.toolCall.toolCallId,
                toolName: msg.toolCall.toolName,
                args: msg.toolCall.args,
                pending: true // Add pending flag
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
    }
  }, [currentSession]);

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

  const handleApproval = useCallback((approved: boolean) => {
    if (approvalRequest) {
      approvalRequest.resolve(approved);
      setApprovalRequest(null);
    }
  }, [approvalRequest]);

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
            onSendMessage={sendChatMessage}
          />
        ) : (
          <div className="empty-state">
            <h2>Select or create a session</h2>
            <p>Choose a session from the sidebar or create a new one to start chatting.</p>
          </div>
        )}
      </main>
      {approvalRequest && (
        <ApprovalDialog
          toolCall={approvalRequest.toolCall}
          dangerous={approvalRequest.dangerous}
          onApprove={() => handleApproval(true)}
          onDeny={() => handleApproval(false)}
        />
      )}
    </div>
  );
}

export default App;
