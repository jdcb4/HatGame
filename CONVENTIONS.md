# Code Conventions

> **Purpose:** Establish consistent coding patterns for AI agents and developers working on BackEndTicky.

**Last Updated:** October 19, 2025  
**Project:** BackEndTicky (Multiplayer Word Guessing Game)  
**Author:** @jdcb4

---

## 📋 Table of Contents

1. [General Principles](#general-principles)
2. [Code Style](#code-style)
3. [State Management](#state-management)
4. [Socket Communication](#socket-communication)
5. [Database Operations](#database-operations)
6. [React Components](#react-components)
7. [Error Handling](#error-handling)
8. [Logging Standards](#logging-standards)
9. [Testing](#testing)
10. [Comments & Documentation](#comments--documentation)

---

## 🎯 General Principles

### Write for Novice Coders
> "Code should be structured to be understandable to a user that is a novice coder."

- **Prefer explicit over clever**
- **Use descriptive variable names**
- **Break complex logic into smaller functions**
- **Add explanatory comments for "why", not "what"**

### Examples

❌ **BAD - Too clever:**
```javascript
const t = game.teams[game.currentTeamIndex];
const d = Object.keys(t.players)[game.currentDescriberIndex.get(String(game.currentTeamIndex))];
```

✅ **GOOD - Explicit and clear:**
```javascript
// Get the current team
const currentTeam = game.teams[game.currentTeamIndex];

// Get the describer's player ID for this team
const teamPlayerIds = Object.keys(currentTeam.players);
const describerIndex = game.currentDescriberIndex.get(String(game.currentTeamIndex));
const describerPlayerId = teamPlayerIds[describerIndex];
```

---

## 🎨 Code Style

### Naming Conventions

#### Variables
- **camelCase** for variables and functions
- **Descriptive names** over abbreviations
- **Boolean prefixes:** `is`, `has`, `should`, `can`

```javascript
// ✅ Good
const isDescriber = game.currentTurn?.describerPlayerId === playerId;
const hasMoreWords = wordQueue.length > 0;
const canStartGame = teamsWithPlayers.length >= 2;

// ❌ Bad
const desc = game.currentTurn?.describerPlayerId === playerId;
const words = wordQueue.length > 0;
const start = teamsWithPlayers.length >= 2;
```

#### Constants
- **SCREAMING_SNAKE_CASE** for true constants
- **camelCase** for config objects

```javascript
// ✅ Good
const DEFAULT_TURN_DURATION = 30;
const MAX_SKIP_PENALTY = 1;

const gameSettings = {
  turnDuration: 30,
  totalRounds: 3
};

// ❌ Bad
const default_turn_duration = 30;
const GAMESETTINGS = { ... };
```

#### Functions
- **Verb-first naming** for actions
- **Get/Set** for accessors
- **Handle** prefix for event handlers

```javascript
// ✅ Good
function handleStartTurn(game) { ... }
function emitGameAction(action, payload) { ... }
function getDescriberForTeam(team, index) { ... }

// ❌ Bad
function startTurn(game) { ... }  // Unclear if it starts or prepares
function gameAction(action) { ... }  // Too vague
function describerForTeam(team) { ... }  // Noun, not verb
```

### Formatting

#### Indentation
- **2 spaces** (not tabs)
- Consistent across all files

#### Line Length
- **Prefer 100 characters max**
- Break long lines at logical points

```javascript
// ✅ Good
const updatedGame = await Game.updateOne(
  { id: gameId },
  { 
    $set: { [`teams.${teamIndex}.players.${playerId}`]: playerName }
  }
);

// ❌ Bad
const updatedGame = await Game.updateOne({ id: gameId }, { $set: { [`teams.${teamIndex}.players.${playerId}`]: playerName } });
```

#### Braces
- Always use braces for conditionals (even single line)
- Opening brace on same line

```javascript
// ✅ Good
if (game.status === 'finished') {
  return;
}

// ❌ Bad
if (game.status === 'finished') return;

if (game.status === 'finished')
{
  return;
}
```

---

## 🗂️ State Management

### Server State (Source of Truth)
- MongoDB stores the authoritative game state
- All state changes happen on server
- Server broadcasts updates to all clients

```javascript
// ✅ Good - Modify on server, broadcast to clients
async function handleWordCorrect(game, { word }) {
  game.currentTurn.turnScore++;
  const savedGame = await game.save();
  io.to(game.id).emit('game-updated', savedGame);
  return savedGame;
}

// ❌ Bad - Don't modify state on client and sync back
// Client should only emit actions, not modify game state directly
```

### Client State Categories

#### 1. Global Game State (React Context)
```javascript
// Store in GameContext - shared across components
{
  game: Object,        // From server
  socket: Socket,      // Socket.IO client
  loading: Boolean,
  error: String
}
```

#### 2. Local Component State
```javascript
// Store in component - UI-only state
const [isProcessingAction, setIsProcessingAction] = useState(false);
const [selectedTeam, setSelectedTeam] = useState(null);
const [timeLeft, setTimeLeft] = useState(0);
```

#### 3. Optimistic State (Special Case)
```javascript
// Local copy of server state for instant feedback
const [localWordQueue, setLocalWordQueue] = useState([]);
const [localWordIndex, setLocalWordIndex] = useState(0);

// Sync when server updates
useEffect(() => {
  if (game?.currentTurn?.wordQueue) {
    setLocalWordQueue(game.currentTurn.wordQueue);
  }
}, [game?.currentTurn?.wordQueue]);
```

### State Update Rules

1. **Never mutate game state directly**
   ```javascript
   // ❌ Bad
   game.currentTurn.score = 5;
   
   // ✅ Good
   emitGameAction('word-correct', { word });
   ```

2. **Always emit socket actions for state changes**
   ```javascript
   // ✅ Good
   emitGameAction('start-turn', {});
   ```

3. **Let server handle validation and logic**
   ```javascript
   // ❌ Bad - Don't validate on client
   if (game.currentTurn.skipsRemaining > 0) {
     emitGameAction('word-skip', { word });
   }
   
   // ✅ Good - Let server handle validation
   emitGameAction('word-skip', { word });
   // Server will check skipsRemaining and apply penalty if needed
   ```

---

## 🔌 Socket Communication

### Event Naming
- **kebab-case** for socket event names
- **Action names:** verb-object format

```javascript
// ✅ Good
socket.emit('game-action', { action: 'start-turn', payload: {} });
socket.emit('join-game', gameId);

// ❌ Bad
socket.emit('gameAction', { action: 'startTurn', payload: {} });
socket.emit('joinGame', gameId);
```

### Game Action Structure

Always use this format for game actions:

```javascript
// Client → Server
{
  gameId: String,      // Required - which game
  action: String,      // Required - what action
  payload: Object      // Optional - action data
}

// Example
emitGameAction('word-correct', { word: 'banana', queueIndex: 5 });

// Becomes
socket.emit('game-action', {
  gameId: game.id,
  action: 'word-correct',
  payload: { word: 'banana', queueIndex: 5 }
});
```

### Broadcasting Pattern

```javascript
// ✅ Good - Broadcast to all clients in game room
io.to(gameId).emit('game-updated', updatedGame);

// ❌ Bad - Don't emit to individual sockets
socket.emit('game-updated', updatedGame);  // Only sends to one client
```

### Error Handling

```javascript
// Server-side error response
socket.emit('error', { message: 'Game not found' });

// Client-side error handling
socket.on('error', (errorData) => {
  setError(errorData.message);
  console.error('❌ Socket error:', errorData.message);
});
```

---

## 💾 Database Operations

### Mongoose Best Practices

#### 1. Always Use String Keys for Maps

```javascript
// ❌ Bad - Map keys must be strings in Mongoose
game.currentDescriberIndex.get(teamIndex)

// ✅ Good - Convert to string
game.currentDescriberIndex.get(String(teamIndex))
game.currentDescriberIndex.set(String(teamIndex), describerIndex)
```

#### 2. Mark Nested Objects as Modified

```javascript
// ❌ Bad - Changes won't be saved!
game.wordsByCategoryForGame[category] = newWords;
await game.save();

// ✅ Good - Tell Mongoose the field changed
game.wordsByCategoryForGame[category] = newWords;
game.markModified('wordsByCategoryForGame');
await game.save();

// Also applies to nested properties
game.currentTurn.wordQueue = newQueue;
game.markModified('currentTurn.wordQueue');
await game.save();
```

#### 3. Use Atomic Updates for Concurrent Operations

```javascript
// ✅ Good - Atomic update prevents race conditions
await Game.updateOne(
  { id: gameId },
  { 
    $set: { [`teams.${teamIndex}.players.${playerId}`]: playerName }
  }
);

// ❌ Bad - Load, modify, save can cause race conditions
const game = await Game.findOne({ id: gameId });
game.teams[teamIndex].players[playerId] = playerName;
await game.save();  // Another update might have happened between load and save
```

#### 4. Handle Version Conflicts

```javascript
// ✅ Good - Retry on version conflict
let retries = 3;
while (retries > 0) {
  try {
    await game.save();
    break;
  } catch (err) {
    if (err.name === 'VersionError' && retries > 1) {
      console.log(`⚠️ Version conflict, retrying... (${retries - 1} attempts left)`);
      retries--;
      // Reload game and try again
      const freshGame = await Game.findOne({ id: game.id });
      Object.assign(game, freshGame);
    } else {
      throw err;
    }
  }
}
```

### Working with Player Objects

```javascript
// Players are stored as { [playerId]: playerName } objects, NOT arrays

// ✅ Good - Iterate using Object methods
const playerIds = Object.keys(team.players);
const playerNames = Object.values(team.players);
const playerEntries = Object.entries(team.players);

playerEntries.forEach(([playerId, playerName]) => {
  console.log(`${playerName} (${playerId})`);
});

// ❌ Bad - Don't treat as array
team.players.forEach(player => ...);  // TypeError: players.forEach is not a function
```

### Indexes

```javascript
// Always add indexes for frequently queried fields
gameSchema.index({ id: 1 });           // Primary lookup
gameSchema.index({ status: 1 });       // Filter by status
gameSchema.index({ createdAt: 1 });    // Sort by creation
```

---

## ⚛️ React Components

### Component Structure

```javascript
// Standard component structure order:
function ComponentName({ props }) {
  // 1. Hooks (useParams, useNavigate, useContext)
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, emitGameAction } = useGame();
  
  // 2. Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 3. Refs (if needed)
  const hasRequestedMore = useRef(false);
  
  // 4. Effects
  useEffect(() => {
    // Fetch data, set up subscriptions, etc.
  }, [dependencies]);
  
  // 5. Event handlers
  const handleStartTurn = () => {
    emitGameAction('start-turn', {});
  };
  
  // 6. Early returns (loading, error, not found)
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!game) {
    return <NotFound />;
  }
  
  // 7. Derived state / computations
  const currentTeam = game.teams[game.currentTeamIndex];
  const isDescriber = currentTeam.describerPlayerId === playerId;
  
  // 8. Main render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

### Props and Naming

```javascript
// ✅ Good - Destructure props in function signature
function GameScreen({ playerId, playerName }) {
  // Use directly
  console.log(playerId);
}

// ❌ Bad - Don't use props object
function GameScreen(props) {
  console.log(props.playerId);  // Less clear
}
```

### Conditional Rendering

```javascript
// ✅ Good - Use ternary for simple conditions
{isDescriber ? <DescriberView /> : <GuesserView />}

// ✅ Good - Use && for optional rendering
{error && <ErrorMessage message={error} />}

// ✅ Good - Use early returns for complex conditions
if (game.status === 'finished') {
  return <GameOverScreen />;
}

// ❌ Bad - Nested ternaries
{isDescriber ? <Describer /> : isGuesser ? <Guesser /> : <Spectator />}
```

### useEffect Dependencies

```javascript
// ✅ Good - Include all dependencies
useEffect(() => {
  if (game?.currentTurn?.startTime) {
    console.log('Turn started');
  }
}, [game?.currentTurn?.startTime]);

// ❌ Bad - Missing dependencies (causes stale closures)
useEffect(() => {
  if (game?.currentTurn?.startTime) {
    console.log('Turn started');
  }
}, []);  // Missing game dependency
```

### Component File Organization

```javascript
// Add explanatory comment at top of complex components
/**
 * GameScreen - Active Gameplay Component
 * 
 * Shows the current word to the describer with Correct/Skip controls.
 * Uses optimistic updates with local word queue for instant feedback.
 * 
 * Key Features:
 * - Word preloading (15-word queue)
 * - Optimistic UI updates (0ms latency)
 * - Auto-refill when queue low
 * - Role-based views (describer/guesser/spectator)
 */
function GameScreen({ playerId, playerName }) {
  // ...
}
```

---

## 🚨 Error Handling

### Server-Side Error Handling

```javascript
// ✅ Good - Return game on error to avoid breaking state
async function handleWordCorrect(game, { word }) {
  try {
    // ... game logic ...
    return await game.save();
  } catch (error) {
    console.error('❌ Error in handleWordCorrect:', error);
    return game;  // Return original game, don't throw
  }
}
```

### Client-Side Error Handling

```javascript
// ✅ Good - Set error state and display to user
const handleStartGame = async () => {
  try {
    await startGame(gameId, playerId);
  } catch (err) {
    console.error('❌ Failed to start game:', err);
    setError(err.response?.data?.message || 'Failed to start game');
  }
};

// Display error in UI
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
    {error}
  </div>
)}
```

### API Response Format

```javascript
// ✅ Good - Consistent response structure
// Success
res.json({
  success: true,
  game: updatedGame,
  message: 'Game started successfully'
});

// Error
res.status(404).json({
  success: false,
  message: 'Game not found'
});
```

### Socket Error Handling

```javascript
// ✅ Good - Validate input before processing
socket.on('game-action', async (data) => {
  const { gameId, action, payload } = data;
  
  // Validate required fields
  if (!gameId || !action) {
    socket.emit('error', { message: 'Invalid action format' });
    return;
  }
  
  // Check game exists
  const game = await Game.findOne({ id: gameId });
  if (!game) {
    socket.emit('error', { message: 'Game not found' });
    return;
  }
  
  // Process action
  // ...
});
```

---

## 📝 Logging Standards

### Use Emoji Prefixes for Log Types

```javascript
// Success / Completion
console.log('✅ Turn completed successfully');
console.log('💾 Game saved to database');

// Information / Status
console.log('📨 Received game-updated event');
console.log('📤 Emitted start-turn action');
console.log('📊 Queue status: 12 words remaining');

// Warnings
console.warn('⚠️ Only 3 words left in queue, requesting more');
console.warn('⚠️ Version conflict, retrying...');

// Errors
console.error('❌ Failed to save game');
console.error('❌ Socket connection error');

// Debugging / Tracing
console.log('🔍 Checking queue sync');
console.log('🔄 State update triggered');
console.log('🎯 Matched request-more-words case');
```

### Structured Logging

```javascript
// ✅ Good - Log with context
console.log('📨 Game updated received:', {
  status: updatedGame.status,
  currentPhase: updatedGame.currentPhase,
  currentTurn: updatedGame.currentTurn ? {
    category: updatedGame.currentTurn.category,
    word: updatedGame.currentTurn.word,
    turnScore: updatedGame.currentTurn.turnScore
  } : null
});

// ❌ Bad - Log without context
console.log('Game updated');
console.log(updatedGame);  // Too verbose, hard to scan
```

### Development vs Production

```javascript
// ✅ Good - Verbose logging in development only
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Debug info:', debugData);
}

// Always log errors
console.error('❌ Error:', error);
```

---

## 🧪 Testing

### Test File Naming
```
ComponentName.jsx → ComponentName.test.jsx
helperFunction.js → helperFunction.test.js
```

### Test Structure (Future)
```javascript
describe('handleWordCorrect', () => {
  it('should increment turn score', async () => {
    // Arrange
    const game = createMockGame();
    
    // Act
    const result = await handleWordCorrect(game, { word: 'banana' });
    
    // Assert
    expect(result.currentTurn.turnScore).toBe(1);
  });
  
  it('should prevent duplicate submissions within 4 seconds', async () => {
    // Test duplicate detection logic
  });
});
```

---

## 💬 Comments & Documentation

### When to Comment

#### DO Comment:
- **Why** decisions were made
- **Gotchas** and edge cases
- **Complex logic** that isn't immediately obvious
- **Performance optimizations**
- **Known issues** and their workarounds

```javascript
// ✅ Good - Explains WHY
// Increased to 4 seconds to account for network latency on deployed servers
// Railway round-trip can be 2-3 seconds
const DUPLICATE_DETECTION_WINDOW = 4000;

// ✅ Good - Warns about gotcha
// IMPORTANT: Map keys must be strings for Mongoose
const describerIndex = game.currentDescriberIndex.get(String(teamIndex));

// ✅ Good - Explains complex logic
// Optimistic update: show next word instantly from local queue
// Server will process scoring in background
setLocalWordIndex(nextIndex);
emitGameAction('word-correct', { word });
```

#### DON'T Comment:
- **Obvious** code that explains itself
- **Implementation details** that are clear from the code

```javascript
// ❌ Bad - States the obvious
// Increment the score
score++;

// ❌ Bad - Repeats the code
// Check if game status is finished
if (game.status === 'finished') {
  // ...
}
```

### TODO Comments

```javascript
// ✅ Good - Specific TODO with context
// TODO(@jdcb4): Implement rate limiting to prevent API abuse
// Current issue: No limit on game creation per IP
// Solution: Add express-rate-limit middleware
// Priority: Medium (not urgent, but good security practice)

// ❌ Bad - Vague TODO
// TODO: fix this
```

### Inline Documentation for Complex Functions

```javascript
/**
 * Handles word preloading queue refill
 * 
 * Problem: Client needs continuous word supply for optimistic updates
 * Solution: Append 10 more words when queue runs low
 * 
 * @param {Game} game - Mongoose game document
 * @param {Object} payload - Request payload
 * @param {Number} payload.count - Number of words to request (default: 10)
 * @returns {Promise<Game>} Updated game document
 * 
 * Note: Uses retry logic to handle concurrent word-correct operations
 */
async function handleRequestMoreWords(game, { count = 10 }) {
  // Implementation...
}
```

---

## 🎯 Mobile-First Design

### Responsive Breakpoints
Use Tailwind's responsive prefixes consistently:

```javascript
// ✅ Good - Mobile first, scale up
<h1 className="text-3xl sm:text-4xl md:text-5xl">

// ❌ Bad - Desktop first, scale down
<h1 className="text-5xl md:text-4xl sm:text-3xl">
```

### Viewport Optimization

```javascript
// ✅ Good - Optimize for mobile viewport
<div className="h-[95vh] sm:h-[90vh] max-h-[700px]">

// ✅ Good - Compact labels on mobile
<p>Skips: <span>{skipsRemaining}</span></p>  // Not "Skips Remaining"
```

### Touch Targets

```javascript
// ✅ Good - Large touch targets for mobile
<button className="py-3 sm:py-4 px-6 sm:px-8">

// ❌ Bad - Too small for mobile
<button className="py-1 px-2">
```

---

## 🚀 Performance

### Avoid Unnecessary Re-renders

```javascript
// ✅ Good - Memoize expensive computations
const sortedTeams = useMemo(() => {
  return game.teams.sort((a, b) => b.score - a.score);
}, [game.teams]);

// ✅ Good - Use keys in lists
{teams.map((team, index) => (
  <div key={team.originalIndex}>  // Not key={index}
    {team.name}
  </div>
))}
```

### Debouncing

```javascript
// ✅ Good - Debounce rapid actions
const [isProcessing, setIsProcessing] = useState(false);

const handleClick = () => {
  if (isProcessing) return;
  
  setIsProcessing(true);
  emitAction();
  
  setTimeout(() => setIsProcessing(false), 200);
};
```

---

## 📦 Dependencies

### Adding New Dependencies

Before adding a new dependency, ask:
1. **Is it necessary?** Can we implement it ourselves simply?
2. **Is it maintained?** Check last update date
3. **Is it lightweight?** Check bundle size
4. **Is it secure?** Check for known vulnerabilities

```bash
# ✅ Good - Add with explanation in commit message
npm install express-rate-limit
# Commit: "Add rate limiting to prevent API abuse"

# Document in package.json comments (if needed)
```

---

## 🔄 Git Workflow

### Commit Messages

```bash
# ✅ Good - Descriptive commit messages
git commit -m "Fix: Game now ends only when all teams complete same turns

- Updated handleStartTurn() to check currentRound against totalRounds
- Fixed edge case where game ended mid-round
- Tested with 2 and 3 team games
- Resolves TODO: 'Make sure that the game ends...'"

# ❌ Bad - Vague messages
git commit -m "fixed bug"
git commit -m "updates"
```

### Branch Naming (Future)
```bash
feature/add-voice-chat
fix/duplicate-word-bug
refactor/split-game-handlers
docs/update-architecture
```

---

## 🎯 Summary Checklist

When writing code, ensure:

- [ ] Variable names are descriptive and clear
- [ ] Comments explain WHY, not WHAT
- [ ] State changes go through socket actions (not direct mutation)
- [ ] Mongoose Maps use string keys
- [ ] Nested objects are marked modified
- [ ] Errors are caught and logged with emoji prefixes
- [ ] Mobile-responsive Tailwind classes used
- [ ] useEffect dependencies are complete
- [ ] Atomic updates used for concurrent operations
- [ ] Code is understandable to a novice coder

---

**Last Updated:** October 19, 2025  
**Maintainer:** @jdcb4  
**GitHub:** github.com/jdcb4

For architecture overview, see [ARCHITECTURE.md](./ARCHITECTURE.md)  
For active tasks, see [TODO.txt](./TODO.txt)

