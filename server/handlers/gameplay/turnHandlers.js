/**
 * Turn handlers - Manage turn lifecycle (start, end, advance)
 * These are the most complex handlers as they orchestrate the entire game flow
 */

const { shuffleArray } = require('../../utils/arrayUtils');

// Global flags to prevent concurrent calls
let isStartingTurn = false;
let isEndingTurn = false;

async function handleStartTurn(game) {
  console.log('handleStartTurn called for game:', game.id);
  
  // Prevent multiple concurrent calls to handleStartTurn
  if (isStartingTurn) {
    console.log('handleStartTurn already in progress, ignoring duplicate call');
    return game;
  }
  
  // Only prevent if currentTurn is already initialized and active
  if (game.currentTurn && game.currentTurn.category && game.currentTurn.startTime) {
    console.log('Turn already in progress, ignoring duplicate handleStartTurn call');
    console.log('Current turn state:', {
      category: game.currentTurn.category,
      word: game.currentTurn.word,
      startTime: game.currentTurn.startTime
    });
    return game;
  }
  
  isStartingTurn = true;
  
  try {
    console.log('Starting new turn - currentTurn state:', game.currentTurn);
  
  // Change phase to guessing
  game.currentPhase = 'guessing';
  
  console.log('Current team index:', game.currentTeamIndex);
  console.log('WordsByCategoryForGame keys:', Object.keys(game.wordsByCategoryForGame));
  
  const currentTeam = game.teams[game.currentTeamIndex];
  
  // Get the current describer for this team (Map keys must be strings)
  const describerIndex = game.currentDescriberIndex.get(String(game.currentTeamIndex)) || 0;
  const teamPlayerIds = Object.keys(currentTeam.players);
  const describerPlayerId = teamPlayerIds[describerIndex];
  const describerPlayerName = currentTeam.players[describerPlayerId];
  
  console.log('Current describer:', { index: describerIndex, id: describerPlayerId, name: describerPlayerName });
  const availableCategories = Object.keys(game.wordsByCategoryForGame).filter(
    cat => game.wordsByCategoryForGame[cat].length > 0
  );
  
  console.log('Available categories:', availableCategories);
  
  if (availableCategories.length === 0) {
    console.log('No available categories, checking if game should end');
    
    // Check if all teams have completed the same number of rounds
    const totalRoundsCompleted = game.currentRound - 1; // Subtract 1 because we're starting a new round
    console.log(`Total rounds completed: ${totalRoundsCompleted}, Required: ${game.gameSettings.totalRounds}`);
    
    if (totalRoundsCompleted >= game.gameSettings.totalRounds) {
      console.log('All teams have completed required rounds, ending game');
      game.status = 'finished';
      return await game.save();
    } else {
      console.log('Not all teams have completed required rounds, reshuffling words');
      // Reshuffle all words and continue
      const wordsByCategory = require('../../data/words');
      game.wordsByCategoryForGame = {};
      
      // Copy and shuffle words in each category
      for (const [category, words] of Object.entries(wordsByCategory)) {
        const shuffledWords = [...words];
        shuffleArray(shuffledWords);
        game.wordsByCategoryForGame[category] = shuffledWords;
      }
      
      // Mark the wordsByCategoryForGame field as modified for Mongoose
      game.markModified('wordsByCategoryForGame');
      
      // Update available categories after reshuffling
      const newAvailableCategories = Object.keys(game.wordsByCategoryForGame).filter(
        cat => game.wordsByCategoryForGame[cat].length > 0
      );
      
      if (newAvailableCategories.length === 0) {
        console.log('Still no words available after reshuffling, ending game');
        game.status = 'finished';
        return await game.save();
      }
      
      // Use the reshuffled categories
      availableCategories.length = 0;
      availableCategories.push(...newAvailableCategories);
      console.log('Reshuffled categories:', availableCategories);
    }
  }
  
  const selectedCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
  const words = game.wordsByCategoryForGame[selectedCategory];
  
  // Preload 15 words for client-side queue (optimistic updates)
  const queueSize = Math.min(15, words.length);
  const wordQueue = [];
  for (let i = 0; i < queueSize; i++) {
    wordQueue.push(words.pop());
  }
  
  console.log('Selected category:', selectedCategory);
  console.log('Preloaded words in queue:', wordQueue.length);
  console.log('First word:', wordQueue[0].word);
  console.log('Words remaining in category:', words.length);
  
  game.currentTurn = {
    category: selectedCategory,
    word: wordQueue[0].word,
    wordQueue: wordQueue.map(w => w.word),  // Send word strings to client
    hintQueue: wordQueue.map(w => w.hint || ''),  // Send hint strings to client
    queueIndex: 0,  // Track position in queue
    startTime: new Date(),
    timeLeft: game.gameSettings.turnDuration,
    turnWords: [],
    skipsRemaining: game.gameSettings.skipsPerTurn,
    hintsRemaining: game.gameSettings.hintsPerTurn,  // Initialize hints for the turn
    turnScore: 0,
    describerPlayerId: describerPlayerId,
    describerPlayerName: describerPlayerName
  };
  
  // Update the words array after taking queue
  game.wordsByCategoryForGame[selectedCategory] = words;
  
  // Mark the wordsByCategoryForGame field as modified for Mongoose
  game.markModified('wordsByCategoryForGame');
  
  return await game.save();
  } finally {
    isStartingTurn = false;
  }
}

