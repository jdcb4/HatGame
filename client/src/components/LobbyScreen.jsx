import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const LobbyScreen = ({ playerId, playerName }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, fetchGame, joinTeam, startGame, loading, error, setError } = useGame();
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId]);

  useEffect(() => {
    if (game && game.teams) {
      // Find which team the player is on
      game.teams.forEach((team, index) => {
        if (team.players && team.players[playerId]) {
          setSelectedTeam(index);
        }
      });
    }
  }, [game, playerId]);

  // Navigate to game screen when game starts
  useEffect(() => {
    if (game && game.status === 'in-progress') {
      console.log('Game started, navigating to ready screen');
      navigate(`/ready/${gameId}`);
    }
  }, [game, gameId, navigate]);

  const handleJoinTeam = async (teamIndex) => {
    try {
      await joinTeam(gameId, teamIndex, playerId, playerName);
      setSelectedTeam(teamIndex);
    } catch (err) {
      console.error('Failed to join team:', err);
    }
  };

  const handleStartGame = async () => {
    if (game.hostId !== playerId) {
      setError('Only the host can start the game');
      return;
    }

    try {
      await startGame(gameId, playerId);
      navigate(`/game/${gameId}`);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const canStartGame = () => {
    if (!game || !game.teams) return false;
    
    // Check if all teams have at least one player
    const teamsWithPlayers = game.teams.filter(team => 
      team.players && Object.keys(team.players).length > 0
    );
    return teamsWithPlayers.length >= 2;
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
          <p className="text-slate-600 mb-4">The game you're looking for doesn't exist.</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Game Lobby</h1>
            <p className="text-slate-600">Game ID: <span className="font-mono font-bold text-indigo-600">{game.id}</span></p>
            <p className="text-sm text-slate-500 mt-2">Share this ID with friends to join!</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Teams */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {game.teams && game.teams.map((team, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${
                    selectedTeam === index
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200'
                  }`}
                >
                  <h3 className="font-bold text-lg text-slate-800 mb-3">{team.name}</h3>
                  
                  {/* Players in team */}
                  <div className="space-y-1 mb-4">
                    {team.players ? Object.entries(team.players).map(([playerId, playerName]) => (
                      <div
                        key={playerId}
                        className={`px-2 py-1 rounded text-sm ${
                          playerId === playerId
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {playerName} {playerId === game.hostId && '(Host)'}
                      </div>
                    )) : (
                      <div className="text-slate-500 text-sm">No players yet</div>
                    )}
                  </div>

                  {/* Join Team Button */}
                  {selectedTeam !== index && (
                    <button
                      onClick={() => handleJoinTeam(index)}
                      className="w-full bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Join Team
                    </button>
                  )}

                  {selectedTeam === index && (
                    <div className="text-center text-indigo-600 font-semibold">
                      ✓ You're on this team
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Settings */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-700 mb-2">Game Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Turn Duration:</span>
                <span className="font-semibold ml-2">{game.gameSettings.turnDuration}s</span>
              </div>
              <div>
                <span className="text-slate-600">Total Rounds:</span>
                <span className="font-semibold ml-2">{game.gameSettings.totalRounds}</span>
              </div>
              <div>
                <span className="text-slate-600">Skips per Turn:</span>
                <span className="font-semibold ml-2">{game.gameSettings.skipsPerTurn}</span>
              </div>
              <div>
                <span className="text-slate-600">Penalty for Extra Skip:</span>
                <span className="font-semibold ml-2">{game.gameSettings.penaltyForExtraSkip}</span>
              </div>
            </div>
          </div>

          {/* Start Game Button */}
          {game.hostId === playerId && (
            <div className="text-center">
              <button
                onClick={handleStartGame}
                disabled={loading || !canStartGame()}
                className="bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Start Game'}
              </button>
              {!canStartGame() && (
                <p className="text-sm text-slate-500 mt-2">
                  Need at least 2 teams with players to start
                </p>
              )}
            </div>
          )}

          {/* Waiting for Host */}
          {game.hostId !== playerId && (
            <div className="text-center">
              <p className="text-slate-600 mb-4">Waiting for the host to start the game...</p>
              <button
                onClick={() => navigate('/')}
                className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700"
              >
                Leave Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
