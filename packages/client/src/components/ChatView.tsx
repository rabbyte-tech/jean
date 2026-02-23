import { useState, useRef, useEffect } from 'react';
import type { Session, Message } from '@ai-agent/shared';
import MessageComponent from './Message';
import './ChatView.css';

interface Props {
  session: Session;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export default function ChatView({ session, messages, onSendMessage }: Props) {
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
        <h2>{session.title || 'Untitled Session'}</h2>
        <span className="session-id">{session.id.slice(0, 8)}</span>
      </header>
      
      <div className="messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            Start a conversation by sending a message below.
          </div>
        ) : (
          messages.map(msg => (
            <MessageComponent key={msg.id} message={msg} />
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
