import { Shield, Globe, MessageSquare, Plus, Trash2 } from 'lucide-react';

/**
 * Sidebar Component
 * 
 * Renders the left-hand navigation panel. It contains:
 * - The "New Chat" button
 * - The dynamic "Chat History" list passed down from App.jsx
 * - Static Project Information and Social Impact parameters
 * 
 * @param {Array} sessions - Array of all chat history objects
 * @param {string} activeSessionId - ID of the currently selected chat
 * @param {Function} onSelectSession - Callback to change the active chat
 * @param {Function} onDeleteSession - Callback to delete a chat
 * @param {Function} onNewChat - Callback to generate a new empty chat
 */
export default function Sidebar({ sessions, activeSessionId, onSelectSession, onDeleteSession, onNewChat }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <Shield size={32} className="logo-icon" />
        <div>
          <h1 className="brand-title">CyberGuard</h1>
          <p className="brand-subtitle">AI Assistant</p>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={16} />
        New Chat
      </button>

      <div className="info-section chat-history-section">
        <h2 className="section-title">
          <MessageSquare size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Chat History
        </h2>
        <div className="history-list">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`history-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="history-title">{session.title}</span>
              <button 
                className="delete-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                aria-label="Delete chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>



      <div className="info-section" style={{ marginTop: 'auto' }}>
        <h2 className="section-title">
          <Globe size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Social Impact
        </h2>
        <div className="impact-card">
          <p className="impact-text">
            "CyberGuard AI addresses the growing social crisis of digital illiteracy and cyber-victimization. By providing instant, 24/7 access to legal information and emergency procedures, it reduces the trauma of cybercrime and empowers B.Tech CSE students and the general public to protect their digital identity."
          </p>
        </div>
      </div>
    </aside>
  );
}
