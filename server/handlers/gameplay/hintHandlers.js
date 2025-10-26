/**
 * Hint handlers - Manage hint usage during gameplay
 */

async function handleUseHintFast(game, { queueIndex }) {
  console.log('⚡ handleUseHintFast called:', {
    gameId: game.id,
    queueIndex,
    hintsRemaining: game.currentTurn?.hintsRemaining
  });
  
  // Check if currentTurn exists
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring use-hint action');
    return game;
  }
  
  // Check if hints are available
  if (!game.currentTurn.hintsRemaining || game.currentTurn.hintsRemaining <= 0) {
    console.log('No hints remaining, ignoring use-hint action');
    return game;
  }
  
  // Decrement hints remaining
  game.currentTurn.hintsRemaining--;
  
  console.log(`⚡ Hint used (fast). Hints remaining: ${game.currentTurn.hintsRemaining}`);
  
  // Return immediately - save happens in background
  return game;
}

// Original version kept for reference (not currently used)
async function handleUseHint(game, { queueIndex }) {
  console.log('💡 handleUseHint called:', {
    gameId: game.id,
    queueIndex,
    hintsRemaining: game.currentTurn?.hintsRemaining
  });
  
  // Check if currentTurn exists
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring use-hint action');
    return game;
  }
  
  // Check if hints are available
  if (!game.currentTurn.hintsRemaining || game.currentTurn.hintsRemaining <= 0) {
    console.log('No hints remaining, ignoring use-hint action');
    return game;
  }
  
  // Decrement hints remaining
  game.currentTurn.hintsRemaining--;
  
  console.log(`✅ Hint used. Hints remaining: ${game.currentTurn.hintsRemaining}`);
  
  return await game.save();
}

module.exports = {
  handleUseHintFast,
  handleUseHint
};

