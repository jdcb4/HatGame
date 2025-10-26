// Environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import routes
const gameRoutes = require('./routes/gameRoutes');

// Import utilities
const { shuffleArray } = require('./utils/arrayUtils');

// Import handlers
const { handleCreateRematch } = require('./handlers/shared/rematchHandlers');
const { 
  handleJoinTeam,
  handleStartGame,
  handleUpdateGameSettings 
} = require('./handlers/shared/lobbyHandlers');
const { handleSubmitClues } = require('./handlers/shared/clueHandlers');
const { handleRequestMoreClues } = require('./handlers/gameplay/queueHandlers');
const {
  handleClueCorrectFast,
  handleClueCorrect,
  handleClueSkipFast,
  handleClueSkip
} = require('./handlers/gameplay/clueHandlers');
const {
  handleStartTurn,
  handleEndTurn,
  handleNextTurn
} = require('./handlers/gameplay/turnHandlers');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  // For Railway, prefer WebSocket with polling fallback
  transports: ['websocket', 'polling'],
  // More aggressive connection settings for better real-time updates
  pingTimeout: 30000,
  pingInterval: 10000,
  connectTimeout: 20000,
  // Allow reconnection
  allowEIO3: true
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client build in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thehatgame_db';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/games', gameRoutes.router);

// Pass Socket.IO instance and handleStartTurn function to routes
gameRoutes.setSocketIO(io);
gameRoutes.setHandleStartTurn(handleStartTurn);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a game room
  socket.on('join-game', (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game room ${gameId}`);
    
    // Notify others in the room
    socket.to(gameId).emit('player-joined', {
      playerId: socket.id,
      timestamp: new Date()
    });
  });

  // Leave a game room
  socket.on('leave-game', (gameId) => {
    socket.leave(gameId);
    console.log(`User ${socket.id} left game ${gameId}`);
    
    // Notify others in the room
    socket.to(gameId).emit('player-left', {
      playerId: socket.id,
      timestamp: new Date()
    });
  });

  // Handle game actions
  socket.on('game-action', async (data) => {
    const { gameId, action, payload } = data;
    
    try {
      // Import Game model
      const Game = require('./models/Game');
      
      // Get current game state
      const game = await Game.findOne({ id: gameId });
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      console.log(`Socket handler: Loaded game ${gameId}, currentTurn exists: ${!!game.currentTurn}`);

      // Process the action based on type
      let updatedGame = game;
      let shouldBroadcastFirst = false; // Flag for fast actions that broadcast before saving
      
      console.log(`📥 Processing action: "${action}"`, payload);
      
      switch (action) {
        case 'join-team':
          updatedGame = await handleJoinTeam(game, payload);
          break;
        case 'submit-clues':
          console.log('📝 Received submit-clues action');
          updatedGame = await handleSubmitClues(game, payload.playerId, payload.playerName, payload.clues);
          break;
        case 'start-game':
          updatedGame = await handleStartGame(game);
          break;
        case 'update-game-settings':
          updatedGame = await handleUpdateGameSettings(game, payload);
          break;
        case 'start-turn':
          console.log('🎬 Received start-turn action from client');
          updatedGame = await handleStartTurn(game);
          break;
        case 'word-correct':
          // Fast path: update in memory, broadcast immediately, save in background
          // Keep 'word-correct' name for backward compatibility, but use clue handler
          updatedGame = await handleClueCorrectFast(game, payload);
          shouldBroadcastFirst = true;
          break;
        case 'word-skip':
          // Fast path: update in memory, broadcast immediately, save in background
          // Keep 'word-skip' name for backward compatibility, but use clue handler
          updatedGame = await handleClueSkipFast(game, payload);
          shouldBroadcastFirst = true;
          break;
        case 'request-more-words':
          console.log('🎯 MATCHED request-more-clues case!');
          updatedGame = await handleRequestMoreClues(game, payload);
          break;
        case 'end-turn':
          updatedGame = await handleEndTurn(game);
          break;
        case 'next-turn':
          updatedGame = await handleNextTurn(game);
          break;
        case 'create-rematch':
          console.log('📥 Received create-rematch action');
          const newGame = await handleCreateRematch(game);
          // For rematch, emit the new game to the room AND return it directly to the caller
          io.to(gameId).emit('rematch-created', { newGameId: newGame.id });
          socket.emit('rematch-created', { newGameId: newGame.id });
          return; // Don't broadcast the old game, we already sent the new game ID
        default:
          console.log(`❌ Unknown action received: "${action}"`);
          socket.emit('error', { message: 'Unknown action' });
          return;
      }

      // Broadcast updated game state to all players in the room
      console.log('📤 Emitting game-updated with currentTurn:', {
        clue: updatedGame.currentTurn?.clue,
        turnScore: updatedGame.currentTurn?.turnScore,
        gamePhase: updatedGame.currentGamePhase
      });
      io.to(gameId).emit('game-updated', updatedGame);
      
      // For fast actions, save to database in background (don't block broadcast)
      if (shouldBroadcastFirst) {
        console.log(`⚡ Broadcasting first for ${action}, saving to DB in background`);
        updatedGame.save().catch(err => {
          console.error(`❌ Background save failed for ${action}:`, err);
        });
      }
      
      // Check if phase completion triggered auto-end-turn
      if (updatedGame._shouldAutoEndTurn) {
        console.log('🏁 Auto-ending turn due to phase completion');
        delete updatedGame._shouldAutoEndTurn; // Clean up flag
        
        // Brief delay to let clients process the final correct clue
        setTimeout(async () => {
          try {
            // Reload game from DB to get latest state
            const freshGame = await Game.findOne({ id: gameId });
            if (freshGame && freshGame.currentTurn) {
              const endedGame = await handleEndTurn(freshGame);
              io.to(gameId).emit('game-updated', endedGame);
              console.log('✅ Turn auto-ended successfully');
            }
          } catch (err) {
            console.error('❌ Error in auto-end-turn:', err);
          }
        }, 1500); // 1.5 second delay for smooth UX
      }
      
    } catch (error) {
      console.error('Error handling game action:', error);
      socket.emit('error', { message: 'Server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Game action handlers
// (All handler functions have been extracted to separate modules)

// Catch-all route to serve React app (must be after API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
