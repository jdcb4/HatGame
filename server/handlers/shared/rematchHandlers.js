/**
 * Rematch handlers - Create new games based on completed games
 */

const Game = require('../../models/Game');

async function handleCreateRematch(oldGame) {
  console.log('🔄 Creating rematch for game:', oldGame.id);
  
  // Create new game with same settings and team structure
  const newTeams = oldGame.teams.map(team => ({
    name: team.name,
    score: 0,
    players: { ...team.players } // Copy players to same teams
  }));
  
  // Keep the same host
  const newGame = new Game({
    hostId: oldGame.hostId,
    teams: newTeams,
    gameSettings: {
      turnDuration: oldGame.gameSettings.turnDuration,
      skipsPerTurn: oldGame.gameSettings.skipsPerTurn,
      cluesPerPlayer: oldGame.gameSettings.cluesPerPlayer
    }
  });
  
  await newGame.save();
  
  console.log('✅ Rematch created:', newGame.id);
  console.log('   Teams:', newGame.teams.map(t => `${t.name} (${Object.keys(t.players).length} players)`));
  
  return newGame;
}

module.exports = {
  handleCreateRematch
};

