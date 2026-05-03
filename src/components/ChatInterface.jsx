import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Shield, User } from 'lucide-react';
import { generateCyberGuardResponse } from '../services/mockAI';

/**
 * ChatInterface Component
 * 
 * Manages the actual chat window, message rendering, and input field.
 * It is completely controlled by App.jsx (stateless for history), meaning
 * it relies on the `session` prop to know what messages to display.
 * 
 * @param {Object} session - The currently active chat session object
 * @param {Function} onUpdateMessages - Callback to append new messages to global state
 */
export default function ChatInterface({ session, onUpdateMessages }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const messages = session ? session.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Automatically scroll to the newest message whenever history updates
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  /**
   * handleSend
   * Packages the user's input, sends it to the global state,
   * triggers the Gemini API service, and appends the AI's response.
   */
  const handleSend = async () => {
    if (!input.trim() || !session) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    const newMessages = [...messages, userMessage];
    onUpdateMessages(session.id, newMessages);
    setInput('');
    setIsTyping(true);

    const validHistory = messages.filter(m => m.id !== 1);

    // Fetch AI response
    const aiResponseText = await generateCyberGuardResponse(userMessage.content, validHistory);
    
    setIsTyping(false);
    onUpdateMessages(session.id, [...newMessages, {
      id: Date.now() + 1,
      role: 'ai',
      content: aiResponseText
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!session) {
    return <div className="main-content"><div style={{padding: '2rem'}}>Select or start a chat.</div></div>;
  }

  return (
    <div className="main-content">
      <div className="chat-header">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Secure Connection Encrypted</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role} animate-fade-in`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'ai' ? <Shield size={20} /> : <User size={20} />}
            </div>
            <div className="message-bubble">
              {msg.role === 'ai' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message-wrapper ai animate-fade-in">
            <div className="avatar ai">
              <Shield size={20} />
            </div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            className="chat-input"
            placeholder="Describe your cyber security or legal issue..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button 
            className="send-button" 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
