/**
 * Lobby handlers - Manage pre-game setup, team joining, and game start
 */

const Game = require('../../models/Game');
const { shuffleArray } = require('../../utils/arrayUtils');

async function handleJoinTeam(game, { playerId, playerName, teamIndex }) {
  // Use atomic updates to avoid race conditions
  // First remove player from all teams
  await Game.updateOne(
    { id: game.id },
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
  
  // Then add player to specified team
  await Game.updateOne(
    { id: game.id },
    { 
      $set: {
        [`teams.${teamIndex}.players.${playerId}`]: playerName
      }
    }
  );
  
  // Return the updated game
  return await Game.findOne({ id: game.id });
}

async function handleStartGame(game) {
  console.log('handleStartGame called for game:', game.id);
  
  // Check if all players have submitted clues
  const allPlayerIds = new Set();
  game.teams.forEach(team => {
    Object.keys(team.players).forEach(pid => allPlayerIds.add(pid));
  });
  
  const submittedCount = Object.keys(game.clueSubmissions || {}).filter(
    pid => game.clueSubmissions[pid]?.hasSubmitted
  ).length;
  
  if (submittedCount < allPlayerIds.size) {
    console.error(`❌ Cannot start game: Only ${submittedCount}/${allPlayerIds.size} players have submitted clues`);
    return game;
  }
  
  console.log(`✅ All ${allPlayerIds.size} players have submitted clues. Starting game!`);
  
  game.status = 'in-progress';
  game.currentPhase = 'ready';
  game.currentGamePhase = 1;  // Start with Phase 1: Describe
  game.currentRound = 1;
  game.currentTeamIndex = 0;
  game.lastCompletedTurn = null;
  
  // Initialize describer index for each team (start with first player)
  game.currentDescriberIndex = {};
  for (let i = 0; i < game.teams.length; i++) {
    game.currentDescriberIndex.set(String(i), 0);
  }
  
  // Shuffle the clue pool for randomness
  shuffleArray(game.cluePool);
  
  // Initialize used clues tracker (empty at start)
  game.usedCluesInPhase = [];
  
  console.log('✅ Game initialized with', game.cluePool.length, 'clues');
  console.log('🎮 Starting Phase 1: Describe');
  console.log('👥 Teams:', game.teams.map((t, i) => `${t.name}: ${Object.keys(t.players).length} players`));
  
  // Mark arrays as modified for Mongoose
  game.markModified('cluePool');
  game.markModified('usedCluesInPhase');
  
  // Save and emit - players should now see the Ready screen
  return await game.save();
}

async function handleUpdateGameSettings(game, settings) {
  console.log('✅ handleUpdateGameSettings called for game:', game.id);
  console.log('📝 New settings:', settings);
  
  // Only allow updating settings in lobby (before game starts)
  if (game.status !== 'lobby') {
    console.log('❌ Cannot update settings - game already started');
    return game;
  }
  
  // Validate settings values
  const validatedSettings = {
    turnDuration: Math.max(15, Math.min(120, parseInt(settings.turnDuration) || 45)),
    skipsPerTurn: Math.max(0, Math.min(5, parseInt(settings.skipsPerTurn) || 1)),
    cluesPerPlayer: Math.max(3, Math.min(10, parseInt(settings.cluesPerPlayer) || 6))
  };
  
  console.log('✅ Validated settings:', validatedSettings);
  
  // Update game settings
  game.gameSettings = validatedSettings;
  
  // Mark the nested object as modified (Mongoose requirement)
  game.markModified('gameSettings');
  
  // Save and return updated game
  await game.save();
  console.log('✅ Game settings updated successfully');
  
  return game;
}

module.exports = {
  handleJoinTeam,
  handleStartGame,
  handleUpdateGameSettings
};

