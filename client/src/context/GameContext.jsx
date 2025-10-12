import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    // During HMR, context might be temporarily unavailable
    console.warn('useGame called outside of GameProvider - this might be due to HMR');
    return null;
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const [game, setGame] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    try {
      const newSocket = io('http://localhost:3002');
      setSocket(newSocket);

      // Listen for game updates
      newSocket.on('game-updated', (updatedGame) => {
        console.log('Game updated received:', {
          status: updatedGame.status,
          currentPhase: updatedGame.currentPhase,
          currentTurn: updatedGame.currentTurn ? {
            category: updatedGame.currentTurn.category,
            word: updatedGame.currentTurn.word,
            turnScore: updatedGame.currentTurn.turnScore
          } : null,
          hasLastCompletedTurn: !!updatedGame.lastCompletedTurn
        });
        
        if (updatedGame.status === 'finished') {
          console.log('🎉 GAME FINISHED - Received finished game state!');
          console.log('Last completed turn:', updatedGame.lastCompletedTurn);
        }
        
        setGame(updatedGame);
      });

      newSocket.on('error', (errorData) => {
        setError(errorData.message);
      });

      return () => {
        newSocket.disconnect();
      };
    } catch (err) {
      console.error('Socket connection error:', err);
      setError('Failed to connect to game server');
    }
  }, []);

  // API functions
  const createGame = async (hostId, hostName, teamNames) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/games', {
        hostId,
        hostName,
        teamNames
      });
      
      if (response.data.success) {
        setGame(response.data.game);
        socket.emit('join-game', response.data.game.id);
        return response.data.game;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gameId, playerId, playerName) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`/api/games/${gameId}/join`, {
        playerId,
        playerName
      });
      
      if (response.data.success) {
        setGame(response.data.game);
        socket.emit('join-game', gameId);
        return response.data.game;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async (gameId, teamIndex, playerId, playerName) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`/api/games/${gameId}/teams/${teamIndex}/join`, {
        playerId,
        playerName
      });
      
      if (response.data.success) {
        setGame(response.data.game);
        socket.emit('join-game', gameId);
        return response.data.game;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join team');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (gameId, hostId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.patch(`/api/games/${gameId}/start`, {
        hostId
      });
      
      if (response.data.success) {
        setGame(response.data.game);
        return response.data.game;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchGame = async (gameId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/games/${gameId}`);
      
      if (response.data.success) {
        setGame(response.data.game);
        socket.emit('join-game', gameId);
        return response.data.game;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch game');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Socket actions
  const emitGameAction = (action, payload) => {
    console.log('emitGameAction called:', { action, payload, socket: !!socket, game: !!game });
    if (socket && game) {
      console.log('Emitting game action:', { gameId: game.id, action, payload });
      socket.emit('game-action', {
        gameId: game.id,
        action,
        payload
      });
    } else {
      console.log('Cannot emit game action - socket or game not ready');
    }
  };

  const value = {
    game,
    socket,
    loading,
    error,
    setError,
    createGame,
    joinGame,
    joinTeam,
    startGame,
    fetchGame,
    emitGameAction
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
