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
  
  game.status = 'in-progress';
  game.currentPhase = 'ready';
  game.currentRound = 1;
  game.currentTeamIndex = 0;
  game.lastCompletedTurn = null;
  
  // Initialize describer index for each team (start with first player)
  game.currentDescriberIndex = {};
  for (let i = 0; i < game.teams.length; i++) {
    game.currentDescriberIndex.set(String(i), 0);
  }
  
  // Initialize game words
  const wordsByCategory = require('../../data/words');
  game.wordsByCategoryForGame = {};
  
  // Copy and shuffle words in each category
  for (const [category, words] of Object.entries(wordsByCategory)) {
    const shuffledWords = [...words];
    shuffleArray(shuffledWords);
    game.wordsByCategoryForGame[category] = shuffledWords;
  }
  
  console.log('Game initialized, phase set to ready for first team');
  console.log('Teams:', game.teams.map((t, i) => `${t.name}: ${Object.keys(t.players).length} players`));
  
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
    turnDuration: Math.max(15, Math.min(120, parseInt(settings.turnDuration) || 30)),
    totalRounds: Math.max(1, Math.min(10, parseInt(settings.totalRounds) || 3)),
    skipsPerTurn: Math.max(0, Math.min(5, parseInt(settings.skipsPerTurn) || 1)),
    penaltyForExtraSkip: Math.max(0, Math.min(3, parseInt(settings.penaltyForExtraSkip) || 1)),
    hintsPerTurn: Math.max(0, Math.min(5, parseInt(settings.hintsPerTurn) || 2))
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

