/*
 * Entry point for a simple Node.js backend.
 *
 * This application uses Express to serve HTTP requests and Socket.IO to
 * demonstrate real‑time communication. When you start the server it
 * exposes two endpoints:
 *   GET /        → returns a JSON message indicating the server is running
 *   Socket.IO    → allows clients to connect and receive a welcome event
 *
 * To run the server use:
 *
 *   npm install
 *   npm start
 *
 * The server will listen on the port defined by the PORT environment
 * variable or default to 3000.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Create an Express application
const app = express();

// Use JSON middleware to automatically parse JSON bodies
app.use(express.json());

// Create an HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
  });
});

// Example API route for demonstration
app.get('/api/greet/:name', (req, res) => {
  const { name } = req.params;
  res.json({ greeting: `Hello, ${name}!` });
});

// Configure Socket.IO connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Emit a welcome event when a client connects
  socket.emit('welcome', {
    message: 'Welcome to the Socket.IO server!',
    id: socket.id,
  });

  // Listen for chat messages from clients
  socket.on('chat message', (msg) => {
    console.log('Received chat message:', msg);
    // Broadcast the message to all connected clients
    io.emit('chat message', msg);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Determine the port to listen on
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
