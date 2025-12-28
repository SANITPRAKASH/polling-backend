import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import connectDB from './config/db.js';
import PollController from './controllers/PollController.js';
import PollSocketHandler from './sockets/PollSocketHandler.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
console.log('[Server] Connecting to database...');
connectDB();

// REST API routes
app.get('/api/polls/active', PollController.getActivePoll);
app.get('/api/polls/history', PollController.getPollHistory);
app.post('/api/polls', PollController.createPoll);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});


// Socket.io handler
const pollSocketHandler = new PollSocketHandler(io);

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  pollSocketHandler.handleConnection(socket);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
