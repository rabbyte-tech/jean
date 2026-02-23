import { useState, useRef, useEffect } from 'react';
import type { Session, Message, Preconfig } from '@ai-agent/shared';
import MessageComponent from './Message';
import './ChatView.css';

interface Props {
  session: Session;
  messages: Message[];
  preconfigs: Preconfig[];
  onSendMessage: (content: string) => void;
  onChangePreconfig: (preconfigId: string) => void;
  onApproveTool: (toolCallId: string, approved: boolean) => void;
}

export default function ChatView({ session, messages, preconfigs, onSendMessage, onChangePreconfig, onApproveTool }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };
  
  return (
    <div className="chat-view">
      <header className="chat-header">
        <div className="chat-header-left">
          <h2>{session.title || 'Untitled Session'}</h2>
          <span className="session-id">{session.id.slice(0, 8)}</span>
        </div>
        <div className="chat-header-right">
          <label className="preconfig-selector">
            <span className="preconfig-label">Preconfig:</span>
            <select 
              value={session.preconfigId || ''} 
              onChange={(e) => onChangePreconfig(e.target.value)}
            >
              {preconfigs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      
      <div className="messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            Start a conversation by sending a message below.
          </div>
        ) : (
          messages.map(msg => (
            <MessageComponent key={msg.id} message={msg} onApproveTool={onApproveTool} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
