import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const TurnSummaryScreen = ({ playerId, playerName }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, fetchGame, emitGameAction, loading, error, setError } = useGame();

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);

  // Navigate to game screen when a new turn starts
  useEffect(() => {
    if (game && game.currentTurn && game.currentTurn.category && game.currentTurn.word) {
      console.log('New turn started, navigating to game screen');
      navigate(`/game/${gameId}`);
    }
  }, [game, gameId, navigate]);

  const handleNextTurn = () => {
    emitGameAction('next-turn', {});
    
    // Check if game is finished
    if (game && game.currentRound > game.gameSettings.totalRounds) {
      navigate(`/gameover/${gameId}`);
    } else {
      navigate(`/game/${gameId}`);
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

  // Use completedTurn data if available, otherwise fall back to currentTurn
  const turnData = game.completedTurn || game.currentTurn;
  console.log('TurnSummaryScreen - Game state:', {
    completedTurn: game.completedTurn,
    currentTurn: game.currentTurn,
    turnData: turnData,
    currentTeamIndex: game.currentTeamIndex,
    teams: game.teams
  });
  
  const currentTeam = turnData ? game.teams[turnData.teamIndex] : game.teams[game.currentTeamIndex];
  const turnScore = turnData ? turnData.turnScore : 0;
  
  console.log('TurnSummaryScreen - Resolved data:', {
    currentTeam: currentTeam,
    turnScore: turnScore,
    teamIndex: turnData ? turnData.teamIndex : game.currentTeamIndex
  });
  
  // Determine who should see the Next Turn button
  // The next team is the one whose turn it is now (currentTeamIndex)
  const nextTeamIndex = game.currentTeamIndex;
  const nextTeam = game.teams[nextTeamIndex];
  const isNextDescriber = nextTeam && nextTeam.players && nextTeam.players[playerId];

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg max-h-[98vh] overflow-y-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-slate-900">
            Time's Up!
          </h2>
          <p className="text-base sm:text-lg text-slate-500 mb-4 sm:mb-6 text-center">
            {currentTeam.name} scored {turnScore} point(s)
          </p>
          
          {/* Words from this turn */}
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-slate-700 mb-2 text-sm sm:text-base">Words this turn:</h3>
            <div className="max-h-24 sm:max-h-32 overflow-y-auto bg-slate-50 p-2 sm:p-3 rounded-lg text-xs sm:text-sm space-y-0.5 sm:space-y-1">
              {turnData && turnData.turnWords && turnData.turnWords.length > 0 ? (
                turnData.turnWords.map((word, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate mr-2">{word.word}</span>
                    <span className={`font-bold flex-shrink-0 ${
                      word.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {word.status === 'correct' ? '✓' : '⊘'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No words answered</p>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-slate-700 mb-2 text-sm sm:text-base">Leaderboard</h3>
            <div className="space-y-1.5 sm:space-y-2">
              {game.teams
                .sort((a, b) => b.score - a.score)
                .map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between p-2 sm:p-2.5 rounded-md text-sm sm:text-base ${
                      index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-slate-100'
                    }`}
                  >
                    <span className="font-semibold">
                      {index === 0 && '🏆 '}{team.name}
                    </span>
                    <span>{team.score} pts</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Next Turn Button - Only show to next describer */}
          {isNextDescriber ? (
            <button
              onClick={handleNextTurn}
              className="bg-indigo-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg w-full hover:bg-indigo-700 transition-transform hover:scale-105 text-base sm:text-lg"
            >
              Start Your Turn
            </button>
          ) : (
            <div className="text-center">
              <p className="text-slate-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Waiting for {nextTeam.name}...
              </p>
              <div className="animate-pulse bg-slate-200 h-10 sm:h-12 rounded-lg"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurnSummaryScreen;
