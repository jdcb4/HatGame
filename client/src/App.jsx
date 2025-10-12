import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

// Components
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import ReadyScreen from './components/ReadyScreen';
import GameScreen from './components/GameScreen';
import TurnSummaryScreen from './components/TurnSummaryScreen';
import GameOverScreen from './components/GameOverScreen';

// Context for game state
import { GameProvider } from './context/GameContext';

// Socket connection
const socket = io('http://localhost:3002');

function App() {
  const [playerId, setPlayerId] = useState(() => {
    // Generate or retrieve player ID from localStorage
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('playerId', id);
    }
    return id;
  });

  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('playerName') || '';
  });

  // Set up socket connection
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <GameProvider>
      <Router>
        <div className="bg-slate-100 text-slate-800 min-h-screen">
          <Routes>
            <Route 
              path="/" 
              element={
                <HomeScreen 
                  playerId={playerId}
                  playerName={playerName}
                  setPlayerName={setPlayerName}
                />
              } 
            />
            <Route 
              path="/lobby/:gameId" 
              element={
                <LobbyScreen 
                  playerId={playerId}
                  playerName={playerName}
                />
              } 
            />
            <Route 
              path="/ready/:gameId" 
              element={
                <ReadyScreen 
                  playerId={playerId}
                  playerName={playerName}
                />
              } 
            />
            <Route 
              path="/game/:gameId" 
              element={
                <GameScreen 
                  playerId={playerId}
                  playerName={playerName}
                />
              } 
            />
            <Route 
              path="/summary/:gameId" 
              element={
                <TurnSummaryScreen 
                  playerId={playerId}
                  playerName={playerName}
                />
              } 
            />
            <Route 
              path="/gameover/:gameId" 
              element={
                <GameOverScreen 
                  playerId={playerId}
                  playerName={playerName}
                />
              } 
            />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  );
}

export default App;
