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
const {
  handleUseHintFast,
  handleUseHint
} = require('./handlers/gameplay/hintHandlers');
const { handleRequestMoreWords } = require('./handlers/gameplay/queueHandlers');
const {
  handleWordCorrectFast,
  handleWordCorrect,
  handleWordSkipFast,
  handleWordSkip
} = require('./handlers/gameplay/wordHandlers');

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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/word-guesser';
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
      
      console.log(`Socket handler: Loaded game ${gameId}, currentTurn exists: ${!!game.currentTurn}, words count: ${game.currentTurn ? Object.keys(game.wordsByCategoryForGame).map(cat => `${cat}:${game.wordsByCategoryForGame[cat].length}`).join(', ') : 'no-turn'}`);

      // Process the action based on type
      let updatedGame = game;
      let shouldBroadcastFirst = false; // Flag for fast actions that broadcast before saving
      
      console.log(`📥 Processing action: "${action}"`, payload);
      
      switch (action) {
        case 'join-team':
          updatedGame = await handleJoinTeam(game, payload);
          break;
        case 'start-game':
          updatedGame = await handleStartGame(game);
          break;
        case 'update-game-settings':
          updatedGame = await handleUpdateGameSettings(game, payload);
          break;
        case 'start-turn':
          console.log('Received start-turn action from client');
          updatedGame = await handleStartTurn(game);
          break;
        case 'word-correct':
          // Fast path: update in memory, broadcast immediately, save in background
          updatedGame = await handleWordCorrectFast(game, payload);
          shouldBroadcastFirst = true;
          break;
        case 'word-skip':
          // Fast path: update in memory, broadcast immediately, save in background
          updatedGame = await handleWordSkipFast(game, payload);
          shouldBroadcastFirst = true;
          break;
        case 'use-hint':
          // Fast path: update in memory, broadcast immediately, save in background
          updatedGame = await handleUseHintFast(game, payload);
          shouldBroadcastFirst = true;
          break;
        case 'request-more-words':
          console.log('🎯 MATCHED request-more-words case!');
          updatedGame = await handleRequestMoreWords(game, payload);
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
      console.log('Emitting game-updated with currentTurn:', {
        category: updatedGame.currentTurn?.category,
        word: updatedGame.currentTurn?.word,
        turnScore: updatedGame.currentTurn?.turnScore
      });
      io.to(gameId).emit('game-updated', updatedGame);
      
      // For fast actions, save to database in background (don't block broadcast)
      if (shouldBroadcastFirst) {
        console.log(`⚡ Broadcasting first for ${action}, saving to DB in background`);
        updatedGame.save().catch(err => {
          console.error(`❌ Background save failed for ${action}:`, err);
        });
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

// Global flags to prevent concurrent calls
let isStartingTurn = false;
let isEndingTurn = false;

async function handleStartTurn(game) {
  console.log('handleStartTurn called for game:', game.id);
  
  // Prevent multiple concurrent calls to handleStartTurn
  if (isStartingTurn) {
    console.log('handleStartTurn already in progress, ignoring duplicate call');
    return game;
  }
  
  // Only prevent if currentTurn is already initialized and active
  if (game.currentTurn && game.currentTurn.category && game.currentTurn.startTime) {
    console.log('Turn already in progress, ignoring duplicate handleStartTurn call');
    console.log('Current turn state:', {
      category: game.currentTurn.category,
      word: game.currentTurn.word,
      startTime: game.currentTurn.startTime
    });
    return game;
  }
  
  isStartingTurn = true;
  
  try {
    console.log('Starting new turn - currentTurn state:', game.currentTurn);
  
  // Change phase to guessing
  game.currentPhase = 'guessing';
  
  console.log('Current team index:', game.currentTeamIndex);
  console.log('WordsByCategoryForGame keys:', Object.keys(game.wordsByCategoryForGame));
  
  const currentTeam = game.teams[game.currentTeamIndex];
  
  // Get the current describer for this team (Map keys must be strings)
  const describerIndex = game.currentDescriberIndex.get(String(game.currentTeamIndex)) || 0;
  const teamPlayerIds = Object.keys(currentTeam.players);
  const describerPlayerId = teamPlayerIds[describerIndex];
  const describerPlayerName = currentTeam.players[describerPlayerId];
  
  console.log('Current describer:', { index: describerIndex, id: describerPlayerId, name: describerPlayerName });
  const availableCategories = Object.keys(game.wordsByCategoryForGame).filter(
    cat => game.wordsByCategoryForGame[cat].length > 0
  );
  
  console.log('Available categories:', availableCategories);
  
  if (availableCategories.length === 0) {
    console.log('No available categories, checking if game should end');
    
    // Check if all teams have completed the same number of rounds
    const totalRoundsCompleted = game.currentRound - 1; // Subtract 1 because we're starting a new round
    console.log(`Total rounds completed: ${totalRoundsCompleted}, Required: ${game.gameSettings.totalRounds}`);
    
    if (totalRoundsCompleted >= game.gameSettings.totalRounds) {
      console.log('All teams have completed required rounds, ending game');
      game.status = 'finished';
      return await game.save();
    } else {
      console.log('Not all teams have completed required rounds, reshuffling words');
      // Reshuffle all words and continue
      const wordsByCategory = require('./data/words');
      game.wordsByCategoryForGame = {};
      
      // Copy and shuffle words in each category
      for (const [category, words] of Object.entries(wordsByCategory)) {
        const shuffledWords = [...words];
        shuffleArray(shuffledWords);
        game.wordsByCategoryForGame[category] = shuffledWords;
      }
      
      // Mark the wordsByCategoryForGame field as modified for Mongoose
      game.markModified('wordsByCategoryForGame');
      
      // Update available categories after reshuffling
      const newAvailableCategories = Object.keys(game.wordsByCategoryForGame).filter(
        cat => game.wordsByCategoryForGame[cat].length > 0
      );
      
      if (newAvailableCategories.length === 0) {
        console.log('Still no words available after reshuffling, ending game');
        game.status = 'finished';
        return await game.save();
      }
      
      // Use the reshuffled categories
      availableCategories.length = 0;
      availableCategories.push(...newAvailableCategories);
      console.log('Reshuffled categories:', availableCategories);
    }
  }
  
  const selectedCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
  const words = game.wordsByCategoryForGame[selectedCategory];
  
  // Preload 15 words for client-side queue (optimistic updates)
  const queueSize = Math.min(15, words.length);
  const wordQueue = [];
  for (let i = 0; i < queueSize; i++) {
    wordQueue.push(words.pop());
  }
  
  console.log('Selected category:', selectedCategory);
  console.log('Preloaded words in queue:', wordQueue.length);
  console.log('First word:', wordQueue[0].word);
  console.log('Words remaining in category:', words.length);
  
  game.currentTurn = {
    category: selectedCategory,
    word: wordQueue[0].word,
    wordQueue: wordQueue.map(w => w.word),  // Send word strings to client
    hintQueue: wordQueue.map(w => w.hint || ''),  // Send hint strings to client
    queueIndex: 0,  // Track position in queue
    startTime: new Date(),
    timeLeft: game.gameSettings.turnDuration,
    turnWords: [],
    skipsRemaining: game.gameSettings.skipsPerTurn,
    hintsRemaining: game.gameSettings.hintsPerTurn,  // Initialize hints for the turn
    turnScore: 0,
    describerPlayerId: describerPlayerId,
    describerPlayerName: describerPlayerName
  };
  
  // Update the words array after taking queue
  game.wordsByCategoryForGame[selectedCategory] = words;
  
  // Mark the wordsByCategoryForGame field as modified for Mongoose
  game.markModified('wordsByCategoryForGame');
  
  return await game.save();
  } finally {
    isStartingTurn = false;
  }
}

async function handleEndTurn(game) {
  console.log('handleEndTurn called for game:', game.id);
  
  // Prevent multiple concurrent calls to handleEndTurn
  if (isEndingTurn) {
    console.log('⚠️ handleEndTurn already in progress, ignoring duplicate call');
    return game;
  }
  
  isEndingTurn = true;
  
  try {
    console.log('Current turn state:', game.currentTurn);
    console.log('Current team index:', game.currentTeamIndex);
    
    // Check if currentTurn exists
    if (!game.currentTurn) {
      console.log('No currentTurn found, creating empty turn data');
      // Create empty turn data if currentTurn is missing
      game.currentTurn = {
        turnScore: 0,
        turnWords: [],
        category: 'unknown',
        describerPlayerId: 'unknown',
        describerPlayerName: 'Unknown'
      };
    }
  
  // Ensure turnScore is a valid number before adding to team score
  const turnScore = isNaN(game.currentTurn.turnScore) ? 0 : game.currentTurn.turnScore;
  
  // Ensure team score is a valid number
  if (isNaN(game.teams[game.currentTeamIndex].score)) {
    game.teams[game.currentTeamIndex].score = 0;
  }
  
  // Add turn score to team score
  game.teams[game.currentTeamIndex].score += turnScore;
  
  // Store the completed turn data for the Ready screen to display
  game.lastCompletedTurn = {
    category: game.currentTurn.category,
    teamIndex: game.currentTeamIndex,
    teamName: game.teams[game.currentTeamIndex].name,
    describerPlayerId: game.currentTurn.describerPlayerId,
    describerPlayerName: game.currentTurn.describerPlayerName,
    score: turnScore,
    turnWords: game.currentTurn.turnWords || []
  };
  
  console.log('Last completed turn saved:', game.lastCompletedTurn);
  
  // Clear current turn (phase will show Ready screen now)
  game.currentTurn = null;
  
  // Rotate describer for the team that just played (Map keys must be strings)
  const currentTeam = game.teams[game.currentTeamIndex];
  const teamPlayerIds = Object.keys(currentTeam.players);
  const teamIndexStr = String(game.currentTeamIndex);
  const currentDescriberIndex = game.currentDescriberIndex.get(teamIndexStr) || 0;
  const nextDescriberIndex = (currentDescriberIndex + 1) % teamPlayerIds.length;
  game.currentDescriberIndex.set(teamIndexStr, nextDescriberIndex);
  console.log(`Team ${game.currentTeamIndex} describer rotated from ${currentDescriberIndex} to ${nextDescriberIndex}`);
  
  // Move to next team
  const previousTeamIndex = game.currentTeamIndex;
  game.currentTeamIndex = (game.currentTeamIndex + 1) % game.teams.length;
  
  // Check if round is complete
  if (game.currentTeamIndex === 0) {
    game.currentRound++;
    
    // Check if game is finished
    if (game.currentRound > game.gameSettings.totalRounds) {
      console.log('Game finished - all rounds completed');
      game.status = 'finished';
      // Keep phase as 'ready' so players see final turn results
      // They will navigate to game over from the Ready screen
      game.currentPhase = 'ready';
      const savedGame = await game.save();
      console.log('Saved finished game with:', {
        status: savedGame.status,
        currentPhase: savedGame.currentPhase,
        hasLastCompletedTurn: !!savedGame.lastCompletedTurn,
        lastCompletedTurnTeam: savedGame.lastCompletedTurn?.teamName,
        lastCompletedTurnScore: savedGame.lastCompletedTurn?.score
      });
      return savedGame;
    }
  }
  
  // Set phase to ready for the next team
  game.currentPhase = 'ready';
  
  console.log(`Turn ended: Team ${previousTeamIndex} → Team ${game.currentTeamIndex}, Phase: ready, Round: ${game.currentRound}`);
  
  // Next team will start when their describer clicks "Start Your Turn"
  const savedGame = await game.save();
  return savedGame;
  
  } finally {
    isEndingTurn = false;
  }
}

async function handleNextTurn(game) {
  console.log('handleNextTurn called - delegating to handleStartTurn');
  // The team advancement and phase change now happen in handleEndTurn
  // This function just starts the turn for the current team
  return await handleStartTurn(game);
}

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
