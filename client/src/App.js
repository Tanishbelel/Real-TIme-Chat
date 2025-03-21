// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [newMessageSound] = useState(new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_99f60c94fc.mp3'));
  const [isEmoji, setIsEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const notificationRef = useRef(null);
  const emojiRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Function to handle clicks outside emoji picker
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setIsEmoji(false);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

  useEffect(() => {
    // Apply dark mode to body
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Listen for new users joining
    socket.on('userJoined', (data) => {
      setUsers(data.users);
      setMessages(data.messages);
      
      // Notify when a new user joins (except first load)
      if (joined && data.user.id !== socket.id) {
        showNotification(`${data.user.username} joined the chat`);
      }
    });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      
      // Play sound for new messages from others
      if (message.senderId !== socket.id && notifications) {
        newMessageSound.play();
        showNotification(`New message from ${message.sender}`);
      }
    });

    // Listen for users leaving
    socket.on('userLeft', (data) => {
      setUsers(data.users);
    });

    // Listen for typing indicators
    socket.on('userTyping', (data) => {
      setTyping(prev => ({
        ...prev,
        [data.userId]: data.isTyping ? data.username : null
      }));
    });

    return () => {
      socket.off('userJoined');
      socket.off('newMessage');
      socket.off('userLeft');
      socket.off('userTyping');
    };
  }, [joined, notifications, newMessageSound]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('join', username);
      setJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('sendMessage', message);
      setMessage('');
      // Clear typing indicator
      socket.emit('typing', false);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', e.target.value.length > 0);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleNotifications = () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotifications(!notifications);
        }
      });
    } else {
      setNotifications(!notifications);
    }
  };

  const showNotification = (message) => {
    if (Notification.permission === 'granted' && notifications && document.hidden) {
      new Notification('Chat App', {
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
      });
    }

    // In-app notification
    if (notificationRef.current) {
      notificationRef.current.innerText = message;
      notificationRef.current.classList.add('show');
      setTimeout(() => {
        notificationRef.current.classList.remove('show');
      }, 3000);
    }
  };

  const toggleEmojiPicker = () => {
    setIsEmoji(!isEmoji);
  };

  const addEmoji = (emoji) => {
    setMessage(message + emoji);
    setIsEmoji(false);
  };

  // Display users who are currently typing
  const typingUsers = Object.values(typing).filter(Boolean);
  const typingText = typingUsers.length 
    ? `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
    : '';

  // Array of common emojis
  const emojis = ['😀', '😂', '🙂', '😍', '😊', '👍', '❤️', '🎉', '🔥', '👋', '😎', '🤔', '👏', '🙏', '🌟'];
  
  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-app">
      <button className="theme-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? '☀️' : '🌙'}
      </button>
      
      <div id="notification" ref={notificationRef} className="notification"></div>
      
      {!joined ? (
        <div className="join-form">
          <h1>Chat App</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="What should we call you?"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit">Join the conversation</button>
          </form>
        </div>
      ) : (
        <div className="chat-container">
          <div className="chat-sidebar">
            <h2>Online Users ({users.length})</h2>
            <ul className="users-list">
              {users.map((user) => (
                <li key={user.id} className="user-item">
                  {user.username}
                  {user.id === socket.id && ' (You)'}
                </li>
              ))}
            </ul>
            <div className="chat-info">
              {getCurrentTime()} • {users.length} online
            </div>
          </div>
          <div className="chat-main">
            <div className="chat-header">
              <h2>General Chat</h2>
              <div className="chat-actions">
                <button className="action-btn" onClick={toggleNotifications} title="Toggle Notifications">
                  {notifications ? '🔔' : '🔕'}
                </button>
              </div>
            </div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="welcome-message">
                  <p>No messages yet. Be the first to say hello!</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.senderId === socket.id ? 'my-message' : 'other-message'}`}
                >
                  <div className="message-info">
                    <span className="sender">{msg.senderId === socket.id ? 'You' : msg.sender}</span>
                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {typingText && <div className="typing-indicator">{typingText}</div>}
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type your message here..."
                value={message}
                onChange={handleTyping}
              />
              {isEmoji && (
                <div className="emoji-picker" ref={emojiRef}>
                  {emojis.map((emoji, index) => (
                    <span 
                      key={index} 
                      className="emoji" 
                      onClick={() => addEmoji(emoji)}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
              <button 
                type="button" 
                className="emoji-btn" 
                onClick={toggleEmojiPicker}
                title="Emoji"
              >
                😊
              </button>
              <button type="submit" title="Send Message"></button>
            </form>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 1000;
          transform: translateX(200%);
          transition: transform 0.3s ease;
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .welcome-message {
          text-align: center;
          color: #666;
          margin: 30px 0;
          font-style: italic;
        }
        
        .emoji-picker {
          position: absolute;
          bottom: 80px;
          right: 70px;
          background: white;
          border-radius: 10px;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }
        
        .dark-mode .emoji-picker {
          background: #333;
        }
        
        .emoji {
          font-size: 1.5rem;
          cursor: pointer;
          padding: 5px;
          border-radius: 5px;
          text-align: center;
          transition: background-color 0.2s;
        }
        
        .emoji:hover {
          background-color: rgba(108, 92, 231, 0.1);
        }
        
        .emoji-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          margin-right: 10px;
          opacity: 0.7;
          transition: opacity 0.2s, transform 0.2s;
        }
        
        .emoji-btn:hover {
          opacity: 1;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}

export default App;