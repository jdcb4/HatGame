const express = require('express');
const Game = require('../models/Game');
const { shuffleArray } = require('../utils/arrayUtils');
const router = express.Router();

// Import the handleStartTurn function from the main server
let handleStartTurn = null;
const setHandleStartTurn = (startTurnFunction) => {
  handleStartTurn = startTurnFunction;
};

// Get the Socket.IO instance (we'll pass this from the main server)
let io = null;
const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Export the setter function
router.setSocketIO = setSocketIO;

// Create a new game
router.post('/', async (req, res) => {
  try {
    const { hostId, hostName, teamNames } = req.body;
    
    // Create teams array from team names
    const teams = teamNames.map(name => ({
      name: name,
      score: 0,
      players: {}
    }));
    
    // Add host to first team
    if (teams.length > 0) {
      teams[0].players[hostId] = hostName;
    }
    
    const game = new Game({
      hostId: hostId,
      teams: teams
    });
    
    await game.save();
    
    res.json({
      success: true,
      game: game,
      message: `Game created with ID: ${game.id}`
    });
    
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game'
    });
  }
});

// Get game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findOne({ id: req.params.id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    res.json({
      success: true,
      game: game
    });
    
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game'
    });
  }
});

// Join a game
router.post('/:id/join', async (req, res) => {
  try {
    const { playerId, playerName } = req.body;
    
    // First check if game exists and is in lobby status
    const game = await Game.findOne({ id: req.params.id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    if (game.status !== 'lobby') {
      return res.status(400).json({
        success: false,
        message: 'Game is not accepting new players'
      });
    }
    
    // Check if player is already in the game
    let playerExists = false;
    game.teams.forEach(team => {
      if (team.players && team.players[playerId]) {
        playerExists = true;
      }
    });
    
    if (!playerExists) {
      // Find the team with the fewest players
      let smallestTeamIndex = 0;
      let smallestTeamSize = Infinity;
      
      game.teams.forEach((team, index) => {
        const teamSize = team.players ? Object.keys(team.players).length : 0;
        if (teamSize < smallestTeamSize) {
          smallestTeamSize = teamSize;
          smallestTeamIndex = index;
        }
      });
      
      // Add player to the team with fewest players using atomic update
      const updateResult = await Game.updateOne(
        { id: req.params.id },
        { 
          $set: {
            [`teams.${smallestTeamIndex}.players.${playerId}`]: playerName
          }
        }
      );
      
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }
      
      console.log(`Player ${playerName} (${playerId}) added to Team ${smallestTeamIndex} using atomic update`);
    }
    
    // Fetch the updated game to return
    const updatedGame = await Game.findOne({ id: req.params.id });
    
    // Debug: Log current team states
    console.log('Current team states after join:');
    updatedGame.teams.forEach((team, index) => {
      const playerCount = team.players ? Object.keys(team.players).length : 0;
      console.log(`  Team ${index} (${team.name}): ${playerCount} players`);
      if (team.players) {
        Object.entries(team.players).forEach(([id, name]) => {
          console.log(`    - ${name} (${id})`);
        });
      }
    });
    
    // Emit game update to all players in the game
    if (io) {
      io.to(updatedGame.id).emit('game-updated', updatedGame);
    }
    
    res.json({
      success: true,
      game: updatedGame,
      message: 'Successfully joined game'
    });
    
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join game'
    });
  }
});

// Join a specific team
router.post('/:id/teams/:teamIndex/join', async (req, res) => {
  try {
    const { playerId, playerName } = req.body;
    const teamIndex = parseInt(req.params.teamIndex);
    
    // First, remove player from all teams using atomic update
    await Game.updateOne(
      { id: req.params.id },
      { 
        $unset: {
          [`teams.0.players.${playerId}`]: "",
          [`teams.1.players.${playerId}`]: "",
          [`teams.2.players.${playerId}`]: "",
          [`teams.3.players.${playerId}`]: "",
          [`teams.4.players.${playerId}`]: "",
          [`teams.5.players.${playerId}`]: ""
        }
      }
    );
    
    // Then add player to specified team using atomic update
    const updateResult = await Game.updateOne(
      { id: req.params.id },
      { 
        $set: {
          [`teams.${teamIndex}.players.${playerId}`]: playerName
        }
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Fetch the updated game to return
    const game = await Game.findOne({ id: req.params.id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    if (teamIndex < 0 || teamIndex >= game.teams.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team index'
      });
    }
    
    // Debug: Log current team states
    console.log('Current team states after team join:');
    game.teams.forEach((team, index) => {
      const playerCount = team.players ? Object.keys(team.players).length : 0;
      console.log(`  Team ${index} (${team.name}): ${playerCount} players`);
      if (team.players) {
        Object.entries(team.players).forEach(([id, name]) => {
          console.log(`    - ${name} (${id})`);
        });
      }
    });
    
    // Emit game update to all players in the game
    if (io) {
      io.to(game.id).emit('game-updated', game);
    }
    
    console.log(`Player ${playerName} (${playerId}) successfully joined ${game.teams[teamIndex].name} using atomic update`);
    
    res.json({
      success: true,
      game: game,
      message: `Successfully joined ${game.teams[teamIndex].name}`
    });
    
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join team'
    });
  }
});

// Start the game (host only)
router.patch('/:id/start', async (req, res) => {
  try {
    const { hostId } = req.body;
    const game = await Game.findOne({ id: req.params.id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    if (game.hostId !== hostId) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start the game'
      });
    }
    
    if (game.status !== 'lobby') {
      return res.status(400).json({
        success: false,
        message: 'Game has already started'
      });
    }
    
    // Check if all teams have at least one player
    const teamsWithPlayers = game.teams.filter(team => 
      team.players && Object.keys(team.players).length > 0
    );
    if (teamsWithPlayers.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 2 teams with players to start'
      });
    }
    
    game.status = 'in-progress';
    game.currentRound = 1;
    game.currentTeamIndex = 0;
    
    // Initialize game words
    const wordsByCategory = require('../data/words');
    game.wordsByCategoryForGame = {};
    
    // Copy and shuffle words in each category
    for (const [category, words] of Object.entries(wordsByCategory)) {
      const shuffledWords = [...words];
      shuffleArray(shuffledWords);
      game.wordsByCategoryForGame[category] = shuffledWords;
    }
    
    await game.save();
    
    // Initialize the first turn
    console.log('Starting first turn for game:', game.id);
    const updatedGame = await handleStartTurn(game);
    
    // Emit game-updated event to all players in the room
    console.log('Emitting game-updated for game start');
    io.to(game.id).emit('game-updated', updatedGame);
    
    res.json({
      success: true,
      game: updatedGame,
      message: 'Game started successfully'
    });
    
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game'
    });
  }
});

module.exports = { router, setSocketIO, setHandleStartTurn };
