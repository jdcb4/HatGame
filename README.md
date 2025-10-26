# Word Guesser Multiplayer Game

A real-time multiplayer word guessing game built with Node.js, Express, Socket.IO, React, and MongoDB.

## Features

- **Real-time multiplayer gameplay** using WebSockets
- **Team-based competition** with customizable team names
- **Role-based views** (describer vs guesser vs spectator)
- **Timer-based rounds** with scoring system
- **Hint system** (2 hints per turn with smart auto-clearing)
- **Word preloading** for instant feedback (0ms delay)
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
- Note: Vercel not recommended for this app (serverless doesn't support persistent WebSockets)

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
3. **Create a database user** with read/write permissions
4. **Whitelist your IP** (or use 0.0.0.0/0 for development)
5. **Get your connection string** and add it to `.env`

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

## Alternative: Vercel (NOT RECOMMENDED)

**Note:** Vercel is NOT suitable for this app because serverless functions don't support persistent Socket.IO connections. See `DEPLOYMENT.md` for details.

If you want to deploy to Vercel anyway (for testing only), you'll need to add a Redis adapter. Not recommended.

## Game Rules

1. **Setup:** Players create or join a game using a Game ID
2. **Teams:** Players join teams in the lobby
3. **Turns:** Teams take turns describing words to their teammates
4. **Scoring:** Correct guesses = +1 point, skips = -1 point (after free skips)
5. **Rounds:** Game continues for a set number of rounds
6. **Winner:** Team with highest score wins

## Project Structure

```
word-guesser-multiplayer/
├── server/                 # Backend code
│   ├── index.js           # Main server file
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   └── data/              # Game data
├── client/                # Frontend code
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/      # React context
│   │   └── App.jsx       # Main app component
│   └── package.json
├── package.json           # Root package.json
├── vercel.json           # Vercel configuration
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
Edit `server/data/words.js` to add/modify word categories and difficulty levels.

### Styling
Modify `client/src/index.css` and component files to change the appearance.

### Game Rules
Update `server/models/Game.js` to modify game settings and rules.

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
