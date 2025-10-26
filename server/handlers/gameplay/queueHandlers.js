/**
 * Queue handlers - Manage word queue refilling during gameplay
 */

const Game = require('../../models/Game');

async function handleRequestMoreWords(game, { count = 10 }) {
  console.log('🔄 handleRequestMoreWords called:', { 
    gameId: game.id, 
    category: game.currentTurn?.category,
    currentQueueLength: game.currentTurn?.wordQueue?.length,
    currentQueueIndex: game.currentTurn?.queueIndex,
    requestedCount: count
  });
  
  // Use atomic update to avoid version conflicts with concurrent word-correct/skip operations
  // This is crucial because word-correct and request-more-words happen simultaneously
  
  try {
    // Reload the game to get the latest version
    const latestGame = await Game.findOne({ id: game.id });
    
    if (!latestGame || !latestGame.currentTurn || !latestGame.currentTurn.category) {
      console.log('❌ CurrentTurn not properly initialized, ignoring request-more-words action');
      return game;
    }
    
    const words = latestGame.wordsByCategoryForGame[latestGame.currentTurn.category];
    console.log(`📦 Words available in category "${latestGame.currentTurn.category}": ${words ? words.length : 'undefined'}`);
    
    if (!words || words.length === 0) {
      console.log('⚠️ No more words available in category');
      return latestGame;
    }
    
    // Get more words (up to requested count or remaining words)
    const additionalCount = Math.min(count, words.length);
    const additionalWords = [];
    for (let i = 0; i < additionalCount; i++) {
      additionalWords.push(words.pop());
    }
    
    const oldQueueLength = latestGame.currentTurn.wordQueue.length;
    console.log(`➕ Adding ${additionalWords.length} words to queue (old length: ${oldQueueLength})`);
    console.log(`   New words:`, additionalWords.map(w => w.word));
    
    // Append to existing queues (both words and hints)
    const newQueue = latestGame.currentTurn.wordQueue.concat(additionalWords.map(w => w.word));
    const newHintQueue = (latestGame.currentTurn.hintQueue || []).concat(additionalWords.map(w => w.hint || ''));
    
    // Update the words array
    latestGame.wordsByCategoryForGame[latestGame.currentTurn.category] = words;
    
    // Mark fields as modified for Mongoose
    latestGame.markModified('wordsByCategoryForGame');
    latestGame.currentTurn.wordQueue = newQueue;
    latestGame.currentTurn.hintQueue = newHintQueue;
    latestGame.markModified('currentTurn.wordQueue');
    latestGame.markModified('currentTurn.hintQueue');
    
    console.log(`✅ New queue length: ${newQueue.length} (added ${newQueue.length - oldQueueLength} words)`);
    console.log(`   Queue now has:`, newQueue.slice(-5)); // Show last 5 words
    
    // Save with retry on version conflict
    let retries = 3;
    while (retries > 0) {
      try {
        const savedGame = await latestGame.save();
        console.log(`💾 Successfully saved game with new queue (${savedGame.currentTurn.wordQueue.length} words)`);
        return savedGame;
      } catch (err) {
        if (err.name === 'VersionError' && retries > 1) {
          console.log(`⚠️ Version conflict, retrying... (${retries - 1} attempts left)`);
          retries--;
          // Reload and try again
          const retryGame = await Game.findOne({ id: game.id });
          if (retryGame) {
            retryGame.currentTurn.wordQueue = newQueue;
            retryGame.currentTurn.hintQueue = newHintQueue;
            retryGame.wordsByCategoryForGame[retryGame.currentTurn.category] = words;
            retryGame.markModified('wordsByCategoryForGame');
            retryGame.markModified('currentTurn.wordQueue');
            retryGame.markModified('currentTurn.hintQueue');
            Object.assign(latestGame, retryGame);
          }
        } else {
          throw err;
        }
      }
    }
    
    return latestGame;
  } catch (error) {
    console.error('❌ Error in handleRequestMoreWords:', error);
    return game; // Return original game on error
  }
}

module.exports = {
  handleRequestMoreWords
};

