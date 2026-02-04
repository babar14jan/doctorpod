// Deployment entry point for Render.com and local
// No code needed here, app.js already starts the server
// This file exists for Render's default entrypoint

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// Database initialization - only runs if database doesn't exist
const dbPath = path.join(dbDir, 'doctorpod.db');

if (!fs.existsSync(dbPath)) {
  console.log('⚠️  Database not found in database folder. Initializing...');
  try {
    execSync('node initDatabase.js', { stdio: 'inherit' });
    console.log('✅ Database created with schema and sample data');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Database found. Using existing database.');
}

// server.js – Render entrypoint with Socket.io for video calls
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Video call signaling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-video-room', ({ room, role, doctorId }) => {
    socket.join(room);
    console.log(`${role} joined room:`, room);

    // Notify others in the room
    if (role === 'patient') {
      socket.to(room).emit('patient-joined');
    } else if (role === 'doctor') {
      socket.to(room).emit('doctor-joined');
    }
  });

  socket.on('offer', ({ room, offer }) => {
    socket.to(room).emit('offer', offer);
  });

  socket.on('answer', ({ room, answer }) => {
    socket.to(room).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ room, candidate }) => {
    socket.to(room).emit('ice-candidate', candidate);
  });

  socket.on('leave-room', ({ room }) => {
    socket.leave(room);
    socket.to(room).emit('patient-left');
    socket.to(room).emit('doctor-left');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Render requires a direct start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Required for Render
server.listen(PORT, HOST, () => console.log(`DoctorPod running on ${HOST}:${PORT}`));
