import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const GameScreen = ({ playerId, playerName }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, fetchGame, emitGameAction, loading, error, setError } = useGame();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDescriber, setIsDescriber] = useState(false);
  const [isCurrentTeam, setIsCurrentTeam] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Local clue queue for optimistic updates (instant feedback)
  const [localClueQueue, setLocalClueQueue] = useState([]);
  const [localClueIndex, setLocalClueIndex] = useState(0);

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);
  
  // Initialize clue queue when turn starts
  useEffect(() => {
    if (game?.currentTurn?.clueQueue && game?.currentTurn?.startTime) {
      console.log('✅ Initializing clue queue:', {
        queueLength: game.currentTurn.clueQueue.length,
        serverIndex: game.currentTurn.queueIndex || 0,
        firstClue: game.currentTurn.clueQueue[0]
      });
      setLocalClueQueue(game.currentTurn.clueQueue);
      setLocalClueIndex(game.currentTurn.queueIndex || 0);
    }
  }, [game?.currentTurn?.startTime]); // Only reinitialize when a new turn starts
  
  // Request more clues when queue is running low (8 clues left - request earlier!)
  // Use a ref to track if we've already requested to avoid multiple requests
  const hasRequestedMore = React.useRef(false);
  
  useEffect(() => {
    if (localClueQueue.length > 0 && localClueIndex >= 0) {
      const cluesRemaining = localClueQueue.length - localClueIndex;
      console.log(`📊 Queue status: index=${localClueIndex}, total=${localClueQueue.length}, remaining=${cluesRemaining}`);
      
      // Request earlier (at 8 clues) to give time for server round-trip
      if (cluesRemaining <= 8 && cluesRemaining > 0 && !hasRequestedMore.current) {
        console.log(`⚠️ Only ${cluesRemaining} clues left in queue, requesting more...`);
        emitGameAction('request-more-words', { count: 10 });
        hasRequestedMore.current = true;
      }
      
      // Reset flag when we have plenty of clues again (more than 12)
      if (cluesRemaining > 12) {
        hasRequestedMore.current = false;
      }
    }
  }, [localClueIndex, localClueQueue.length]);
  
  // Update local queue when server sends more clues
  useEffect(() => {
    if (game?.currentTurn?.clueQueue && Array.isArray(game.currentTurn.clueQueue)) {
      const serverQueueLength = game.currentTurn.clueQueue.length;
      const localQueueLength = localClueQueue.length;
      
      console.log('🔍 Checking queue sync:', {
        serverLength: serverQueueLength,
        localLength: localQueueLength,
        localIndex: localClueIndex,
        serverQueuePreview: game.currentTurn.clueQueue.slice(0, 3),
        localQueuePreview: localClueQueue.slice(0, 3)
      });
      
      // Update if server has more clues OR if local queue is empty
      if (serverQueueLength > localQueueLength || localQueueLength === 0) {
        console.log('✅ Server has more clues! Updating local queue from', localQueueLength, 'to', serverQueueLength);
        setLocalClueQueue([...game.currentTurn.clueQueue]); // Create new array to trigger re-render
        // Reset the request flag since we got new clues
        hasRequestedMore.current = false;
      } else {
        console.log('   No update needed (server:', serverQueueLength, 'local:', localQueueLength, ')');
      }
    }
  }, [game?.currentTurn?.clueQueue, game?.currentTurn]); // Watch the whole clueQueue object

  // Navigate to ready screen when phase changes to 'ready'
  useEffect(() => {
    if (game && game.currentPhase === 'ready' && !game.currentTurn) {
      console.log('GameScreen: Phase is ready, navigating to ready screen');
      navigate(`/ready/${gameId}`);
    }
  }, [game?.currentPhase, game?.currentTurn, gameId, navigate]);

  useEffect(() => {
    if (game && game.status === 'in-progress') {
      console.log('GameScreen: Game in progress, currentTurn:', game.currentTurn);
      
      // Server should handle turn initialization automatically
      // No need to call handleStartTurn from client

      console.log('GameScreen: CurrentTurn exists:', {
        category: game.currentTurn?.category,
        word: game.currentTurn?.word,
        startTime: game.currentTurn?.startTime,
        timeLeft: game.currentTurn?.timeLeft
      });

      // Use client-side timer only (don't rely on server timestamps to avoid clock skew)
      // Just use the duration from settings
      const turnDuration = game.gameSettings?.turnDuration || 30;
      setTimeLeft(turnDuration);

      // Determine player role
      const currentTeam = game.teams[game.currentTeamIndex];
      const isOnCurrentTeam = currentTeam.players[playerId];
      setIsCurrentTeam(isOnCurrentTeam);
      
      // Check if player is the describer using game state
      const isPlayerDescriber = game.currentTurn?.describerPlayerId === playerId;
      setIsDescriber(isPlayerDescriber);
      
      console.log('GameScreen: Player role determined:', { 
        playerId, 
        isOnCurrentTeam, 
        isPlayerDescriber,
        describerPlayerId: game.currentTurn?.describerPlayerId
      });

      // Start timer countdown (client-side only, no server timestamp dependency)
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            clearInterval(timer);
            handleEndTurn();
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [game?.currentTurn?.startTime, game?.status]); // Only rerun when turn starts, not on every game update

  // Server handles turn initialization automatically

  const handleWordCorrect = () => {
    // Optimistic update: show next clue instantly!
    if (game.currentTurn && !isProcessingAction && localClueQueue.length > 0) {
      // Safety check: don't go past the end of the queue
      if (localClueIndex >= localClueQueue.length) {
        console.warn('⚠️ Already at end of clue queue, cannot advance');
        return;
      }
      
      setIsProcessingAction(true);
      
      const currentClue = localClueQueue[localClueIndex] || game.currentTurn.clue;
      const nextIndex = localClueIndex + 1;
      
      // INSTANT: Move to next clue locally (0ms delay!)
      setLocalClueIndex(nextIndex);
      
      // Background: Send action to server for scoring/validation
      emitGameAction('word-correct', { 
        word: currentClue,  // Keep 'word' for backward compatibility
        queueIndex: localClueIndex 
      });
      
      // Re-enable buttons quickly (200ms) since we don't wait for server
      setTimeout(() => setIsProcessingAction(false), 200);
      
      console.log('✅ Optimistic correct:', { 
        clue: currentClue, 
        oldIndex: localClueIndex,
        newIndex: nextIndex,
        nextClue: localClueQueue[nextIndex],
        queueLength: localClueQueue.length,
        remaining: localClueQueue.length - nextIndex
      });
    }
  };

  const handleWordSkip = () => {
    // Check if already skipped a clue (can't skip twice until answering the first)
    if (game.currentTurn?.skippedClueThisTurn) {
      setError('Must answer the skipped clue before skipping another!');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Optimistic update: show next clue instantly!
    if (game.currentTurn && !isProcessingAction && localClueQueue.length > 0) {
      // Safety check: don't go past the end of the queue
      if (localClueIndex >= localClueQueue.length) {
        console.warn('⚠️ Already at end of clue queue, cannot advance');
        return;
      }
      
      setIsProcessingAction(true);
      
      const currentClue = localClueQueue[localClueIndex] || game.currentTurn.clue;
      
      // Move the skipped clue to the end of the local queue (matches server behavior)
      const updatedQueue = [...localClueQueue];
      updatedQueue.splice(localClueIndex, 1); // Remove from current position
      updatedQueue.push(currentClue); // Add to end
      setLocalClueQueue(updatedQueue);
      
      // Index stays the same (next clue is now at current index)
      // No need to change localClueIndex
      
      // Background: Send action to server for scoring/validation
      emitGameAction('word-skip', { 
        word: currentClue,  // Keep 'word' for backward compatibility
        queueIndex: localClueIndex 
      });
      
      // Re-enable buttons quickly (200ms) since we don't wait for server
      setTimeout(() => setIsProcessingAction(false), 200);
      
      console.log('⏭️ Optimistic skip:', { 
        clue: currentClue, 
        indexStaysAt: localClueIndex,
        movedToEnd: currentClue,
        nextClue: updatedQueue[localClueIndex],
        queueLength: updatedQueue.length
      });
    }
  };

  const handleEndTurn = () => {
    console.log('GameScreen: Ending turn');
    emitGameAction('end-turn', {});
    // Don't navigate immediately - let the game state update first
    // Navigation will happen in useEffect when currentPhase changes to 'ready'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Game Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Game hasn't started yet
  if (game.status === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Game Not Started</h2>
          <p className="text-slate-600 mb-4">The game is still in the lobby.</p>
          <button
            onClick={() => navigate(`/lobby/${gameId}`)}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Game is finished
  if (game.status === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Game Finished</h2>
          <button
            onClick={() => navigate(`/gameover/${gameId}`)}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // If no current turn, show loading (navigation handled in useEffect)
  if (!game.currentTurn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading turn...</p>
        </div>
      </div>
    );
  }

  // Show loading state if game is in progress but no current turn yet
  if (game.status === 'in-progress' && !game.currentTurn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Starting Game...
            </h2>
            <p className="text-slate-500 mb-6">
              Preparing the first turn
            </p>
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game screen
  const currentTeam = game.teams[game.currentTeamIndex];
  
  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg h-[95vh] sm:h-[90vh] max-h-[700px] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-3 mb-3 relative">
            <div className="text-left">
              <p className="font-bold text-lg sm:text-xl text-slate-800">{currentTeam.name}</p>
              <p className="text-xs sm:text-sm font-bold text-indigo-600 mt-1">
                {game.currentGamePhase === 1 && 'Phase 1: Describe'}
                {game.currentGamePhase === 2 && 'Phase 2: One Word'}
                {game.currentGamePhase === 3 && 'Phase 3: Charades'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {/* End Turn Early Button - small icon (only for describer) */}
              {isDescriber && (
                <button
                  onClick={handleEndTurn}
                  title="End Turn Early"
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    End Turn Early
                  </span>
                </button>
              )}
              <div className="text-4xl sm:text-5xl font-bold text-indigo-600">{isNaN(timeLeft) ? 0 : timeLeft}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 rounded-lg p-4 sm:p-6 min-h-0">
            {isDescriber ? (
              // Describer view
              <>
                <h2 className="font-bold text-slate-900 mb-3 break-words text-center text-3xl sm:text-4xl md:text-5xl leading-tight px-2">
                  {localClueQueue[localClueIndex] || game.currentTurn?.clue || 'Loading...'}
                </h2>
                <p className="text-base sm:text-lg text-indigo-600 font-medium mb-2">
                  {game.currentGamePhase === 1 && '💬 Use as many words as you want!'}
                  {game.currentGamePhase === 2 && '⚠️ Say exactly ONE WORD only!'}
                  {game.currentGamePhase === 3 && '🤫 SILENT - Act it out!'}
                </p>
                {game.currentTurn?.skippedClueThisTurn && (
                  <div className="mt-2 p-2 bg-amber-100 border-2 border-amber-400 rounded-lg">
                    <p className="text-xs sm:text-sm text-amber-900 font-bold">
                      ⚠️ Skipped: "{game.currentTurn.skippedClueThisTurn}"
                    </p>
                    <p className="text-xs text-amber-700">Must answer this before skipping again</p>
                  </div>
                )}
              </>
            ) : isCurrentTeam ? (
              // Same team guessing view
              <>
                <h2 className="font-bold text-slate-900 mb-2 text-center text-xl sm:text-2xl">
                  Your team is guessing!
                </h2>
                <p className="text-base sm:text-lg text-indigo-600 font-medium mb-3">
                  {game.currentGamePhase === 1 && 'Listen and guess the person!'}
                  {game.currentGamePhase === 2 && 'One word clue - guess the person!'}
                  {game.currentGamePhase === 3 && 'Watch the charades!'}
                </p>
                <div className="text-center text-slate-600 text-sm sm:text-base">
                  <p className="text-xs sm:text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
                
                {/* Clue list for guessers */}
                {game.currentTurn?.turnClues && game.currentTurn.turnClues.length > 0 && (
                  <div className="mt-4 w-full max-w-md">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 text-center">Clues this turn:</h3>
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                      {game.currentTurn.turnClues.map((clue, index) => (
                        <div key={index} className="flex justify-between items-center text-xs sm:text-sm px-2 py-1 rounded hover:bg-slate-50">
                          <span className="truncate mr-2 text-slate-700">{clue.clue}</span>
                          <span className={`font-bold flex-shrink-0 ${
                            clue.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {clue.status === 'correct' ? '✓' : '⊘'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Opposing team waiting view
              <>
                <h2 className="font-bold text-slate-900 mb-2 text-center text-xl sm:text-2xl">
                  Waiting for {currentTeam.name}
                </h2>
                <p className="text-base sm:text-lg text-indigo-600 font-medium mb-3">
                  {game.currentGamePhase === 1 && 'They are describing'}
                  {game.currentGamePhase === 2 && 'One word only!'}
                  {game.currentGamePhase === 3 && 'Silent charades'}
                </p>
                <div className="text-center text-slate-600 text-sm sm:text-base">
                  <p>It's their turn to guess clues</p>
                  <p className="text-xs sm:text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
                
                {/* Clue list for spectators */}
                {game.currentTurn?.turnClues && game.currentTurn.turnClues.length > 0 && (
                  <div className="mt-4 w-full max-w-md">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 text-center">Clues this turn:</h3>
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                      {game.currentTurn.turnClues.map((clue, index) => (
                        <div key={index} className="flex justify-between items-center text-xs sm:text-sm px-2 py-1 rounded hover:bg-slate-50">
                          <span className="truncate mr-2 text-slate-700">{clue.clue}</span>
                          <span className={`font-bold flex-shrink-0 ${
                            clue.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {clue.status === 'correct' ? '✓' : '⊘'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Score and Controls */}
          <div className="flex justify-between items-center mt-3 text-slate-600 text-sm sm:text-base">
            <p>Skips: <span className="font-bold">{game.currentTurn?.skipsRemaining ?? 0}</span></p>
            <p>Score: <span className="font-bold">{game.currentTurn?.turnScore ?? 0}</span></p>
          </div>

          {/* Action Buttons (only for describer) */}
          {isDescriber && (
            <>
              {/* Skip and Correct Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                <button
                  onClick={handleWordSkip}
                  disabled={isProcessingAction || !!game.currentTurn?.skippedClueThisTurn}
                  className="bg-amber-500 text-white font-bold py-3 sm:py-4 rounded-lg text-base sm:text-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Skip
                </button>
                <button
                  onClick={handleWordCorrect}
                  disabled={isProcessingAction}
                  className="bg-emerald-600 text-white font-bold py-3 sm:py-4 rounded-lg text-base sm:text-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Correct
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