async function handleEndTurn(game) {
  console.log('handleEndTurn called for game:', game.id);
  
  // Prevent multiple concurrent calls to handleEndTurn
  if (isEndingTurn) {
    console.log('⚠️ handleEndTurn already in progress, ignoring duplicate call');
    return game;
  }
  
  isEndingTurn = true;
  
  try {
    console.log('Current turn state:', game.currentTurn);
    console.log('Current team index:', game.currentTeamIndex);
    
    // Check if currentTurn exists
    if (!game.currentTurn) {
      console.log('No currentTurn found, creating empty turn data');
      // Create empty turn data if currentTurn is missing
      game.currentTurn = {
        turnScore: 0,
        turnWords: [],
        category: 'unknown',
        describerPlayerId: 'unknown',
        describerPlayerName: 'Unknown'
      };
    }
  
  // Ensure turnScore is a valid number before adding to team score
  const turnScore = isNaN(game.currentTurn.turnScore) ? 0 : game.currentTurn.turnScore;
  
  // Ensure team score is a valid number
  if (isNaN(game.teams[game.currentTeamIndex].score)) {
    game.teams[game.currentTeamIndex].score = 0;
  }
  
  // Add turn score to team score
  game.teams[game.currentTeamIndex].score += turnScore;
  
  // Store the completed turn data for the Ready screen to display
  game.lastCompletedTurn = {
    category: game.currentTurn.category,
    teamIndex: game.currentTeamIndex,
    teamName: game.teams[game.currentTeamIndex].name,
    describerPlayerId: game.currentTurn.describerPlayerId,
    describerPlayerName: game.currentTurn.describerPlayerName,
    score: turnScore,
    turnWords: game.currentTurn.turnWords || []
  };
  
  console.log('Last completed turn saved:', game.lastCompletedTurn);
  
  // Clear current turn (phase will show Ready screen now)
  game.currentTurn = null;
  
  // Rotate describer for the team that just played (Map keys must be strings)
  const currentTeam = game.teams[game.currentTeamIndex];
  const teamPlayerIds = Object.keys(currentTeam.players);
  const teamIndexStr = String(game.currentTeamIndex);
  const currentDescriberIndex = game.currentDescriberIndex.get(teamIndexStr) || 0;
  const nextDescriberIndex = (currentDescriberIndex + 1) % teamPlayerIds.length;
  game.currentDescriberIndex.set(teamIndexStr, nextDescriberIndex);
  console.log(`Team ${game.currentTeamIndex} describer rotated from ${currentDescriberIndex} to ${nextDescriberIndex}`);
  
  // Move to next team
  const previousTeamIndex = game.currentTeamIndex;
  game.currentTeamIndex = (game.currentTeamIndex + 1) % game.teams.length;
  
  // Check if round is complete
  if (game.currentTeamIndex === 0) {
    game.currentRound++;
    
    // Check if game is finished
    if (game.currentRound > game.gameSettings.totalRounds) {
      console.log('Game finished - all rounds completed');
      game.status = 'finished';
      // Keep phase as 'ready' so players see final turn results
      // They will navigate to game over from the Ready screen
      game.currentPhase = 'ready';
      const savedGame = await game.save();
      console.log('Saved finished game with:', {
        status: savedGame.status,
        currentPhase: savedGame.currentPhase,
        hasLastCompletedTurn: !!savedGame.lastCompletedTurn,
        lastCompletedTurnTeam: savedGame.lastCompletedTurn?.teamName,
        lastCompletedTurnScore: savedGame.lastCompletedTurn?.score
      });
      return savedGame;
    }
  }
  
  // Set phase to ready for the next team
  game.currentPhase = 'ready';
  
  console.log(`Turn ended: Team ${previousTeamIndex} → Team ${game.currentTeamIndex}, Phase: ready, Round: ${game.currentRound}`);
  
  // Next team will start when their describer clicks "Start Your Turn"
  const savedGame = await game.save();
  return savedGame;
  
  } finally {
    isEndingTurn = false;
  }
}

async function handleNextTurn(game) {
  console.log('handleNextTurn called - delegating to handleStartTurn');
  // The team advancement and phase change now happen in handleEndTurn
  // This function just starts the turn for the current team
  return await handleStartTurn(game);
}

module.exports = {
  handleStartTurn,
  handleEndTurn,
  handleNextTurn
};

