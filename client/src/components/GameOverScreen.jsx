import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const GameOverScreen = ({ playerId, playerName }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, fetchGame, emitGameAction, socket, loading, error, setError } = useGame();
  const [isCreatingRematch, setIsCreatingRematch] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);

  // Listen for rematch-created event
  useEffect(() => {
    if (!socket) return;

    const handleRematchCreated = ({ newGameId }) => {
      console.log('✅ Rematch created, navigating to new lobby:', newGameId);
      setIsCreatingRematch(false);
      navigate(`/lobby/${newGameId}`);
    };

    socket.on('rematch-created', handleRematchCreated);

    return () => {
      socket.off('rematch-created', handleRematchCreated);
    };
  }, [socket, navigate]);

  const handlePlayAgain = () => {
    console.log('🔄 Creating rematch for game:', gameId);
    setIsCreatingRematch(true);
    emitGameAction('create-rematch', {});
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

  // Sort teams by score
  const sortedTeams = [...game.teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];
  const isTie = sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score;
  
  // Check if current player is on the winning team
  const isPlayerOnWinningTeam = winner && winner.players && winner.players[playerId] !== undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-900">
            {isTie ? "It's a Tie!" : (isPlayerOnWinningTeam ? "You Win!" : `${winner.name} Wins!`)}
          </h1>
          <p className="text-slate-500 mb-6">Final Scores:</p>
          
          {/* Final Leaderboard */}
          <div className="space-y-2 mb-8">
            {sortedTeams.map((team, index) => (
              <div
                key={index}
                className={`flex justify-between p-3 rounded-lg text-lg ${
                  index === 0 && !isTie
                    ? 'bg-yellow-100 border-2 border-yellow-300'
                    : 'bg-slate-100'
                }`}
              >
                <span className="font-semibold">
                  {index === 0 && !isTie && '🏆 '}
                  {index === 0 && isTie && '🤝 '}
                  {team.name}
                </span>
                <span>{team.score} point(s)</span>
              </div>
            ))}
          </div>

          {/* Game Statistics */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg text-left">
            <h3 className="font-semibold text-slate-700 mb-3">Game Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Turn Duration:</span>
                <span className="font-semibold">{game.gameSettings.turnDuration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Game Duration:</span>
                <span className="font-semibold">
                  {Math.floor((Date.now() - new Date(game.createdAt).getTime()) / 60000)} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePlayAgain}
              disabled={isCreatingRematch}
              className="bg-emerald-600 text-white font-bold py-4 px-6 rounded-lg w-full hover:bg-emerald-700 transition-transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isCreatingRematch ? 'Creating Rematch...' : 'Play Again'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-slate-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
