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
  
  // Local word queue for optimistic updates (instant feedback)
  const [localWordQueue, setLocalWordQueue] = useState([]);
  const [localWordIndex, setLocalWordIndex] = useState(0);
  
  // Hint functionality
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState('');

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);
  
  // Initialize word queue when turn starts
  useEffect(() => {
    if (game?.currentTurn?.wordQueue && game?.currentTurn?.startTime) {
      console.log('Initializing word queue:', {
        queueLength: game.currentTurn.wordQueue.length,
        serverIndex: game.currentTurn.queueIndex || 0,
        firstWord: game.currentTurn.wordQueue[0]
      });
      setLocalWordQueue(game.currentTurn.wordQueue);
      setLocalWordIndex(game.currentTurn.queueIndex || 0);
    }
  }, [game?.currentTurn?.startTime]); // Only reinitialize when a new turn starts
  
  // Clear hint when word changes
  useEffect(() => {
    setShowHint(false);
    setCurrentHint('');
  }, [localWordIndex]);
  
  // Request more words when queue is running low (8 words left - request earlier!)
  // Use a ref to track if we've already requested to avoid multiple requests
  const hasRequestedMore = React.useRef(false);
  
  useEffect(() => {
    if (localWordQueue.length > 0 && localWordIndex >= 0) {
      const wordsRemaining = localWordQueue.length - localWordIndex;
      console.log(`📊 Queue status: index=${localWordIndex}, total=${localWordQueue.length}, remaining=${wordsRemaining}`);
      
      // Request earlier (at 8 words) to give time for server round-trip
      if (wordsRemaining <= 8 && wordsRemaining > 0 && !hasRequestedMore.current) {
        console.log(`⚠️ Only ${wordsRemaining} words left in queue, requesting more...`);
        emitGameAction('request-more-words', { count: 10 });
        hasRequestedMore.current = true;
      }
      
      // Reset flag when we have plenty of words again (more than 12)
      if (wordsRemaining > 12) {
        hasRequestedMore.current = false;
      }
    }
  }, [localWordIndex, localWordQueue.length]);
  
  // Update local queue when server sends more words
  useEffect(() => {
    if (game?.currentTurn?.wordQueue && Array.isArray(game.currentTurn.wordQueue)) {
      const serverQueueLength = game.currentTurn.wordQueue.length;
      const localQueueLength = localWordQueue.length;
      
      console.log('🔍 Checking queue sync:', {
        serverLength: serverQueueLength,
        localLength: localQueueLength,
        localIndex: localWordIndex,
        serverQueuePreview: game.currentTurn.wordQueue.slice(0, 3),
        localQueuePreview: localWordQueue.slice(0, 3)
      });
      
      // Update if server has more words OR if local queue is empty
      if (serverQueueLength > localQueueLength || localQueueLength === 0) {
        console.log('✅ Server has more words! Updating local queue from', localQueueLength, 'to', serverQueueLength);
        setLocalWordQueue([...game.currentTurn.wordQueue]); // Create new array to trigger re-render
        // Reset the request flag since we got new words
        hasRequestedMore.current = false;
      } else {
        console.log('   No update needed (server:', serverQueueLength, 'local:', localQueueLength, ')');
      }
    }
  }, [game?.currentTurn?.wordQueue, game?.currentTurn]); // Watch the whole wordQueue object

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
    // Optimistic update: show next word instantly!
    if (game.currentTurn && !isProcessingAction && localWordQueue.length > 0) {
      // Safety check: don't go past the end of the queue
      if (localWordIndex >= localWordQueue.length) {
        console.warn('⚠️ Already at end of word queue, cannot advance');
        return;
      }
      
      setIsProcessingAction(true);
      
      const currentWord = localWordQueue[localWordIndex] || game.currentTurn.word;
      const nextIndex = localWordIndex + 1;
      
      // INSTANT: Move to next word locally (0ms delay!)
      setLocalWordIndex(nextIndex);
      
      // Background: Send action to server for scoring/validation
      emitGameAction('word-correct', { 
        word: currentWord,
        queueIndex: localWordIndex 
      });
      
      // Re-enable buttons quickly (200ms) since we don't wait for server
      setTimeout(() => setIsProcessingAction(false), 200);
      
      console.log('✅ Optimistic correct:', { 
        word: currentWord, 
        oldIndex: localWordIndex,
        newIndex: nextIndex,
        nextWord: localWordQueue[nextIndex],
        queueLength: localWordQueue.length,
        remaining: localWordQueue.length - nextIndex
      });
    }
  };

  const handleWordSkip = () => {
    // Optimistic update: show next word instantly!
    if (game.currentTurn && !isProcessingAction && localWordQueue.length > 0) {
      // Safety check: don't go past the end of the queue
      if (localWordIndex >= localWordQueue.length) {
        console.warn('⚠️ Already at end of word queue, cannot advance');
        return;
      }
      
      setIsProcessingAction(true);
      
      const currentWord = localWordQueue[localWordIndex] || game.currentTurn.word;
      const nextIndex = localWordIndex + 1;
      
      // INSTANT: Move to next word locally (0ms delay!)
      setLocalWordIndex(nextIndex);
      
      // Background: Send action to server for scoring/validation
      emitGameAction('word-skip', { 
        word: currentWord,
        queueIndex: localWordIndex 
      });
      
      // Re-enable buttons quickly (200ms) since we don't wait for server
      setTimeout(() => setIsProcessingAction(false), 200);
      
      console.log('⏭️ Optimistic skip:', { 
        word: currentWord, 
        oldIndex: localWordIndex,
        newIndex: nextIndex,
        nextWord: localWordQueue[nextIndex],
        queueLength: localWordQueue.length,
        remaining: localWordQueue.length - nextIndex
      });
    }
  };

  const handleEndTurn = () => {
    console.log('GameScreen: Ending turn');
    emitGameAction('end-turn', {});
    // Clear hint when turn ends
    setShowHint(false);
    setCurrentHint('');
    // Don't navigate immediately - let the game state update first
    // Navigation will happen in useEffect when currentPhase changes to 'ready'
  };
  
  // Handle showing hint
  const handleShowHint = () => {
    if (game?.currentTurn?.hintsRemaining > 0) {
      const hintIndex = localWordIndex;
      const hint = game.currentTurn.hintQueue?.[hintIndex] || 'No hint available';
      setCurrentHint(hint);
      setShowHint(true);
      
      // Decrement hints remaining on server
      emitGameAction('use-hint', { queueIndex: hintIndex });
    }
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
              <p className="text-xs sm:text-sm text-slate-500">
                Round {game.currentRound || 1} of {game.gameSettings?.totalRounds || 3}
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
                  {localWordQueue[localWordIndex] || game.currentTurn?.word || 'Loading...'}
                </h2>
                <p className="text-lg sm:text-xl text-slate-500 font-medium">
                  {game.currentTurn?.category ? 
                    game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 
                    'Loading...'
                  }
                </p>
                
                {/* Hint display */}
                {showHint && currentHint && (
                  <div className="mt-4 p-3 bg-indigo-100 border-2 border-indigo-300 rounded-lg max-w-md">
                    <p className="text-sm sm:text-base text-indigo-900 text-center font-medium">
                      💡 {currentHint}
                    </p>
                  </div>
                )}
              </>
            ) : isCurrentTeam ? (
              // Same team guessing view
              <>
                <h2 className="font-bold text-slate-900 mb-2 text-center text-xl sm:text-2xl">
                  Your team is guessing!
                </h2>
                <p className="text-base sm:text-lg text-slate-500 font-medium mb-3">
                  Category: {game.currentTurn.category ? game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 'Loading...'}
                </p>
                <div className="text-center text-slate-600 text-sm sm:text-base">
                  <p>Listen to your teammate describe the word</p>
                  <p className="text-xs sm:text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
                
                {/* Word list for guessers */}
                {game.currentTurn?.turnWords && game.currentTurn.turnWords.length > 0 && (
                  <div className="mt-4 w-full max-w-md">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 text-center">Words this turn:</h3>
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                      {game.currentTurn.turnWords.map((word, index) => (
                        <div key={index} className="flex justify-between items-center text-xs sm:text-sm px-2 py-1 rounded hover:bg-slate-50">
                          <span className="truncate mr-2 text-slate-700">{word.word}</span>
                          <span className={`font-bold flex-shrink-0 ${
                            word.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {word.status === 'correct' ? '✓' : '⊘'}
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
                <p className="text-base sm:text-lg text-slate-500 font-medium mb-3">
                  Category: {game.currentTurn?.category ? 
                    game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 
                    'Loading...'
                  }
                </p>
                <div className="text-center text-slate-600 text-sm sm:text-base">
                  <p>It's their turn to guess words</p>
                  <p className="text-xs sm:text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
                
                {/* Word list for spectators */}
                {game.currentTurn?.turnWords && game.currentTurn.turnWords.length > 0 && (
                  <div className="mt-4 w-full max-w-md">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 text-center">Words this turn:</h3>
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                      {game.currentTurn.turnWords.map((word, index) => (
                        <div key={index} className="flex justify-between items-center text-xs sm:text-sm px-2 py-1 rounded hover:bg-slate-50">
                          <span className="truncate mr-2 text-slate-700">{word.word}</span>
                          <span className={`font-bold flex-shrink-0 ${
                            word.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {word.status === 'correct' ? '✓' : '⊘'}
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
              {/* Hint Button */}
              <div className="mt-3">
                <button
                  onClick={handleShowHint}
                  disabled={!game?.currentTurn?.hintsRemaining || game.currentTurn.hintsRemaining === 0 || showHint}
                  className="w-full bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-sm sm:text-base transition-colors hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  💡 Hint ({game?.currentTurn?.hintsRemaining ?? 0})
                </button>
              </div>
              
              {/* Skip and Correct Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                <button
                  onClick={handleWordSkip}
                  disabled={isProcessingAction}
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
