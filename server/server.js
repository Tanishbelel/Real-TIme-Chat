// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // React app URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users and messages
const users = {};
const messages = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle user joining
  socket.on('join', (username) => {
    users[socket.id] = { username, id: socket.id };
    
    // Broadcast to all clients that a new user has joined
    io.emit('userJoined', { 
      user: users[socket.id],
      users: Object.values(users),
      messages
    });
    
    console.log(`${username} joined the chat`);
  });
  
  // Handle new messages
  socket.on('sendMessage', (message) => {
    const user = users[socket.id];
    
    if (user) {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: user.username,
        senderId: socket.id,
        timestamp: new Date().toISOString()
      };
      
      messages.push(newMessage);
      
      // Broadcast the message to all clients
      io.emit('newMessage', newMessage);
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit('userTyping', {
        userId: socket.id,
        username: user.username,
        isTyping
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users[socket.id];
    
    if (user) {
      console.log(`${user.username} left the chat`);
      delete users[socket.id];
      
      // Inform other clients that a user has disconnected
      io.emit('userLeft', {
        userId: socket.id,
        users: Object.values(users)
      });
    }
  });
});

// Basic API endpoints
app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});