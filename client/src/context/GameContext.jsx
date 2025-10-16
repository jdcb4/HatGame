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
      // Dynamically determine the socket URL
      // In production, connect to the same origin as the app
      // In development, connect to localhost:3002
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3002';
      
      console.log('Connecting to socket at:', socketUrl);
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Connection status logging
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      setSocket(newSocket);

      // Listen for game updates
      newSocket.on('game-updated', (updatedGame) => {
        console.log('📨 Game updated received:', {
          status: updatedGame.status,
          currentPhase: updatedGame.currentPhase,
          currentTurn: updatedGame.currentTurn ? {
            category: updatedGame.currentTurn.category,
            word: updatedGame.currentTurn.word,
            turnScore: updatedGame.currentTurn.turnScore,
            wordQueueLength: updatedGame.currentTurn.wordQueue?.length,
            queueIndex: updatedGame.currentTurn.queueIndex
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
    console.log(`🚀 emitGameAction called:`, { action, payload, hasSocket: !!socket, hasGame: !!game, gameId: game?.id });
    if (socket && game) {
      const actionData = {
        gameId: game.id,
        action,
        payload
      };
      console.log(`📤 Emitting "${action}" to server:`, actionData);
      socket.emit('game-action', actionData);
    } else {
      console.error('❌ Cannot emit game action - socket or game not ready', { socket: !!socket, game: !!game });
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
