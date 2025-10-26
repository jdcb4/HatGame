/**
 * Word handlers - Manage word correct/skip actions during gameplay
 * These are the core gameplay handlers - handle with care!
 */

async function handleWordCorrectFast(game, { word }) {
  console.log('⚡ handleWordCorrectFast called:', { 
    gameId: game.id, 
    word, 
    currentCategory: game.currentTurn?.category,
    currentWord: game.currentTurn?.word 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring word-correct action');
    console.log('CurrentTurn state:', game.currentTurn);
    return game;
  }
  
  // Prevent duplicate word registration if the same word was just submitted
  // This fixes the issue where rapid clicking registers the same word multiple times
  // Increased to 4 seconds to account for network latency on deployed servers
  const turnWords = game.currentTurn.turnWords || [];
  if (turnWords.length > 0) {
    const lastWord = turnWords[turnWords.length - 1];
    // Check if the last word submitted is the same as the current word
    // and was submitted very recently (within 4 seconds to handle server round-trip)
    const timeSinceLastWord = new Date() - new Date(lastWord.timestamp);
    if (lastWord.word === word && timeSinceLastWord < 4000) {
      console.log('Ignoring duplicate word submission:', word);
      return game;
    }
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  game.currentTurn.turnScore++;
  
  game.currentTurn.turnWords.push({
    word: word,
    status: 'correct',
    timestamp: new Date()
  });
  
  // With word preloading, client handles showing next word instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current word (for consistency)
  if (game.currentTurn.wordQueue && game.currentTurn.queueIndex < game.currentTurn.wordQueue.length) {
    game.currentTurn.word = game.currentTurn.wordQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`⚡ Word marked correct (fast). Queue index now: ${game.currentTurn.queueIndex}`)
  
  // Return immediately - save happens in background
  return game;
}

// Original version kept for reference (not currently used)
async function handleWordCorrect(game, { word }) {
  console.log('handleWordCorrect called:', { 
    gameId: game.id, 
    word, 
    currentCategory: game.currentTurn?.category,
    currentWord: game.currentTurn?.word 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring word-correct action');
    console.log('CurrentTurn state:', game.currentTurn);
    return game;
  }
  
  // Prevent duplicate word registration if the same word was just submitted
  // This fixes the issue where rapid clicking registers the same word multiple times
  // Increased to 4 seconds to account for network latency on deployed servers
  const turnWords = game.currentTurn.turnWords || [];
  if (turnWords.length > 0) {
    const lastWord = turnWords[turnWords.length - 1];
    // Check if the last word submitted is the same as the current word
    // and was submitted very recently (within 4 seconds to handle server round-trip)
    const timeSinceLastWord = new Date() - new Date(lastWord.timestamp);
    if (lastWord.word === word && timeSinceLastWord < 4000) {
      console.log('Ignoring duplicate word submission:', word);
      return game;
    }
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  game.currentTurn.turnScore++;
  
  game.currentTurn.turnWords.push({
    word: word,
    status: 'correct',
    timestamp: new Date()
  });
  
  // With word preloading, client handles showing next word instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current word (for consistency)
  if (game.currentTurn.wordQueue && game.currentTurn.queueIndex < game.currentTurn.wordQueue.length) {
    game.currentTurn.word = game.currentTurn.wordQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`Word marked correct. Queue index now: ${game.currentTurn.queueIndex}`)
  
  return await game.save();
}

// Fast version: Updates in memory, returns immediately (no await on save)
async function handleWordSkipFast(game, { word }) {
  console.log('⚡ handleWordSkipFast called:', { 
    gameId: game.id, 
    word, 
    currentCategory: game.currentTurn?.category,
    currentWord: game.currentTurn?.word 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring word-skip action');
    return game;
  }
  
  // Prevent duplicate word registration if the same word was just submitted
  // This fixes the issue where rapid clicking registers the same word multiple times
  // Increased to 4 seconds to account for network latency on deployed servers
  const turnWords = game.currentTurn.turnWords || [];
  if (turnWords.length > 0) {
    const lastWord = turnWords[turnWords.length - 1];
    // Check if the last word submitted is the same as the current word
    // and was submitted very recently (within 4 seconds to handle server round-trip)
    const timeSinceLastWord = new Date() - new Date(lastWord.timestamp);
    if (lastWord.word === word && timeSinceLastWord < 4000) {
      console.log('Ignoring duplicate word skip:', word);
      return game;
    }
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  
  if (game.currentTurn.skipsRemaining > 0) {
    game.currentTurn.skipsRemaining--;
  } else {
    // Apply penalty for extra skip (uses gameSettings value)
    const penalty = game.gameSettings.penaltyForExtraSkip || 1;
    game.currentTurn.turnScore = Math.max(0, game.currentTurn.turnScore - penalty);
  }
  
  game.currentTurn.turnWords.push({
    word: word,
    status: 'skipped',
    timestamp: new Date()
  });
  
  // With word preloading, client handles showing next word instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current word (for consistency)
  if (game.currentTurn.wordQueue && game.currentTurn.queueIndex < game.currentTurn.wordQueue.length) {
    game.currentTurn.word = game.currentTurn.wordQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`⚡ Word skipped (fast). Queue index now: ${game.currentTurn.queueIndex}`)
  
  // Return immediately - save happens in background
  return game;
}

// Original version kept for reference (not currently used)
async function handleWordSkip(game, { word }) {
  console.log('handleWordSkip called:', { 
    gameId: game.id, 
    word, 
    currentCategory: game.currentTurn?.category,
    currentWord: game.currentTurn?.word 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.category) {
    console.log('CurrentTurn not properly initialized, ignoring word-skip action');
    return game;
  }
  
  // Prevent duplicate word registration if the same word was just submitted
  // This fixes the issue where rapid clicking registers the same word multiple times
  // Increased to 4 seconds to account for network latency on deployed servers
  const turnWords = game.currentTurn.turnWords || [];
  if (turnWords.length > 0) {
    const lastWord = turnWords[turnWords.length - 1];
    // Check if the last word submitted is the same as the current word
    // and was submitted very recently (within 4 seconds to handle server round-trip)
    const timeSinceLastWord = new Date() - new Date(lastWord.timestamp);
    if (lastWord.word === word && timeSinceLastWord < 4000) {
      console.log('Ignoring duplicate word skip:', word);
      return game;
    }
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  
  if (game.currentTurn.skipsRemaining > 0) {
    game.currentTurn.skipsRemaining--;
  } else {
    // Apply penalty for extra skip (uses gameSettings value)
    const penalty = game.gameSettings.penaltyForExtraSkip || 1;
    game.currentTurn.turnScore = Math.max(0, game.currentTurn.turnScore - penalty);
  }
  
  game.currentTurn.turnWords.push({
    word: word,
    status: 'skipped',
    timestamp: new Date()
  });
  
  // With word preloading, client handles showing next word instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current word (for consistency)
  if (game.currentTurn.wordQueue && game.currentTurn.queueIndex < game.currentTurn.wordQueue.length) {
    game.currentTurn.word = game.currentTurn.wordQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`Word skipped. Queue index now: ${game.currentTurn.queueIndex}`)
  
  return await game.save();
}

module.exports = {
  handleWordCorrectFast,
  handleWordCorrect,
  handleWordSkipFast,
  handleWordSkip
};

