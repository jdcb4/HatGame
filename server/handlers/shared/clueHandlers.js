/**
 * Clue handlers - Manage player clue submissions during lobby phase
 */

async function handleSubmitClues(game, playerId, playerName, clues) {
  console.log('📨 handleSubmitClues called:', { playerId, playerName, cluesCount: clues.length });
  
  try {
    // Validate clues array
    const requiredClues = game.gameSettings?.cluesPerPlayer || 6;
    
    if (!Array.isArray(clues)) {
      console.error('❌ Clues must be an array');
      return game;
    }
    
    if (clues.length !== requiredClues) {
      console.error(`❌ Must submit exactly ${requiredClues} clues, received ${clues.length}`);
      return game;
    }
    
    // Validate each clue is a non-empty string
    for (let i = 0; i < clues.length; i++) {
      if (typeof clues[i] !== 'string' || clues[i].trim().length === 0) {
        console.error(`❌ Clue ${i + 1} is empty or invalid`);
        return game;
      }
    }
    
    // Initialize clueSubmissions if it doesn't exist
    if (!game.clueSubmissions) {
      game.clueSubmissions = {};
    }
    
    // Store submission data
    game.clueSubmissions[playerId] = {
      hasSubmitted: true,
      clues: clues.map(c => c.trim()),
      submittedAt: new Date()
    };
    
    // Add clues to the pool with metadata
    for (const clue of clues) {
      game.cluePool.push({
        clue: clue.trim(),
        submittedBy: playerId,
        submittedByName: playerName
      });
    }
    
    // Mark the field as modified for Mongoose
    game.markModified('clueSubmissions');
    game.markModified('cluePool');
    
    console.log(`✅ Clues submitted by ${playerName}. Pool now has ${game.cluePool.length} clues`);
    
    // Check if all players have submitted
    const allPlayerIds = new Set();
    game.teams.forEach(team => {
      Object.keys(team.players).forEach(pid => allPlayerIds.add(pid));
    });
    
    const submittedPlayerIds = Object.keys(game.clueSubmissions).filter(
      pid => game.clueSubmissions[pid].hasSubmitted
    );
    
    console.log(`📊 Submission status: ${submittedPlayerIds.length}/${allPlayerIds.size} players`);
    
    return await game.save();
  } catch (error) {
    console.error('❌ Error in handleSubmitClues:', error);
    return game;
  }
}

module.exports = {
  handleSubmitClues
};

