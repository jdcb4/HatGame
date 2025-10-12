import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

/**
 * Ready Screen - Shows between turns
 * - Displays previous turn results (if any)
 * - Shows which team is up next
 * - Only the next team's describer can start the turn
 * - Other players see waiting message
 */
function ReadyScreen({ playerId, playerName }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, emitGameAction } = useGame();

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading game...</p>
        </div>
      </div>
    );
  }

  console.log('ReadyScreen - Game state:', {
    status: game.status,
    currentPhase: game.currentPhase,
    currentTeamIndex: game.currentTeamIndex,
    hasLastCompletedTurn: !!game.lastCompletedTurn,
    lastCompletedTurnScore: game.lastCompletedTurn?.score,
    lastCompletedTurnTeam: game.lastCompletedTurn?.teamName,
    currentTurn: game.currentTurn,
    currentDescriberIndex: game.currentDescriberIndex
  });
  
  if (game.status === 'finished') {
    console.log('ReadyScreen - GAME IS FINISHED, showing final results');
    console.log('Last completed turn details:', game.lastCompletedTurn);
  }

  // Navigate to game screen when phase changes to guessing (but not if game is finished)
  React.useEffect(() => {
    if (game.status !== 'finished' && game.currentPhase === 'guessing' && game.currentTurn) {
      console.log('Phase changed to guessing, navigating to game screen');
      navigate(`/game/${gameId}`);
    } else if (game.status === 'finished' && game.currentPhase === 'guessing') {
      console.log('Game finished but phase is guessing - this should not happen');
    }
  }, [game.status, game.currentPhase, game.currentTurn, gameId, navigate]);

  // Don't auto-navigate when game finishes - let players see final results first
  // They will click a button to go to game over screen

  // Get current team and describer info (only needed if game is in progress)
  let currentTeam, teamPlayerIds, describerIndex, describerPlayerId, describerPlayerName;
  let isOnCurrentTeam, isDescriber, isGuesser, isSpectator;
  
  if (game.status === 'in-progress') {
    currentTeam = game.teams[game.currentTeamIndex];
    teamPlayerIds = Object.keys(currentTeam.players);
    
    // Get describer index from game state (Map uses string keys)
    const describerIndexMap = game.currentDescriberIndex || {};
    describerIndex = describerIndexMap[String(game.currentTeamIndex)] || 0;
    describerPlayerId = teamPlayerIds[describerIndex];
    describerPlayerName = currentTeam.players[describerPlayerId];
    
    // Determine player's role
    isOnCurrentTeam = currentTeam.players[playerId] !== undefined;
    isDescriber = describerPlayerId === playerId;
    isGuesser = isOnCurrentTeam && !isDescriber;
    isSpectator = !isOnCurrentTeam;

    console.log('ReadyScreen - Player role:', {
      playerId,
      isDescriber,
      isGuesser,
      isSpectator,
      describerPlayerId,
      teamPlayerIds
    });
  } else {
    console.log('ReadyScreen - Game finished, showing final results');
  }

  const handleStartTurn = () => {
    console.log('Ready screen - Starting turn');
    emitGameAction('start-turn', {});
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="w-full max-w-2xl">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          
          {/* Previous Turn Results (if available) */}
          {game.lastCompletedTurn && (
            <div className="mb-8 pb-8 border-b border-slate-200">
              <h2 className="text-2xl font-bold mb-4 text-center text-slate-900">
                Last Turn Results
              </h2>
              <div className="bg-slate-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-800">
                      {game.lastCompletedTurn.teamName}
                    </p>
                    <p className="text-sm text-slate-600">
                      Describer: {game.lastCompletedTurn.describerPlayerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-indigo-600">
                      {game.lastCompletedTurn.score}
                    </p>
                    <p className="text-sm text-slate-600">points</p>
                  </div>
                </div>
                
                {/* Words from last turn */}
                {game.lastCompletedTurn.turnWords && game.lastCompletedTurn.turnWords.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2 text-sm">Words:</h3>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {game.lastCompletedTurn.turnWords.map((word, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{word.word}</span>
                          <span className={`font-semibold ${
                            word.status === 'correct' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {word.status === 'correct' ? '✓' : '⊘'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div className="mt-6">
                <h3 className="font-bold text-slate-700 mb-3 text-center">Leaderboard</h3>
                <div className="space-y-2">
                  {game.teams
                    .map((team, index) => ({ ...team, originalIndex: index }))
                    .sort((a, b) => b.score - a.score)
                    .map((team, displayIndex) => (
                      <div
                        key={team.originalIndex}
                        className={`flex justify-between p-3 rounded-md ${
                          displayIndex === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-slate-100'
                        }`}
                      >
                        <span className="font-semibold">
                          {displayIndex === 0 && '🏆 '}{team.name}
                        </span>
                        <span className="font-bold">{team.score} pts</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Next Turn Info or Game Over */}
          <div className="text-center">
            {game.status === 'finished' ? (
              // Game finished - show button to view final results
              <div>
                <h2 className="text-3xl font-bold mb-4 text-slate-900">
                  🎉 Game Complete! 🎉
                </h2>
                <p className="text-lg text-slate-600 mb-6">
                  All rounds completed! Click below to see the final results.
                </p>
                <button
                  onClick={() => navigate(`/gameover/${gameId}`)}
                  className="bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg w-full hover:bg-emerald-700 transition-transform hover:scale-105 shadow-lg"
                >
                  View Final Results
                </button>
              </div>
            ) : (
              // Game in progress - show next turn info
              <>
                <h2 className="text-3xl font-bold mb-2 text-slate-900">
                  {game.lastCompletedTurn ? 'Next Up' : 'First Turn'}
                </h2>
                <p className="text-2xl font-semibold text-indigo-600 mb-2">
                  {currentTeam.name}
                </p>
                <p className="text-lg text-slate-600 mb-6">
                  Describer: {describerPlayerName}
                </p>

                {/* Role-specific messages and actions */}
                {isDescriber && (
                  <div>
                    <p className="text-slate-600 mb-6">
                      You're the describer! Click below to start your turn.
                    </p>
                    <button
                      onClick={handleStartTurn}
                      className="bg-indigo-600 text-white font-bold py-4 px-8 rounded-lg w-full hover:bg-indigo-700 transition-transform hover:scale-105 shadow-lg"
                    >
                      Start Turn
                    </button>
                  </div>
                )}

                {isGuesser && (
                  <div>
                    <p className="text-slate-600 mb-4">
                      You're a guesser! Get ready to guess the words your describer will act out.
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      Waiting for {describerPlayerName} to start the turn...
                    </p>
                    <div className="animate-pulse bg-indigo-100 h-16 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">Waiting...</span>
                    </div>
                  </div>
                )}

                {isSpectator && (
                  <div>
                    <p className="text-slate-600 mb-6">
                      Watch {currentTeam.name} play their turn!
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      Waiting for {describerPlayerName} to start the turn...
                    </p>
                    <div className="animate-pulse bg-slate-100 h-16 rounded-lg flex items-center justify-center">
                      <span className="text-slate-600 font-semibold">Waiting...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Game Info */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
            <p>Round {game.currentRound} of {game.gameSettings?.totalRounds || 3}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReadyScreen;

