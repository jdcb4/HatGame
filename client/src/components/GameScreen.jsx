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

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);

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

      // Calculate time left based on server time
      const startTime = new Date(game.currentTurn?.startTime);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const timeLeft = game.currentTurn?.timeLeft || game.gameSettings?.turnDuration || 30;
      const remaining = Math.max(0, timeLeft - elapsed);
      setTimeLeft(isNaN(remaining) ? 0 : remaining);

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

      // Start timer countdown
      const timer = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        const turnTimeLeft = game.currentTurn.timeLeft || game.gameSettings?.turnDuration || 30;
        const newRemaining = Math.max(0, turnTimeLeft - newElapsed);
        setTimeLeft(isNaN(newRemaining) ? 0 : newRemaining);
        
        if (newRemaining <= 0) {
          clearInterval(timer);
          handleEndTurn();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [game]);

  // Server handles turn initialization automatically

  const handleWordCorrect = () => {
    if (game.currentTurn) {
      emitGameAction('word-correct', { word: game.currentTurn.word });
    }
  };

  const handleWordSkip = () => {
    if (game.currentTurn) {
      emitGameAction('word-skip', { word: game.currentTurn.word });
    }
  };

  const handleEndTurn = () => {
    console.log('GameScreen: Ending turn');
    emitGameAction('end-turn', {});
    // Don't navigate immediately - let the game state update first
    // Navigation will happen in useEffect when currentPhase changes to 'ready'
  };

  const getHint = async () => {
    // This would integrate with your AI hint system
    // For now, just show a placeholder
    alert('Hint feature coming soon!');
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-6 rounded-2xl shadow-lg h-[80vh] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4 mb-4 relative">
            <div className="text-left">
              <p className="font-bold text-xl text-slate-800">{currentTeam.name}</p>
              <p className="text-sm text-slate-500">
                Round {game.currentRound || 1} of {game.gameSettings?.totalRounds || 3}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* End Turn Early Button - small icon (only for describer) */}
              {isDescriber && (
                <button
                  onClick={handleEndTurn}
                  title="End Turn Early"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    End Turn Early
                  </span>
                </button>
              )}
              <div className="text-5xl font-bold text-indigo-600">{isNaN(timeLeft) ? 0 : timeLeft}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 rounded-lg p-4">
            {isDescriber ? (
              // Describer view
              <>
                <h2 className="font-bold text-slate-900 mb-2 break-all text-center text-4xl">
                  {game.currentTurn?.word || 'Loading...'}
                </h2>
                <p className="text-lg text-slate-500 font-medium mb-4">
                  {game.currentTurn?.category ? 
                    game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 
                    'Loading...'
                  }
                </p>
                
                {/* Hint Button */}
                <div className="mt-4 text-center">
                  <button
                    onClick={getHint}
                    className="bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-sky-600 transition disabled:bg-slate-400"
                  >
                    Get Hint
                  </button>
                </div>
              </>
            ) : isCurrentTeam ? (
              // Same team guessing view
              <>
                <h2 className="font-bold text-slate-900 mb-2 text-center text-2xl">
                  Your team is guessing!
                </h2>
                <p className="text-lg text-slate-500 font-medium mb-4">
                  Category: {game.currentTurn.category ? game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 'Loading...'}
                </p>
                <div className="text-center text-slate-600">
                  <p>Listen to your teammate describe the word</p>
                  <p className="text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
              </>
            ) : (
              // Opposing team waiting view
              <>
                <h2 className="font-bold text-slate-900 mb-2 text-center text-2xl">
                  Waiting for {currentTeam.name}
                </h2>
                <p className="text-lg text-slate-500 font-medium mb-4">
                  Category: {game.currentTurn?.category ? 
                    game.currentTurn.category.charAt(0).toUpperCase() + game.currentTurn.category.slice(1) : 
                    'Loading...'
                  }
                </p>
                <div className="text-center text-slate-600">
                  <p>It's their turn to guess words</p>
                  <p className="text-sm mt-2">Time remaining: {isNaN(timeLeft) ? 0 : timeLeft}s</p>
                </div>
              </>
            )}
          </div>

          {/* Score and Controls */}
          <div className="flex justify-between items-center mt-4 text-slate-600">
            <p>Skips Remaining: <span className="font-bold">{game.currentTurn?.skipsRemaining ?? 0}</span></p>
            <p>Turn Score: <span className="font-bold">{game.currentTurn?.turnScore ?? 0}</span></p>
          </div>

          {/* Action Buttons (only for describer) */}
          {isDescriber && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={handleWordSkip}
                className="bg-amber-500 text-white font-bold py-4 rounded-lg text-lg transition-transform hover:scale-105"
              >
                Skip
              </button>
              <button
                onClick={handleWordCorrect}
                className="bg-emerald-600 text-white font-bold py-4 rounded-lg text-lg transition-transform hover:scale-105"
              >
                Correct
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
