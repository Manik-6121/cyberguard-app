/**
 * App.jsx - Main Application Component
 * 
 * This is the root component of the CyberGuard AI web application.
 * It manages the global state for chat sessions (history) and handles
 * the logic for loading and saving this data to our custom backend file.
 */
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import './App.css';

const DEFAULT_MESSAGE = {
  id: 1,
  role: 'ai',
  content: 'I am **CyberGuard AI**, your specialized Domain Expert in Indian Cyber Law, Global Data Privacy, and Digital Security Best Practices. How can I assist you today?'
};

/**
 * App Component
 * Orchestrates the Sidebar (history/settings) and the ChatInterface.
 */
function App() {
  const [sessions, setSessions] = useState([]); // Array holding all past and current chats
  const [activeSessionId, setActiveSessionId] = useState(null); // ID of the currently selected chat
  const [isLoading, setIsLoading] = useState(true); // Loading state while fetching history from backend

  /**
   * Load History from Backend API
   * This effect runs exactly once when the application starts (empty dependency array []).
   * It fetches the chat_history.json file from our Vite server backend.
   */
  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(loadedSessions => {
        const newSession = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [DEFAULT_MESSAGE]
        };
        
        let initialSessions = [newSession];
        if (Array.isArray(loadedSessions) && loadedSessions.length > 0) {
           // Reuse existing empty new chat if it exists at the top
           if (loadedSessions[0].title === 'New Chat' && loadedSessions[0].messages.length === 1) {
             initialSessions = loadedSessions;
           } else {
             initialSessions = [newSession, ...loadedSessions];
           }
        }
        
        setSessions(initialSessions);
        setActiveSessionId(initialSessions[0].id);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load history from backend", err);
        const fallbackSession = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [DEFAULT_MESSAGE]
        };
        setSessions([fallbackSession]);
        setActiveSessionId(fallbackSession.id);
        setIsLoading(false);
      });
  }, []);

  /**
   * Save History to Backend API
   * Sends the updated chat history array to the server to be written to chat_history.json.
   * 
   * @param {Array} data - The full array of chat sessions to save
   */
  const saveToBackend = (data) => {
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error("Failed to save history to backend", err));
  };

  /**
   * handleNewChat
   * Creates a fresh, empty chat session and adds it to the top of the history list.
   */
  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [DEFAULT_MESSAGE]
    };
    const newSessions = [newSession, ...sessions];
    setSessions(newSessions);
    setActiveSessionId(newSession.id);
    saveToBackend(newSessions);
  };

  /**
   * handleDeleteSession
   * Removes a specific chat session from the history.
   * If all sessions are deleted, it automatically spawns a new empty chat.
   * 
   * @param {string} id - The unique ID of the session to delete
   */
  const handleDeleteSession = (id) => {
    let updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const newSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [DEFAULT_MESSAGE]
      };
      updated = [newSession];
      setActiveSessionId(newSession.id);
    } else if (id === activeSessionId) {
      setActiveSessionId(updated[0].id);
    }
    
    setSessions(updated);
    saveToBackend(updated);
  };

  /**
   * handleUpdateMessages
   * Appends new messages to a specific session. It also dynamically generates
   * a title for the session based on the user's very first message.
   * 
   * @param {string} sessionId - The ID of the session being updated
   * @param {Array} newMessages - The newly updated array of messages for that session
   */
  const handleUpdateMessages = (sessionId, newMessages) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        let title = session.title;
        if (title === 'New Chat' && newMessages.length > 1) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...session, title, messages: newMessages };
      }
      return session;
    });
    
    setSessions(updatedSessions);
    saveToBackend(updatedSessions);
  };

  if (isLoading) {
    return <div className="app-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)'}}>Loading CyberGuard AI...</div>;
  }

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className="app-container">
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
      />
      <ChatInterface 
        session={activeSession}
        onUpdateMessages={handleUpdateMessages}
      />
    </div>
  );
}

export default App;
