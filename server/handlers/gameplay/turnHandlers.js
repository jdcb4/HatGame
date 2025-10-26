/**
 * Turn handlers - Manage turn lifecycle (start, end, advance)
 * These are the most complex handlers as they orchestrate the entire game flow
 */

const { shuffleArray } = require('../../utils/arrayUtils');

// Global flags to prevent concurrent calls
let isStartingTurn = false;
let isEndingTurn = false;

async function handleStartTurn(game) {
  console.log('🎬 handleStartTurn called for game:', game.id);
  
  // Prevent multiple concurrent calls to handleStartTurn
  if (isStartingTurn) {
    console.log('⚠️ handleStartTurn already in progress, ignoring duplicate call');
    return game;
  }
  
  // Only prevent if currentTurn is already initialized and active
  if (game.currentTurn && game.currentTurn.clue && game.currentTurn.startTime) {
    console.log('⚠️ Turn already in progress, ignoring duplicate handleStartTurn call');
    console.log('Current turn state:', {
      clue: game.currentTurn.clue,
      startTime: game.currentTurn.startTime
    });
    return game;
  }
  
  isStartingTurn = true;
  
  try {
    console.log('🔄 Starting new turn - currentTurn state:', game.currentTurn);
  
    // Change phase to guessing
    game.currentPhase = 'guessing';
    
    const currentTeam = game.teams[game.currentTeamIndex];
    
    // Get the current describer for this team (Map keys must be strings)
    const describerIndex = game.currentDescriberIndex.get(String(game.currentTeamIndex)) || 0;
    const teamPlayerIds = Object.keys(currentTeam.players);
    const describerPlayerId = teamPlayerIds[describerIndex];
    const describerPlayerName = currentTeam.players[describerPlayerId];
    
    console.log('👤 Current describer:', { index: describerIndex, id: describerPlayerId, name: describerPlayerName });
    
    // Get available clues (clues not yet guessed in this phase)
    // usedCluesInPhase now stores pool indices, not strings
    const usedIndicesSet = new Set(game.usedCluesInPhase || []);
    const availableCluesWithIndices = game.cluePool
      .map((clueObj, index) => ({
        clue: clueObj.clue,
        submittedBy: clueObj.submittedBy,
        submittedByName: clueObj.submittedByName,
        poolIndex: index
      }))
      .filter(item => !usedIndicesSet.has(item.poolIndex));
    
    console.log(`📊 Clue status: ${availableCluesWithIndices.length} available, ${usedIndicesSet.size} used in phase ${game.currentGamePhase}`);
    
    if (availableCluesWithIndices.length === 0) {
      console.log('⚠️ No available clues - phase should have transitioned already!');
      // This shouldn't happen, but handle gracefully
      game.status = 'finished';
      return await game.save();
    }
    
    // Preload 15 clues for client-side queue (optimistic updates)
    const queueSize = Math.min(15, availableCluesWithIndices.length);
    const clueQueue = [];
    const clueQueueIndices = []; // Track pool indices for each queue item
    for (let i = 0; i < queueSize; i++) {
      clueQueue.push(availableCluesWithIndices[i].clue);
      clueQueueIndices.push(availableCluesWithIndices[i].poolIndex);
    }
    
    console.log('✅ Preloaded clues in queue:', clueQueue.length);
    console.log('🎯 First clue:', clueQueue[0]);
    
    game.currentTurn = {
      clue: clueQueue[0],
      clueQueue: clueQueue,  // Send clue strings to client
      clueQueueIndices: clueQueueIndices,  // Track which pool indices are in queue
      queueIndex: 0,  // Track position in queue
      startTime: new Date(),
      timeLeft: game.gameSettings.turnDuration,
      turnClues: [],
      skipsRemaining: game.gameSettings.skipsPerTurn,
      skippedClueThisTurn: null,  // Track the one skipped clue
      turnScore: 0,
      describerPlayerId: describerPlayerId,
      describerPlayerName: describerPlayerName
    };
    
    return await game.save();
  } finally {
    isStartingTurn = false;
  }
}

