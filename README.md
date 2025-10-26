# The Hat Game

A real-time multiplayer party game with three exciting phases: Describe, One Word, and Charades! Built with Node.js, Express, Socket.IO, React, and MongoDB.

## Features

- **Three distinct game phases** (Describe, One Word, Charades)
- **Real-time multiplayer gameplay** using WebSockets
- **Team-based competition** with customizable team names
- **Player-submitted clues** (person names) used across all phases
- **Role-based views** (describer vs guesser vs spectator)
- **Smart skip system** with return logic (can't skip twice until answering first)
- **Clue preloading** for instant feedback (0ms delay)
- **Phase transition announcements** with clear rule displays
- **Live leaderboard** updates
- **Responsive design** optimized for mobile and desktop
- **Production-ready** deployment on Railway with MongoDB Atlas

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **MongoDB** with Mongoose ODM
- **CORS** enabled for cross-origin requests

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time updates
- **Axios** for HTTP requests

### Hosting
- **Railway** for production deployment (persistent servers, perfect for Socket.IO)
- **MongoDB Atlas** for cloud database

## Quick Start

### Prerequisites
- Node.js 16+ installed
- MongoDB Atlas account (free tier available)
- Git

### Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd word-guesser-multiplayer
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your MongoDB Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/word-guesser?retryWrites=true&w=majority
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   
   This starts both the backend (port 3001) and frontend (port 5173).

4. **Open your browser:**
   Navigate to `http://localhost:5173`

### MongoDB Atlas Setup

1. **Create a free account** at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create a new cluster** (free M0 tier)
3. **Create a database** called `thehatgame_db`
4. **Create a database user** with read/write permissions
5. **Whitelist your IP** (or use 0.0.0.0/0 for development)
6. **Get your connection string** and add it to `.env`

## Deployment to Railway (Production)

**Railway is the recommended platform** for this Socket.IO multiplayer game.

See `RAILWAY_DEPLOY.md` for detailed deployment instructions.

### Quick Steps:

1. **Push your code to GitHub**
2. **Go to [Railway.app](https://railway.app) and sign in with GitHub**
3. **Click "New Project" → "Deploy from GitHub repo"**
4. **Select your repository**
5. **Add environment variables:**
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NODE_ENV`: `production`
   - `PORT`: `3002`
6. **Railway auto-deploys** on every push

### Why Railway?
- ✅ Persistent servers (perfect for Socket.IO)
- ✅ WebSockets work flawlessly
- ✅ Real-time multiplayer with no issues
- ✅ $5/month free tier

---

## Game Rules

**The Hat Game** is played in three phases using the same set of clues (person names):

### Setup
1. **Join Game:** Players create or join using a Game ID
2. **Join Teams:** 2-4 teams, at least 2 players per team
3. **Submit Clues:** Each player submits 6 person names (real or fictional)

### Three Phases
1. **Phase 1: Describe** - Use as many words as you want to describe the person
2. **Phase 2: One Word** - Say exactly ONE WORD only to give a clue  
3. **Phase 3: Charades** - Act it out silently - no words or sounds!

### Gameplay
- Teams alternate turns with a timer (default: 45 seconds)
- Describer sees clues one at a time from the shared pool
- Correct guess = +1 point, clue is removed from pool
- Can skip 1 clue per turn (but must answer it before skipping again)
- Phase completes when all clues are guessed → advance to next phase
- Game ends after Phase 3, highest score wins!

**See [HAT_GAME_RULES.md](./HAT_GAME_RULES.md) for detailed rules and strategy tips.**

## Project Structure

```
thehatgame/
├── server/                      # Backend code
│   ├── index.js                # Main server file
│   ├── models/                 # Database models
│   │   └── Game.js            # Game schema with clue pool
│   ├── routes/                 # API routes
│   ├── handlers/               # Game logic handlers
│   │   ├── shared/            # Lobby and clue submission
│   │   └── gameplay/          # Turn, clue, and queue handlers
│   └── utils/                  # Helper utilities
├── client/                     # Frontend code
│   ├── src/
│   │   ├── components/        # React components (screens)
│   │   │   ├── LobbyScreen.jsx      # Clue submission
│   │   │   ├── ReadyScreen.jsx      # Phase transitions
│   │   │   ├── GameScreen.jsx       # Active gameplay
│   │   │   └── GameOverScreen.jsx   # Final results
│   │   ├── context/           # React context
│   │   │   └── GameContext.jsx     # Global state + socket
│   │   └── App.jsx            # Main app component
│   └── package.json
├── package.json               # Root package.json
├── HAT_GAME_RULES.md         # Detailed game rules
└── README.md
```

## API Endpoints

### Games
- `POST /api/games` - Create a new game
- `GET /api/games/:id` - Get game by ID
- `POST /api/games/:id/join` - Join a game
- `POST /api/games/:id/teams/:teamIndex/join` - Join a specific team
- `PATCH /api/games/:id/start` - Start the game (host only)

### WebSocket Events
- `join-game` - Join a game room
- `leave-game` - Leave a game room
- `game-action` - Perform game actions (start-turn, word-correct, etc.)
- `game-updated` - Receive game state updates
- `player-joined` - Player joined notification
- `player-left` - Player left notification

## Customization

### Game Settings
Configurable in the lobby before game starts:
- Turn duration (15-120 seconds)
- Total rounds (1-10)
- Skips per turn (0-5)
- Clues per player (3-10)

### Styling
Modify `client/src/index.css` and component files to change the appearance.

### Game Rules
Update `server/models/Game.js` to modify game schema and rules.
See `HAT_GAME_RULES.md` for detailed gameplay mechanics.

## Troubleshooting

### Common Issues

1. **"Cannot connect to MongoDB"**
   - Check your MongoDB Atlas connection string
   - Ensure your IP is whitelisted
   - Verify database user permissions

2. **"Socket connection failed"**
   - Check if backend server is running
   - Verify CORS settings
   - Check firewall settings

3. **"Game not found"**
   - Ensure game ID is correct
   - Check if game exists in database
   - Verify game status

### Development Tips

- Use browser dev tools to inspect WebSocket connections
- Check server logs for error messages
- Use MongoDB Compass to inspect database
- Test with multiple browser tabs/windows

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information

---

**Happy Gaming! 🎮**
