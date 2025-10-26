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
    // usedCluesInPhase now stores pool indices, not strings
    const usedIndicesSet = new Set(latestGame.usedCluesInPhase || []);
    const availableCluesWithIndices = latestGame.cluePool
      .map((clueObj, index) => ({
        clue: clueObj.clue,
        submittedBy: clueObj.submittedBy,
        submittedByName: clueObj.submittedByName,
        poolIndex: index
      }))
      .filter(item => !usedIndicesSet.has(item.poolIndex));
    
    console.log(`📦 Clues available for phase ${latestGame.currentGamePhase}: ${availableCluesWithIndices.length}`);
    
    if (availableCluesWithIndices.length === 0) {
      console.log('⚠️ No more clues available in this phase');
      return latestGame;
    }
    
    // Get more clues (up to requested count or remaining clues)
    // Need to skip clues already in the queue (by pool index)
    const currentQueueIndicesSet = new Set(latestGame.currentTurn.clueQueueIndices || []);
    const additionalCluesWithIndices = availableCluesWithIndices
      .filter(item => !currentQueueIndicesSet.has(item.poolIndex))
      .slice(0, count);
    
    const additionalClues = additionalCluesWithIndices.map(item => item.clue);
    const additionalIndices = additionalCluesWithIndices.map(item => item.poolIndex);
    
    const oldQueueLength = latestGame.currentTurn.clueQueue.length;
    console.log(`➕ Adding ${additionalClues.length} clues to queue (old length: ${oldQueueLength})`);
    console.log(`   New clues:`, additionalClues.slice(0, 3), '...');
    
    // Append to existing queues (both clues and their indices)
    const newQueue = latestGame.currentTurn.clueQueue.concat(additionalClues);
    const newQueueIndices = (latestGame.currentTurn.clueQueueIndices || []).concat(additionalIndices);
    
    // Update both queues
    latestGame.currentTurn.clueQueue = newQueue;
    latestGame.currentTurn.clueQueueIndices = newQueueIndices;
    latestGame.markModified('currentTurn.clueQueue');
    latestGame.markModified('currentTurn.clueQueueIndices');
    
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
            retryGame.currentTurn.clueQueueIndices = newQueueIndices;
            retryGame.markModified('currentTurn.clueQueue');
            retryGame.markModified('currentTurn.clueQueueIndices');
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