async function handleEndTurn(game) {
  console.log('🏁 handleEndTurn called for game:', game.id);
  
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
      console.log('⚠️ No currentTurn found, creating empty turn data');
      game.currentTurn = {
        turnScore: 0,
        turnClues: [],
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
    
    // Add turn's correct clues to usedCluesInPhase (using pool indices)
    const correctClues = (game.currentTurn.turnClues || []).filter(tc => tc.status === 'correct');
    
    // For each correct clue, add its pool index to usedCluesInPhase
    for (const turnClue of correctClues) {
      const poolIndex = turnClue.poolIndex;
      if (poolIndex !== undefined && !game.usedCluesInPhase.includes(poolIndex)) {
        game.usedCluesInPhase.push(poolIndex);
      }
    }
    
    console.log(`📊 Phase ${game.currentGamePhase} progress: ${game.usedCluesInPhase.length}/${game.cluePool.length} clues used`);
    
    // Check if phase is complete (all clues have been guessed)
    let phaseCompleted = false;
    let completedPhaseNum = null;
    
    if (game.usedCluesInPhase.length >= game.cluePool.length) {
      console.log(`🎉 Phase ${game.currentGamePhase} complete! All clues guessed.`);
      phaseCompleted = true;
      completedPhaseNum = game.currentGamePhase;
      
      // Advance to next phase or end game
      if (game.currentGamePhase < 3) {
        game.currentGamePhase++;
        game.usedCluesInPhase = [];  // Reset for next phase
        game.markModified('usedCluesInPhase');
        console.log(`🎮 Advancing to Phase ${game.currentGamePhase}`);
      } else {
        // Phase 3 is complete - game is finished!
        console.log('🏆 Phase 3 complete - Game finished!');
        game.status = 'finished';
      }
    }
    
    // Store the completed turn data for the Ready screen to display
    game.lastCompletedTurn = {
      teamIndex: game.currentTeamIndex,
      teamName: game.teams[game.currentTeamIndex].name,
      describerPlayerId: game.currentTurn.describerPlayerId,
      describerPlayerName: game.currentTurn.describerPlayerName,
      score: turnScore,
      turnClues: game.currentTurn.turnClues || [],
      phaseCompleted: phaseCompleted,
      completedPhase: completedPhaseNum
    };
    
    console.log('✅ Last completed turn saved:', {
      team: game.lastCompletedTurn.teamName,
      score: game.lastCompletedTurn.score,
      phaseCompleted: game.lastCompletedTurn.phaseCompleted
    });
    
    // Clear current turn (phase will show Ready screen now)
    game.currentTurn = null;
    
    // Rotate describer for the team that just played (Map keys must be strings)
    const currentTeam = game.teams[game.currentTeamIndex];
    const teamPlayerIds = Object.keys(currentTeam.players);
    const teamIndexStr = String(game.currentTeamIndex);
    const currentDescriberIndex = game.currentDescriberIndex.get(teamIndexStr) || 0;
    const nextDescriberIndex = (currentDescriberIndex + 1) % teamPlayerIds.length;
    game.currentDescriberIndex.set(teamIndexStr, nextDescriberIndex);
    console.log(`🔄 Team ${game.currentTeamIndex} describer rotated from ${currentDescriberIndex} to ${nextDescriberIndex}`);
    
    // Move to next team
    const previousTeamIndex = game.currentTeamIndex;
    game.currentTeamIndex = (game.currentTeamIndex + 1) % game.teams.length;
    
    // Check if round is complete
    if (game.currentTeamIndex === 0) {
      game.currentRound++;
      console.log(`📈 Round incremented to ${game.currentRound}`);
    }
    
    // Set phase to ready for the next team
    game.currentPhase = 'ready';
    
    console.log(`✅ Turn ended: Team ${previousTeamIndex} → Team ${game.currentTeamIndex}, Phase: ready, Round: ${game.currentRound}, GamePhase: ${game.currentGamePhase}`);
    
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

