/**
 * Clue handlers - Manage clue correct/skip actions during gameplay
 * These are the core gameplay handlers - handle with care!
 */

async function handleClueCorrectFast(game, { word }) {
  // Keep "word" parameter for backward compatibility with client
  const clue = word;
  
  console.log('⚡ handleClueCorrectFast called:', { 
    gameId: game.id, 
    clue, 
    currentClue: game.currentTurn?.clue 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.clue) {
    console.log('⚠️ CurrentTurn not properly initialized, ignoring clue-correct action');
    console.log('CurrentTurn state:', game.currentTurn);
    return game;
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  game.currentTurn.turnScore++;
  
  game.currentTurn.turnClues.push({
    clue: clue,
    status: 'correct',
    timestamp: new Date()
  });
  
  // If this was the skipped clue, clear it (re-enable skip button)
  if (game.currentTurn.skippedClueThisTurn === clue) {
    console.log('✅ Skipped clue answered! Re-enabling skip.');
    game.currentTurn.skippedClueThisTurn = null;
  }
  
  // With clue preloading, client handles showing next clue instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current clue (for consistency)
  if (game.currentTurn.clueQueue && game.currentTurn.queueIndex < game.currentTurn.clueQueue.length) {
    game.currentTurn.clue = game.currentTurn.clueQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`⚡ Clue marked correct (fast). Queue index now: ${game.currentTurn.queueIndex}`);
  
  // Return immediately - save happens in background
  return game;
}

// Original version kept for reference (not currently used)
async function handleClueCorrect(game, { word }) {
  // Keep "word" parameter for backward compatibility with client
  const clue = word;
  
  console.log('✅ handleClueCorrect called:', { 
    gameId: game.id, 
    clue, 
    currentClue: game.currentTurn?.clue 
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.clue) {
    console.log('⚠️ CurrentTurn not properly initialized, ignoring clue-correct action');
    console.log('CurrentTurn state:', game.currentTurn);
    return game;
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  game.currentTurn.turnScore++;
  
  game.currentTurn.turnClues.push({
    clue: clue,
    status: 'correct',
    timestamp: new Date()
  });
  
  // If this was the skipped clue, clear it (re-enable skip button)
  if (game.currentTurn.skippedClueThisTurn === clue) {
    console.log('✅ Skipped clue answered! Re-enabling skip.');
    game.currentTurn.skippedClueThisTurn = null;
  }
  
  // With clue preloading, client handles showing next clue instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current clue (for consistency)
  if (game.currentTurn.clueQueue && game.currentTurn.queueIndex < game.currentTurn.clueQueue.length) {
    game.currentTurn.clue = game.currentTurn.clueQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`✅ Clue marked correct. Queue index now: ${game.currentTurn.queueIndex}`);
  
  return await game.save();
}

// Fast version: Updates in memory, returns immediately (no await on save)
async function handleClueSkipFast(game, { word }) {
  // Keep "word" parameter for backward compatibility with client
  const clue = word;
  
  console.log('⚡ handleClueSkipFast called:', { 
    gameId: game.id, 
    clue, 
    currentClue: game.currentTurn?.clue,
    skippedClue: game.currentTurn?.skippedClueThisTurn
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.clue) {
    console.log('⚠️ CurrentTurn not properly initialized, ignoring clue-skip action');
    return game;
  }
  
  // Check if already skipped a clue this turn (must answer it first!)
  if (game.currentTurn.skippedClueThisTurn) {
    console.log('❌ Already skipped a clue. Must answer skipped clue first!');
    console.log('Skipped clue:', game.currentTurn.skippedClueThisTurn);
    // Return without modifying - client should show error
    return game;
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  
  // Track which clue was skipped (no penalty in Hat Game)
  game.currentTurn.skippedClueThisTurn = clue;
  
  game.currentTurn.turnClues.push({
    clue: clue,
    status: 'skipped',
    timestamp: new Date()
  });
  
  // With clue preloading, client handles showing next clue instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current clue (for consistency)
  if (game.currentTurn.clueQueue && game.currentTurn.queueIndex < game.currentTurn.clueQueue.length) {
    game.currentTurn.clue = game.currentTurn.clueQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`⚡ Clue skipped (fast). Queue index now: ${game.currentTurn.queueIndex}`);
  console.log(`⚠️ Skip button now disabled until clue "${clue}" is answered`);
  
  // Return immediately - save happens in background
  return game;
}

// Original version kept for reference (not currently used)
async function handleClueSkip(game, { word }) {
  // Keep "word" parameter for backward compatibility with client
  const clue = word;
  
  console.log('⏭️ handleClueSkip called:', { 
    gameId: game.id, 
    clue, 
    currentClue: game.currentTurn?.clue,
    skippedClue: game.currentTurn?.skippedClueThisTurn
  });
  
  // Check if currentTurn is properly initialized
  if (!game.currentTurn || !game.currentTurn.clue) {
    console.log('⚠️ CurrentTurn not properly initialized, ignoring clue-skip action');
    return game;
  }
  
  // Check if already skipped a clue this turn (must answer it first!)
  if (game.currentTurn.skippedClueThisTurn) {
    console.log('❌ Already skipped a clue. Must answer skipped clue first!');
    console.log('Skipped clue:', game.currentTurn.skippedClueThisTurn);
    // Return without modifying - client should show error
    return game;
  }
  
  // Ensure turnScore is a valid number
  if (isNaN(game.currentTurn.turnScore) || game.currentTurn.turnScore === undefined) {
    game.currentTurn.turnScore = 0;
  }
  
  // Track which clue was skipped (no penalty in Hat Game)
  game.currentTurn.skippedClueThisTurn = clue;
  
  game.currentTurn.turnClues.push({
    clue: clue,
    status: 'skipped',
    timestamp: new Date()
  });
  
  // With clue preloading, client handles showing next clue instantly
  // Server just increments the queue index
  game.currentTurn.queueIndex = (game.currentTurn.queueIndex || 0) + 1;
  
  // Update the server's view of current clue (for consistency)
  if (game.currentTurn.clueQueue && game.currentTurn.queueIndex < game.currentTurn.clueQueue.length) {
    game.currentTurn.clue = game.currentTurn.clueQueue[game.currentTurn.queueIndex];
  }
  
  console.log(`⏭️ Clue skipped. Queue index now: ${game.currentTurn.queueIndex}`);
  console.log(`⚠️ Skip button now disabled until clue "${clue}" is answered`);
  
  return await game.save();
}

module.exports = {
  handleClueCorrectFast,
  handleClueCorrect,
  handleClueSkipFast,
  handleClueSkip
};

