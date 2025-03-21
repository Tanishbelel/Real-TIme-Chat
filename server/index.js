const { Server } = require('socket.io');
const cors = require('cors');

// Store connected users and messages
let users = {};
let messages = [];

// Persist io instance across hot reloads
let io;

export default function handler(req, res) {
  // Allow CORS for server requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  // Return users or messages via REST server
  if (req.method === 'GET') {
    if (req.url === '/server/users') {
      return res.status(200).json(Object.values(users));
    }
    if (req.url === '/server/messages') {
      return res.status(200).json(messages);
    }
    return res.status(200).send('Socket Server is running 🚀');
  }

  // Attach Socket.IO if not already
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO...');
    io = new Server(res.socket.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Handle user joining
      socket.on('join', (username) => {
        users[socket.id] = { username, id: socket.id };
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
          io.emit('newMessage', newMessage);
        }
      });

      // Typing indicator
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

      // Disconnect handler
      socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
          console.log(`${user.username} left the chat`);
          delete users[socket.id];
          io.emit('userLeft', {
            userId: socket.id,
            users: Object.values(users)
          });
        }
      });
    });
  }

  res.end();
}
