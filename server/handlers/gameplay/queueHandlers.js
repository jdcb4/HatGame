/**
 * Queue handlers - Manage clue queue refilling during gameplay
 */

const Game = require('../../models/Game');

async function handleRequestMoreClues(game, { count = 10 }) {
  console.log('🔄 handleRequestMoreClues called:', { 
    gameId: game.id, 
    currentQueueLength: game.currentTurn?.clueQueue?.length,
    currentQueueIndex: game.currentTurn?.queueIndex,
    requestedCount: count
  });
  
  // Use atomic update to avoid version conflicts with concurrent clue-correct/skip operations
  // This is crucial because clue-correct and request-more-clues happen simultaneously
  
  try {
    // Reload the game to get the latest version
    const latestGame = await Game.findOne({ id: game.id });
    
    if (!latestGame || !latestGame.currentTurn) {
      console.log('❌ CurrentTurn not properly initialized, ignoring request-more-clues action');
      return game;
    }
    
    // Get available clues (not yet used in this phase)
    const usedClueSet = new Set(latestGame.usedCluesInPhase || []);
    const availableClues = latestGame.cluePool.filter(clueObj => !usedClueSet.has(clueObj.clue));
    
    console.log(`📦 Clues available for phase ${latestGame.currentGamePhase}: ${availableClues.length}`);
    
    if (availableClues.length === 0) {
      console.log('⚠️ No more clues available in this phase');
      return latestGame;
    }
    
    // Get more clues (up to requested count or remaining clues)
    // Need to skip clues already in the queue
    const currentQueueSet = new Set(latestGame.currentTurn.clueQueue || []);
    const additionalClues = availableClues
      .filter(clueObj => !currentQueueSet.has(clueObj.clue))
      .slice(0, count)
      .map(clueObj => clueObj.clue);
    
    const oldQueueLength = latestGame.currentTurn.clueQueue.length;
    console.log(`➕ Adding ${additionalClues.length} clues to queue (old length: ${oldQueueLength})`);
    console.log(`   New clues:`, additionalClues.slice(0, 3), '...');
    
    // Append to existing queue
    const newQueue = latestGame.currentTurn.clueQueue.concat(additionalClues);
    
    // Update the clue queue
    latestGame.currentTurn.clueQueue = newQueue;
    latestGame.markModified('currentTurn.clueQueue');
    
    console.log(`✅ New queue length: ${newQueue.length} (added ${newQueue.length - oldQueueLength} clues)`);
    
    // Save with retry on version conflict
    let retries = 3;
    while (retries > 0) {
      try {
        const savedGame = await latestGame.save();
        console.log(`💾 Successfully saved game with new queue (${savedGame.currentTurn.clueQueue.length} clues)`);
        return savedGame;
      } catch (err) {
        if (err.name === 'VersionError' && retries > 1) {
          console.log(`⚠️ Version conflict, retrying... (${retries - 1} attempts left)`);
          retries--;
          // Reload and try again
          const retryGame = await Game.findOne({ id: game.id });
          if (retryGame) {
            retryGame.currentTurn.clueQueue = newQueue;
            retryGame.markModified('currentTurn.clueQueue');
            Object.assign(latestGame, retryGame);
          }
        } else {
          throw err;
        }
      }
    }
    
    return latestGame;
  } catch (error) {
    console.error('❌ Error in handleRequestMoreClues:', error);
    return game; // Return original game on error
  }
}

module.exports = {
  handleRequestMoreClues,
  handleRequestMoreWords: handleRequestMoreClues // Alias for backward compatibility
};

