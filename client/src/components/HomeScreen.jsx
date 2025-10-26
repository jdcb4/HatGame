import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const HomeScreen = ({ playerId, playerName, setPlayerName }) => {
  const navigate = useNavigate();
  const gameContext = useGame();
  const { createGame, joinGame, loading, error, setError } = gameContext || {};
  
  const [teamNames, setTeamNames] = useState(['Team Alpha', 'Team Bravo']);
  const [joinGameId, setJoinGameId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Debug logging
  console.log('HomeScreen rendered', { playerId, playerName, gameContext });

  // Show loading if context is not ready
  if (!gameContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  const handleNameChange = (e) => {
    const name = e.target.value;
    setPlayerName(name);
    localStorage.setItem('playerName', name);
  };

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (teamNames.length < 2) {
      setError('Need at least 2 teams');
      return;
    }

    try {
      const game = await createGame(playerId, playerName, teamNames);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!joinGameId.trim()) {
      setError('Please enter a game ID');
      return;
    }

    try {
      const game = await joinGame(joinGameId.toUpperCase(), playerId, playerName);
      navigate(`/lobby/${game.id}`);
    } catch (err) {
      console.error('Failed to join game:', err);
    }
  };

  const addTeam = () => {
    if (teamNames.length < 6) {
      setTeamNames([...teamNames, `Team ${String.fromCharCode(65 + teamNames.length)}`]);
    }
  };

  const removeTeam = (index) => {
    if (teamNames.length > 2) {
      setTeamNames(teamNames.filter((_, i) => i !== index));
    }
  };

  const updateTeamName = (index, newName) => {
    const updated = [...teamNames];
    updated[index] = newName;
    setTeamNames(updated);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-4xl font-bold mb-2 text-center text-slate-900">
            The Hat Game
          </h1>
          <p className="text-slate-500 mb-8 text-center">
            Three phases, one pool of clues!
          </p>

          {/* Player Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="Enter your name"
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Create Game Section */}
          <div className="mb-6">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors mb-4"
              >
                Create New Game
              </button>
            ) : (
              <div className="mb-4">
                {/* Back button with icon */}
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  <span className="font-medium">Back</span>
                </button>
                
                {/* Team names form */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Team Names</h3>
                  {teamNames.map((name, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateTeamName(index, e.target.value)}
                        className="flex-grow p-2 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                      />
                      {teamNames.length > 2 && (
                        <button
                          onClick={() => removeTeam(index)}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {teamNames.length < 6 && (
                    <button
                      onClick={addTeam}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      + Add Team
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Join Game Section - only show when not creating a game */}
          {!showCreateForm && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Game ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinGameId}
                  onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                  placeholder="Enter game ID"
                  className="flex-grow p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {showCreateForm ? (
              <button
                onClick={handleCreateGame}
                disabled={loading || !playerName.trim() || teamNames.length < 2}
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            ) : (
              <button
                onClick={handleJoinGame}
                disabled={loading || !playerName.trim() || !joinGameId.trim()}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
