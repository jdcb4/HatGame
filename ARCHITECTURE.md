# The Hat Game - Architecture Documentation

> **Purpose:** Help AI agents and developers quickly understand the codebase structure, key patterns, and design decisions.

**Last Updated:** October 26, 2025  
**Project:** The Hat Game - Three-phase multiplayer guessing game (Describe, One Word, Charades)  
**Author:** @jdcb4

---

## 📋 Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Flow](#data-flow)
5. [Complex Features](#complex-features)
6. [File Structure](#file-structure)
7. [Database Schema](#database-schema)
8. [Key Components](#key-components)
9. [Socket Communication](#socket-communication)
10. [Game Flow](#game-flow)
11. [Performance Optimizations](#performance-optimizations)
12. [Common Gotchas](#common-gotchas)

---

## 🎯 High-Level Overview

**The Hat Game** is a real-time multiplayer guessing game played in three distinct phases:
1. **Phase 1: Describe** - Use as many words as you want to describe the person
2. **Phase 2: One Word** - Say exactly ONE WORD only to give a clue
3. **Phase 3: Charades** - Act it out silently - no words or sounds allowed

### How It Works
- Players submit person names (real or fictional) as clues during setup
- Teams take turns with one "describer" and the rest guessing
- Same pool of clues used in all three phases
- Each phase continues until all clues are guessed, then advances to next phase
- Skip system: Can skip one clue per turn, but must answer it before skipping again
- Teams rotate turns, highest score after Phase 3 wins

### Key Features
- ✅ Real-time multiplayer using WebSockets (Socket.IO)
- ✅ Three distinct game phases with different rules
- ✅ Player-submitted clues (person names)
- ✅ Team-based gameplay with customizable team names
- ✅ Role-based views (describer vs guesser vs spectator)
- ✅ Smart skip system with return logic
- ✅ Phase transition announcements
- ✅ Auto-end turn when phase completes
- ✅ Timer-based rounds with scoring system
- ✅ Live leaderboard updates
- ✅ Mobile-responsive design
- ✅ Optimistic UI updates for instant feedback

---

## 🛠️ Tech Stack

### Backend  
- **Node.js** + **Express.js** - REST API server
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** + **Mongoose** - NoSQL database with ODM
- **dotenv** - Environment variable management

### Frontend
- **React 18** - UI library with modern hooks
- **React Router v6** - Client-side routing
- **Socket.IO Client** - WebSocket client
- **Axios** - HTTP requests to REST API
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool and dev server

### Hosting
- **Railway** / **Vercel** - Backend hosting options
- **MongoDB Atlas** - Cloud database
- **Vite Build** - Static frontend build

---

## 🏗️ Architecture Patterns

### 1. **Client-Server Architecture**
```
┌─────────────────┐         ┌─────────────────┐
│  React Client   │ ◄─────► │  Express Server │
│  (Vite Dev)     │  HTTP   │  (Port 3001)    │
│                 │  +      │                 │
│  Socket.IO      │ Socket  │  Socket.IO      │
│  Client         │ ◄─────► │  Server         │
└─────────────────┘         └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  MongoDB Atlas  │
                            │  (Cloud)        │
                            └─────────────────┘
```

### 2. **State Management**
- **Server:** Single source of truth (MongoDB)
- **Client:** React Context for global game state + local component state for UI
- **Synchronization:** Socket.IO broadcasts `game-updated` events to all clients

### 3. **Communication Patterns**

#### HTTP REST API (Initial Setup)
- Create game
- Join game
- Join team
- Start game
- Fetch game state

#### WebSocket Events (Real-time Gameplay)
- **Client → Server:** `game-action` with action type and payload
- **Server → Clients:** `game-updated` with full game state
- **Actions:** `start-turn`, `word-correct`, `word-skip`, `end-turn`, `request-more-words`

### 4. **Role-Based Rendering**
Each player sees a different view based on their role:
- **Describer:** Sees word + controls (Correct/Skip buttons)
- **Guesser:** Sees "Your team is guessing!" message
- **Spectator:** Sees "Waiting for [Team]" message

---

## 📊 Data Flow

### Game Creation Flow
```
1. User enters name + team names on HomeScreen
2. POST /api/games → Server creates Game document
3. Server returns game ID (e.g., "ABC123")
4. Client navigates to /lobby/:gameId
5. Client emits 'join-game' socket event
6. Other players can join using game ID
```

### Turn Execution Flow (with Word Preloading)
```
1. ReadyScreen shows next team + describer
2. Describer clicks "Start Turn"
3. Client emits 'start-turn' action
4. Server initializes turn:
   - Selects random category
   - Preloads 15-word queue
   - Sets current word to queue[0]
   - Broadcasts game-updated
5. Client receives update → navigates to GameScreen
6. Client stores local word queue for optimistic updates
7. Describer clicks "Correct":
   - Client INSTANTLY shows next word from local queue
   - Background: emits 'word-correct' to server
8. When local queue has ≤8 words:
   - Client emits 'request-more-words'
   - Server appends 10 more words to queue
9. Timer expires or describer clicks "End Turn":
   - Client emits 'end-turn'
   - Server saves score, rotates describer, advances to next team
   - Broadcasts game-updated with phase='ready'
10. All clients navigate to ReadyScreen
```

### Scoring Logic
- **Correct guess:** +1 point
- **Skip (within free skips):** No penalty
- **Skip (after free skips):** -1 point
- **Turn ends:** Turn score added to team score

---

## 🚀 Complex Features

### Word Preloading System (Performance Optimization)

#### Problem
Initial implementation had 1-2 second delays between clicking "Correct" and seeing the next word due to network latency (especially on Railway deployment).

#### Solution: Optimistic Updates with Word Queue
Server sends a **queue of 15 words** when turn starts, allowing client to show next word **instantly (0ms delay)** while server handles scoring in the background.

#### Implementation Details

**Server-Side** (`server/index.js`)
```javascript
// handleStartTurn() - lines 236-366
- Preloads 15 words into wordQueue array
- Stores in currentTurn.wordQueue (array of word strings)
- Tracks position with currentTurn.queueIndex

// handleRequestMoreWords() - lines 484-570
- Client requests more words when queue low (≤8 words)
- Server appends 10 more words to existing queue
- Uses retry logic (3 attempts) to handle Mongoose VersionError from concurrent updates
```

**Client-Side** (`client/src/components/GameScreen.jsx`)
```javascript
// State management - lines 15-17
- localWordQueue: Copy of server's word queue
- localWordIndex: Current position in local queue
- Syncs when server sends updated queue (lines 62-85)

// Optimistic updates - lines 151-223
- handleWordCorrect() / handleWordSkip()
- Instantly increments localWordIndex (no server wait!)
- Background: emits action to server for scoring
- Button debounce: 200ms (down from 1200ms)

// Auto-refill logic - lines 42-59
- Monitors remaining words in queue
- Requests more at 8 words remaining (gives time for round-trip)
- Resets request flag when queue has >12 words
```

#### Trade-offs
- ✅ **Pro:** Instant feedback, smooth UX
- ✅ **Pro:** Works great on slow connections
- ⚠️ **Con:** Client and server state can temporarily diverge
- ⚠️ **Con:** More complex state synchronization logic

---

### Describer Rotation System

Each team maintains its own describer rotation:
- Stored in `currentDescriberIndex` (Map<teamIndex, describerIndex>)
- After each turn, the describer index for that team increments
- Wraps around using modulo: `(index + 1) % teamPlayerIds.length`
- Ensures every player gets equal turns describing

---

### Duplicate Word Prevention

#### Problem
Rapid clicking or network latency caused same word to register multiple times.

#### Solution
**Server-side deduplication** (4-second window):
```javascript
// handleWordCorrect() / handleWordSkip() - lines 368-482
- Checks if last submitted word == current word
- Checks if submission was <4 seconds ago
- If both true, ignores duplicate
- 4 seconds accounts for Railway network latency (2-3s round-trip)
```

**Client-side debouncing**:
```javascript
// GameScreen.jsx - lines 151-223
- isProcessingAction state prevents multiple clicks
- Buttons disabled for 200ms after click
```

---

## 📁 File Structure

```
BackEndTicky/
├── client/                          # Frontend React app
│   ├── src/
│   │   ├── components/              # React components (screens)
│   │   │   ├── HomeScreen.jsx       # Landing page - create/join game
│   │   │   ├── LobbyScreen.jsx      # Pre-game - join teams, game settings
│   │   │   ├── ReadyScreen.jsx      # Between turns - shows results, next team
│   │   │   ├── GameScreen.jsx       # Active gameplay - word display + controls
│   │   │   ├── TurnSummaryScreen.jsx # (legacy/unused?)
│   │   │   └── GameOverScreen.jsx   # Final results - winner + all scores
│   │   ├── context/
│   │   │   └── GameContext.jsx      # Global game state + socket management
│   │   ├── App.jsx                  # Route configuration
│   │   ├── main.jsx                 # React root entry point
│   │   ├── index.css                # Tailwind imports + global styles
│   │   └── ErrorBoundary.jsx        # Error handling wrapper
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite configuration
│
├── server/                          # Backend Node.js app
│   ├── index.js                     # Main server file - Socket.IO + Express setup
│   ├── models/
│   │   └── Game.js                  # Mongoose schema for Game document
│   ├── routes/
│   │   └── gameRoutes.js            # REST API endpoints (/api/games/*)
│   └── data/
│       ├── words.js                 # Word lists by category
│       └── csv/                     # Source CSV files (5,029 words)
│           ├── actions.csv
│           ├── entertainment.csv
│           ├── food.csv
│           ├── hobbies.csv
│           ├── places.csv
│           └── things.csv
│
├── package.json                     # Root dependencies (concurrently, nodemon)
├── vercel.json                      # Vercel deployment config
├── railway.json                     # Railway deployment config
├── .env.example                     # Environment variable template
├── TODO.txt                         # Active tasks and completed history
├── README.md                        # Setup and deployment guide
├── ARCHITECTURE.md                  # This file
└── test-mongo.js                    # MongoDB connection test script
```

### Key File Responsibilities

| File | Primary Responsibility | Lines | Key Functions/Exports |
|------|----------------------|-------|----------------------|
| `server/index.js` | Socket.IO event handling, game logic | 695 | `handleStartTurn()`, `handleWordCorrect()`, `handleWordSkip()`, `handleEndTurn()`, `handleRequestMoreWords()` |
| `server/models/Game.js` | MongoDB schema definition | 125 | `gameSchema`, indexes |
| `server/routes/gameRoutes.js` | REST API endpoints | 359 | POST `/`, GET `/:id`, POST `/:id/join`, PATCH `/:id/start` |
| `client/src/context/GameContext.jsx` | Global state + Socket.IO client | 250 | `GameProvider`, `useGame()`, `emitGameAction()` |
| `client/src/components/GameScreen.jsx` | Active gameplay UI + optimistic updates | 446 | Word display, timer, controls, local queue management |
| `client/src/components/ReadyScreen.jsx` | Between-turn results + next team | 255 | Turn results, leaderboard, role-specific messages |
| `client/src/components/LobbyScreen.jsx` | Pre-game team selection | 223 | Team joining, game settings display |

---

## 🗄️ Database Schema

### Game Document (MongoDB/Mongoose)

```javascript
{
  id: String,                           // Game ID (e.g., "ABC123") - unique, auto-generated
  status: String,                       // "lobby" | "in-progress" | "finished"
  hostId: String,                       // Player ID of the game creator
  createdAt: Date,                      // Timestamp of game creation
  
  teams: [{
    name: String,                       // Team name (e.g., "Red Team")
    score: Number,                      // Total accumulated score
    players: {                          // Object with playerId as key, playerName as value
      [playerId]: playerName            // e.g., "abc123": "Alice"
    }
  }],
  
  gameSettings: {
    turnDuration: Number,               // Seconds per turn (default: 30)
    totalRounds: Number,                // Number of rounds to play (default: 3)
    skipsPerTurn: Number,               // Free skips before penalty (default: 1)
    penaltyForExtraSkip: Number         // Points lost per extra skip (default: 1)
  },
  
  currentPhase: String,                 // "ready" | "guessing" | "finished"
  currentRound: Number,                 // Current round number (1-indexed)
  currentTeamIndex: Number,             // Index of team whose turn it is (0-indexed)
  
  currentDescriberIndex: Map<String, Number>,  // Map of teamIndex → describerIndex
                                               // Keys MUST be strings! e.g., {"0": 2, "1": 0}
  
  currentTurn: {
    category: String,                   // Word category (e.g., "food")
    word: String,                       // Current word being described
    wordQueue: [String],                // ⭐ Preloaded word queue for optimistic updates
    queueIndex: Number,                 // ⭐ Current position in word queue (0-indexed)
    startTime: Date,                    // When turn started
    timeLeft: Number,                   // Seconds remaining (used for initial calculation)
    turnWords: [{                       // History of words attempted this turn
      word: String,
      status: String,                   // "correct" | "skipped"
      timestamp: Date
    }],
    skipsRemaining: Number,             // Free skips left this turn
    turnScore: Number,                  // Points earned this turn (before adding to team)
    describerPlayerId: String,          // Player ID of current describer
    describerPlayerName: String         // Display name of current describer
  },
  
  wordsByCategoryForGame: {             // ⚠️ Shuffled word pool for this game instance
    [category]: [{                      // e.g., "food": [...]
      word: String,
      difficulty: String
    }]
  },                                    // ⚠️ MUST call markModified() after modifying!
  
  lastCompletedTurn: {                  // Results from previous turn (shown on ReadyScreen)
    category: String,
    teamIndex: Number,
    teamName: String,
    describerPlayerId: String,
    describerPlayerName: String,
    score: Number,
    turnWords: [...]                    // Same structure as currentTurn.turnWords
  }
}
```

### Important Schema Notes

1. **Mongoose Map Type:** `currentDescriberIndex` uses Map, but Mongoose stores it as an object. **Always use string keys** when accessing: `game.currentDescriberIndex.get(String(teamIndex))`

2. **Nested Object Modification:** `wordsByCategoryForGame` and nested objects require `markModified()`:
   ```javascript
   game.wordsByCategoryForGame[category] = newWords;
   game.markModified('wordsByCategoryForGame');  // ← Required!
   await game.save();
   ```

3. **Player Storage:** Players are stored as `{ [playerId]: playerName }` objects, not arrays. Use `Object.keys()` and `Object.entries()` to iterate.

4. **Indexes:** Database has indexes on `id`, `status`, and `createdAt` for performance.

---

## 🧩 Key Components

### Server Components

#### `server/index.js`
**Main server file** - Combines Express HTTP server + Socket.IO WebSocket server.

**Sections:**
```javascript
// ============================================
// SETUP & MIDDLEWARE (lines 1-56)
// ============================================
// - Express app + HTTP server + Socket.IO initialization
// - CORS configuration
// - MongoDB connection
// - Routes registration

// ============================================
// SOCKET EVENT HANDLERS (lines 58-158)
// ============================================
io.on('connection', (socket) => {
  // join-game: Subscribe to game room
  // leave-game: Unsubscribe from game room
  // game-action: Route to appropriate handler based on action type
  // disconnect: Cleanup
});

// ============================================
// GAME LOGIC: TEAM MANAGEMENT (lines 161-190)
// ============================================
handleJoinTeam() - Atomically move player between teams

// ============================================
// GAME LOGIC: GAME INITIALIZATION (lines 192-223)
// ============================================
handleStartGame() - Set up game state, shuffle words

// ============================================
// GAME LOGIC: TURN MANAGEMENT (lines 236-366)
// ============================================
handleStartTurn() - Initialize turn, preload word queue
  ⚠️ Uses global flag 'isStartingTurn' to prevent concurrent calls
  ⚠️ Checks if words exhausted → reshuffle or end game

// ============================================
// GAME LOGIC: WORD ACTIONS (lines 368-482)
// ============================================
handleWordCorrect() - Mark word correct, increment score
handleWordSkip() - Mark word skipped, apply penalty if needed
  ⚠️ Both include 4-second duplicate detection window

// ============================================
// GAME LOGIC: WORD QUEUE REFILL (lines 484-570)
// ============================================
handleRequestMoreWords() - Append words to queue
  ⚠️ Uses retry logic to handle Mongoose VersionError
  ⚠️ Reloads game to avoid version conflicts

// ============================================
// GAME LOGIC: TURN COMPLETION (lines 572-660)
// ============================================
handleEndTurn() - Save score, rotate describer, advance team
handleNextTurn() - Wrapper that delegates to handleStartTurn()
```

**Concurrency Handling:**
- `isStartingTurn` global flag prevents duplicate turn initialization
- Atomic MongoDB updates (`$set`, `$unset`) for team joining
- Retry logic in `handleRequestMoreWords()` for version conflicts

---

### Client Components

#### `client/src/context/GameContext.jsx`
**Global State Provider** - Manages game state and Socket.IO connection.

**Exports:**
- `GameProvider` - Wrapper component for app
- `useGame()` - Hook to access game state and actions

**State:**
```javascript
{
  game: Object,          // Current game state (from server)
  socket: Socket,        // Socket.IO client instance
  loading: Boolean,      // API request in progress
  error: String          // Error message to display
}
```

**Key Functions:**
- `createGame(hostId, hostName, teamNames)` - POST /api/games
- `joinGame(gameId, playerId, playerName)` - POST /api/games/:id/join
- `joinTeam(gameId, teamIndex, playerId, playerName)` - POST /api/games/:id/teams/:teamIndex/join
- `startGame(gameId, hostId)` - PATCH /api/games/:id/start
- `fetchGame(gameId)` - GET /api/games/:id
- `emitGameAction(action, payload)` - Emit socket event: `game-action`

**Socket Event Listeners:**
- `game-updated` → Updates local game state
- `error` → Sets error message

---

#### `client/src/components/GameScreen.jsx`
**Active Gameplay Component** - Displays word, timer, and controls during turns.

**Key State:**
```javascript
{
  timeLeft: Number,              // Countdown timer
  isDescriber: Boolean,          // Is current player the describer?
  isCurrentTeam: Boolean,        // Is current player on active team?
  isProcessingAction: Boolean,   // Button debounce flag
  localWordQueue: [String],      // ⭐ Local copy of word queue for optimistic updates
  localWordIndex: Number         // ⭐ Current position in local queue
}
```

**Key Logic:**
- **Timer Management** (lines 95-147): Client-side countdown, calls `handleEndTurn()` at 0
- **Word Queue Initialization** (lines 25-36): Sets local queue when turn starts
- **Optimistic Updates** (lines 151-223): Shows next word instantly from local queue
- **Auto-Refill** (lines 42-59): Requests more words when ≤8 remaining
- **Queue Sync** (lines 62-85): Updates local queue when server sends more words
- **Role Detection** (lines 95-147): Determines if player is describer/guesser/spectator

**Views:**
1. **Describer:** Shows word + category + Correct/Skip buttons
2. **Guesser:** Shows "Your team is guessing!" + category
3. **Spectator:** Shows "Waiting for [Team]" + category

---

#### `client/src/components/ReadyScreen.jsx`
**Between-Turn Component** - Shows results and prepares for next turn.

**Displays:**
1. **Last Turn Results** (if available):
   - Team name + describer name
   - Score earned
   - List of words (correct ✓ vs skipped ⊘)
   - Updated leaderboard
2. **Next Turn Info:**
   - Team name
   - Describer name
   - Role-specific message

**Role-Specific Actions:**
- **Describer:** "Start Turn" button → emits `start-turn`
- **Guesser:** "Waiting for [describer]..."
- **Spectator:** "Watch [team] play!"

**Navigation:**
- When `currentPhase === 'guessing'` → Navigate to GameScreen
- When `status === 'finished'` → Show "View Final Results" button → GameOverScreen

---

#### `client/src/components/LobbyScreen.jsx`
**Pre-Game Component** - Team selection and game configuration.

**Features:**
- Display game ID for sharing
- Show all teams with player lists
- "Join Team" buttons (players can switch teams)
- Game settings display (read-only)
- "Start Game" button (host only, requires ≥2 teams with players)

**Navigation:**
- When `status === 'in-progress'` → Navigate to ReadyScreen

---

## 🔌 Socket Communication

### Client → Server Events

| Event | Description | Payload | Handler |
|-------|-------------|---------|---------|
| `join-game` | Subscribe to game room | `gameId: String` | Socket.IO room subscription |
| `leave-game` | Unsubscribe from game room | `gameId: String` | Socket.IO room unsubscription |
| `game-action` | Perform game action | `{ gameId, action, payload }` | Routes to specific handler |

### Game Actions (via `game-action` event)

| Action | When | Payload | Handler Function |
|--------|------|---------|-----------------|
| `join-team` | Player joins a team | `{ playerId, playerName, teamIndex }` | `handleJoinTeam()` |
| `start-game` | Host starts game | `{}` | `handleStartGame()` |
| `start-turn` | Describer starts turn | `{}` | `handleStartTurn()` |
| `word-correct` | Describer marks word correct | `{ word, queueIndex }` | `handleWordCorrect()` |
| `word-skip` | Describer skips word | `{ word, queueIndex }` | `handleWordSkip()` |
| `request-more-words` | Client needs more words | `{ count: Number }` | `handleRequestMoreWords()` |
| `end-turn` | Turn ends (timer or manual) | `{}` | `handleEndTurn()` |
| `next-turn` | Advance to next turn | `{}` | `handleNextTurn()` (delegates to handleStartTurn) |

### Server → Client Events

| Event | Description | Payload | When Emitted |
|-------|-------------|---------|--------------|
| `game-updated` | Game state changed | `Game` (full document) | After any state change |
| `player-joined` | Player joined game | `{ playerId, timestamp }` | When player joins room |
| `player-left` | Player left game | `{ playerId, timestamp }` | When player leaves room |
| `error` | Action failed | `{ message: String }` | On server error |

### Broadcasting Pattern
```javascript
// Server broadcasts to all clients in game room
io.to(gameId).emit('game-updated', updatedGame);

// Client receives update and updates local state
socket.on('game-updated', (updatedGame) => {
  setGame(updatedGame);
});
```

---

## 🎮 Game Flow

### Complete Game Lifecycle

```
1. LOBBY PHASE
   ├─ Host creates game (POST /api/games)
   ├─ Players join (POST /api/games/:id/join)
   ├─ Players select teams (game-action: join-team)
   └─ Host starts game (PATCH /api/games/:id/start)
        └─> status: "in-progress", currentPhase: "ready"

2. GAME PHASE (Repeat for each team/round)
   ├─ READY (currentPhase: "ready")
   │   ├─ Show last turn results (if any)
   │   ├─ Show next team + describer
   │   └─ Describer clicks "Start Turn" (game-action: start-turn)
   │        └─> currentPhase: "guessing", currentTurn initialized
   │
   ├─ GUESSING (currentPhase: "guessing")
   │   ├─ Timer counts down (client-side)
   │   ├─ Describer sees word + controls
   │   ├─ Describer clicks Correct (game-action: word-correct)
   │   │    └─> Client shows next word instantly (optimistic)
   │   │    └─> Server updates score + queue index (background)
   │   ├─ OR Describer clicks Skip (game-action: word-skip)
   │   │    └─> Same optimistic update pattern
   │   ├─ Client auto-requests more words when ≤8 left (game-action: request-more-words)
   │   └─ Timer expires OR describer clicks "End Turn" (game-action: end-turn)
   │        └─> Score saved to team
   │        └─> Describer rotated for that team
   │        └─> currentTeamIndex advanced
   │        └─> currentPhase: "ready"
   │
   └─ Loop back to READY for next team

3. GAME END
   ├─ After all teams complete totalRounds
   ├─ status: "finished", currentPhase: "ready"
   ├─ ReadyScreen shows "View Final Results" button
   └─ GameOverScreen displays winner + all scores
```

### Round and Team Rotation

**Example with 2 teams, 3 rounds:**
```
Round 1:
  Turn 1: Team 0 (Describer: Player 0) → READY → GUESSING → READY
  Turn 2: Team 1 (Describer: Player 0) → READY → GUESSING → READY
  [currentTeamIndex wraps to 0, currentRound increments to 2]

Round 2:
  Turn 3: Team 0 (Describer: Player 1) → READY → GUESSING → READY
  Turn 4: Team 1 (Describer: Player 1) → READY → GUESSING → READY
  [currentRound increments to 3]

Round 3:
  Turn 5: Team 0 (Describer: Player 2) → READY → GUESSING → READY
  Turn 6: Team 1 (Describer: Player 2) → READY → GUESSING → READY
  [currentRound increments to 4, which exceeds totalRounds (3)]
  [status: "finished"]
```

**Describer Rotation Logic:**
- Each team independently rotates describers
- After Team 0's turn: `currentDescriberIndex["0"] = (0 + 1) % teamSize`
- After Team 1's turn: `currentDescriberIndex["1"] = (0 + 1) % teamSize`
- Ensures fair distribution even with different team sizes

---

## ⚡ Performance Optimizations

### 1. Word Preloading (Optimistic Updates)
- **Impact:** Reduced perceived latency from 1-2s to 0ms
- **Files:** `server/index.js:236-366, 484-570`, `client/src/components/GameScreen.jsx:15-223`
- **Details:** See [Complex Features](#complex-features) section

### 2. Socket.IO Transports
```javascript
// server/index.js:24-26
transports: ['websocket', 'polling'],
pingTimeout: 30000,
pingInterval: 10000,
```
- Prefers WebSocket for lower latency
- Falls back to polling if WebSocket blocked
- Aggressive ping settings for faster reconnection detection

### 3. Database Indexes
```javascript
// server/models/Game.js:120-122
gameSchema.index({ id: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ createdAt: 1 });
```
- Fast lookups by game ID (primary query)
- Status index for filtering active games (future feature)

### 4. Atomic MongoDB Updates
```javascript
// server/routes/gameRoutes.js:129-136, 189-212
Game.updateOne({ id: gameId }, { 
  $set: { [`teams.${teamIndex}.players.${playerId}`]: playerName }
});
```
- Prevents race conditions when multiple players join simultaneously
- Avoids full document reload for team updates

### 5. Mobile-Responsive Design
- Tailwind breakpoints: `sm:`, `md:`, `lg:`
- Viewport height optimization: `h-[95vh]` on mobile to reduce scrolling
- Font size scaling: `text-3xl sm:text-4xl md:text-5xl`
- Compact labels: "Skips Remaining" → "Skips", "points" → "pts"

---

## ⚠️ Common Gotchas

### 1. Mongoose Map Keys Must Be Strings
```javascript
// ❌ WRONG
game.currentDescriberIndex.get(teamIndex)

// ✅ CORRECT
game.currentDescriberIndex.get(String(teamIndex))
```

### 2. Nested Objects Require markModified()
```javascript
// ❌ WRONG - Changes won't save!
game.wordsByCategoryForGame[category] = newWords;
await game.save();

// ✅ CORRECT
game.wordsByCategoryForGame[category] = newWords;
game.markModified('wordsByCategoryForGame');
await game.save();
```

### 3. Player Storage Is Object, Not Array
```javascript
// ❌ WRONG
team.players.forEach(player => ...)

// ✅ CORRECT
Object.keys(team.players)  // → ["abc123", "def456"]
Object.entries(team.players)  // → [["abc123", "Alice"], ["def456", "Bob"]]
Object.values(team.players)  // → ["Alice", "Bob"]
```

### 4. Socket.IO Rooms Require Manual Join
```javascript
// Client must emit join-game after connecting
socket.emit('join-game', gameId);

// Server subscribes client to room
socket.join(gameId);

// Now server can broadcast to room
io.to(gameId).emit('game-updated', game);
```

### 5. React Context Can Be Null During HMR
```javascript
// client/src/context/GameContext.jsx:11-14
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    console.warn('useGame called outside of GameProvider');
    return null;  // Don't throw error during hot reload
  }
  return context;
};
```

### 6. Word Queue Index vs Word Array Index
```javascript
// currentTurn.queueIndex tracks position in wordQueue (queue-specific)
// wordsByCategoryForGame[category] is separate pool (remaining words)

// When word used from queue:
game.currentTurn.queueIndex++;  // Advance in queue

// When queue needs refill:
const moreWords = words.pop();  // Pop from remaining pool
game.currentTurn.wordQueue.push(moreWords);  // Append to queue
```

### 7. Client-Server State Divergence
With optimistic updates, client state can temporarily differ from server:
```javascript
// Client shows word #5 from local queue
localWordIndex = 5

// Server might still processing word #4 due to network delay
game.currentTurn.queueIndex = 4

// This is expected! Server will catch up.
// Client syncs when receiving game-updated event.
```

### 8. Timer Is Client-Side Only
```javascript
// Server stores startTime, client calculates remaining time
const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
const remaining = turnDuration - elapsed;

// Each client independently counts down
// Server doesn't track timer - relies on client to emit end-turn
```

### 9. Environment Variables
```javascript
// Server must have:
MONGODB_URI=mongodb+srv://...  // Required
CLIENT_URL=https://...         // Optional (for CORS)
PORT=3001                      // Optional (default: 3001)

// Client reads from:
process.env.NODE_ENV           // 'production' or 'development'
// Socket URL determined automatically based on NODE_ENV
```

### 10. Game End Condition Logic
```javascript
// server/index.js:283-293
// Game ends when:
// 1. No words left in any category, AND
// 2. currentRound > totalRounds

// If words exhausted but rounds incomplete, words are reshuffled
// This ensures all teams get equal number of turns
```

---

## 📝 Code Conventions

### Logging with Emoji Prefixes
```javascript
console.log('✅ Success message');
console.warn('⚠️ Warning message');
console.error('❌ Error message');
console.log('📨 Received event');
console.log('📤 Sent event');
console.log('🎯 Matched condition');
console.log('🔄 State update');
console.log('🚀 Action emitted');
```

### State Management
- **Global State:** React Context (game state, socket)
- **UI State:** Local component state (loading, modals, forms)
- **Never mutate game state directly** - always emit socket action

### Error Handling
- **Server:** Return original game on error (avoids breaking state)
- **Client:** Set error state and display to user
- **Always await saves** and handle Mongoose VersionError

### Naming Conventions
- `playerId` - Unique player identifier (localStorage)
- `playerName` - Display name
- `gameId` - Unique game identifier (e.g., "ABC123")
- `teamIndex` - 0-indexed position in teams array
- `describerIndex` - 0-indexed position in team's player list

---

## 🔍 Future Improvements

### Potential Enhancements
1. **Authentication:** User accounts, persistent stats
2. **Game Variants:** Different word categories, difficulty levels, custom word lists
3. **Spectator Mode:** Join game without being on a team
4. **Replay:** View turn-by-turn playback
5. **Mobile App:** React Native version
6. **Voice Chat:** Integrated audio communication
7. **Tournaments:** Bracket system, leaderboards

### Technical Debt
1. Remove unused `TurnSummaryScreen.jsx` (if confirmed unused)
2. Extract game logic handlers to separate files (server/handlers/)
3. Add TypeScript for type safety
4. Add unit tests (Jest) and E2E tests (Playwright)
5. Implement connection recovery (rejoin after disconnect)
6. Add rate limiting to prevent API abuse
7. Implement game cleanup (delete old games)

---

## 📚 Additional Resources

### Related Documentation
- [README.md](./README.md) - Setup and deployment guide
- [TODO.txt](./TODO.txt) - Active tasks and completed history
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Quick deployment guide
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) - Railway-specific deployment

### External Documentation
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [React Router v6](https://reactrouter.com/en/main)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)

---

**Last Updated:** October 19, 2025  
**Maintainer:** @jdcb4  
**Questions?** Check TODO.txt or add inline comments with `@jdcb4` mention.

