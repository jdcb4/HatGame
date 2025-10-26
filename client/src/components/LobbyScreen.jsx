import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const LobbyScreen = ({ playerId, playerName }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, fetchGame, joinTeam, startGame, submitClues, emitGameAction, loading, error, setError } = useGame();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    turnDuration: 45,
    skipsPerTurn: 1,
    cluesPerPlayer: 6
  });
  
  // Clue submission state
  const [clues, setClues] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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

  // Initialize settings form when game loads
  useEffect(() => {
    if (game && game.gameSettings) {
      setSettingsForm({
        turnDuration: game.gameSettings.turnDuration || 45,
        skipsPerTurn: game.gameSettings.skipsPerTurn || 1,
        cluesPerPlayer: game.gameSettings.cluesPerPlayer || 6
      });
    }
  }, [game]);
  
  // Initialize clues array and check submission status
  useEffect(() => {
    if (game && game.gameSettings) {
      const requiredClues = game.gameSettings.cluesPerPlayer || 6;
      // Initialize empty clues array if not yet done
      if (clues.length === 0) {
        setClues(new Array(requiredClues).fill(''));
      }
      
      // Check if this player has already submitted
      if (game.clueSubmissions && game.clueSubmissions[playerId]?.hasSubmitted) {
        setHasSubmitted(true);
        setClues(game.clueSubmissions[playerId].clues);
      }
    }
  }, [game?.gameSettings?.cluesPerPlayer, game?.clueSubmissions, playerId]);

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
      // Auto-save settings if they're being edited
      if (editingSettings) {
        console.log('✅ Auto-saving settings before starting game');
        emitGameAction('update-game-settings', settingsForm);
        setEditingSettings(false);
        // Give the settings a moment to save before starting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await startGame(gameId, playerId);
      // Don't navigate here - let the useEffect handle it when game.status updates
      // This prevents a race condition where host tries to go to /game before turn starts
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handleClueChange = (index, value) => {
    const newClues = [...clues];
    newClues[index] = value;
    setClues(newClues);
  };
  
  const handleSubmitClues = () => {
    // Validate all clues are filled
    const allFilled = clues.every(clue => clue.trim().length > 0);
    if (!allFilled) {
      setError('Please fill in all clues before submitting');
      return;
    }
    
    console.log('📝 Submitting clues:', clues);
    submitClues(playerId, playerName, clues);
    setHasSubmitted(true);
  };
  
  const canStartGame = () => {
    if (!game || !game.teams) return false;
    
    // Check if all teams have at least one player
    const teamsWithPlayers = game.teams.filter(team => 
      team.players && Object.keys(team.players).length > 0
    );
    
    if (teamsWithPlayers.length < 2) return false;
    
    // Check if all players have submitted clues
    const allPlayerIds = new Set();
    game.teams.forEach(team => {
      if (team.players) {
        Object.keys(team.players).forEach(pid => allPlayerIds.add(pid));
      }
    });
    
    const submittedCount = Object.keys(game.clueSubmissions || {}).filter(
      pid => game.clueSubmissions[pid]?.hasSubmitted
    ).length;
    
    return submittedCount >= allPlayerIds.size;
  };

  const handleSettingsChange = (field, value) => {
    setSettingsForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    console.log('✅ Saving game settings:', settingsForm);
    emitGameAction('update-game-settings', settingsForm);
    setEditingSettings(false);
  };

  const handleCancelSettings = () => {
    // Reset form to current game settings
    if (game && game.gameSettings) {
      setSettingsForm({
        turnDuration: game.gameSettings.turnDuration || 45,
        skipsPerTurn: game.gameSettings.skipsPerTurn || 1,
        cluesPerPlayer: game.gameSettings.cluesPerPlayer || 6
      });
    }
    setEditingSettings(false);
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
                    {team.players ? Object.entries(team.players).map(([pid, pname]) => (
                      <div
                        key={pid}
                        className={`px-2 py-1 rounded text-sm flex items-center justify-between ${
                          pid === playerId
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>
                          {pname} {pid === game.hostId && '(Host)'}
                        </span>
                        {game.clueSubmissions && game.clueSubmissions[pid]?.hasSubmitted && (
                          <span className="text-emerald-600 font-bold text-base">✓</span>
                        )}
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

          {/* Clue Submission */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">Submit Your Clues</h2>
            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
              <p className="text-sm text-slate-600 mb-4">
                Each clue should be the name of a <strong>person</strong> (real or fictional). 
                These will be used across all three phases of the game!
              </p>
              
              {hasSubmitted ? (
                <div className="bg-emerald-100 border-2 border-emerald-400 rounded-lg p-4 text-center">
                  <div className="text-emerald-700 font-bold text-lg mb-2">✓ Clues Submitted!</div>
                  <div className="text-sm text-slate-600 space-y-1">
                    {clues.map((clue, i) => (
                      <div key={i}>{i + 1}. {clue}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {clues.map((clue, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600 w-8">{index + 1}.</span>
                      <input
                        type="text"
                        value={clue}
                        onChange={(e) => handleClueChange(index, e.target.value)}
                        placeholder="Enter a person's name"
                        className="flex-1 border-2 border-slate-300 rounded px-3 py-2 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleSubmitClues}
                    disabled={!clues.every(c => c.trim().length > 0)}
                    className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    Submit Clues
                  </button>
                </div>
              )}
              
              {/* Show submission status for all players */}
              <div className="mt-4 pt-4 border-t border-indigo-300">
                <div className="text-sm font-semibold text-slate-700 mb-2">Submission Status:</div>
                <div className="space-y-1">
                  {game.teams && game.teams.map((team) => 
                    team.players && Object.entries(team.players).map(([pid, pname]) => (
                      <div key={pid} className="flex items-center gap-2 text-sm">
                        {game.clueSubmissions && game.clueSubmissions[pid]?.hasSubmitted ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-400">○</span>
                        )}
                        <span className="text-slate-700">{pname}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700">Game Settings</h3>
              {game.hostId === playerId && !editingSettings && (
                <button
                  onClick={() => setEditingSettings(true)}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {editingSettings && game.hostId === playerId ? (
              // Editable form for host
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Turn Duration</label>
                    <select
                      value={settingsForm.turnDuration}
                      onChange={(e) => handleSettingsChange('turnDuration', parseInt(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                      <option value={90}>90 seconds</option>
                      <option value={120}>120 seconds</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Skips per Turn (with return)</label>
                    <select
                      value={settingsForm.skipsPerTurn}
                      onChange={(e) => handleSettingsChange('skipsPerTurn', parseInt(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Clues per Player</label>
                    <select
                      value={settingsForm.cluesPerPlayer}
                      onChange={(e) => handleSettingsChange('cluesPerPlayer', parseInt(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value={3}>3 clues</option>
                      <option value={4}>4 clues</option>
                      <option value={5}>5 clues</option>
                      <option value={6}>6 clues</option>
                      <option value={7}>7 clues</option>
                      <option value={8}>8 clues</option>
                      <option value={9}>9 clues</option>
                      <option value={10}>10 clues</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 bg-emerald-600 text-white font-semibold py-2 px-4 rounded hover:bg-emerald-700 transition-colors text-sm"
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={handleCancelSettings}
                    className="flex-1 bg-slate-400 text-white font-semibold py-2 px-4 rounded hover:bg-slate-500 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Read-only display
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-600">Turn Duration (all phases):</span>
                  <span className="font-semibold ml-2">{game.gameSettings.turnDuration}s</span>
                </div>
                <div>
                  <span className="text-slate-600">Skips per Turn:</span>
                  <span className="font-semibold ml-2">{game.gameSettings.skipsPerTurn}</span>
                </div>
                <div>
                  <span className="text-slate-600">Clues per Player:</span>
                  <span className="font-semibold ml-2">{game.gameSettings.cluesPerPlayer}</span>
                </div>
              </div>
            )}
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
                  {(() => {
                    const teamsWithPlayers = game.teams.filter(team => 
                      team.players && Object.keys(team.players).length > 0
                    );
                    if (teamsWithPlayers.length < 2) {
                      return 'Need at least 2 teams with players to start';
                    }
                    const allPlayerIds = new Set();
                    game.teams.forEach(team => {
                      if (team.players) Object.keys(team.players).forEach(pid => allPlayerIds.add(pid));
                    });
                    const submittedCount = Object.keys(game.clueSubmissions || {}).filter(
                      pid => game.clueSubmissions[pid]?.hasSubmitted
                    ).length;
                    return `Waiting for ${allPlayerIds.size - submittedCount} player(s) to submit clues`;
                  })()}
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
