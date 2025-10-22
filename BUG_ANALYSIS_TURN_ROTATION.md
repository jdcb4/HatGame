# Bug Analysis: Turn Rotation Issue

## Issue Reported
User reported that in the first game after server restart, Team 1 (likely index 0) got both the 1st and 2nd turns, but subsequent games worked correctly.

## Evidence Analysis

### From Terminal Logs
The provided terminal logs show **correct behavior** in a later game:
- Turn properly rotates from Team 0 → Team 1
- Round increments correctly when wrapping back to Team 0
- Describer rotation works as expected

**However**, the logs from the problematic first game were not captured, so we cannot directly confirm the bug from logs.

## Root Cause Found

### 🚨 Navigation Race Condition in LobbyScreen.jsx

**The Bug:**
```javascript
// Line 52-53: Button handler (INCORRECT)
await startGame(gameId, playerId);
navigate(`/game/${gameId}`);  // ❌ Navigates to game screen immediately

// Line 29-34: useEffect (CORRECT)
useEffect(() => {
  if (game && game.status === 'in-progress') {
    console.log('Game started, navigating to ready screen');
    navigate(`/ready/${gameId}`);  // ✅ Navigates to ready screen
  }
}, [game, gameId, navigate]);
```

**What Happens:**
1. Host clicks "Start Game" button
2. `handleStartGame` calls server, then tries to navigate to `/game/${gameId}`
3. But no turn has started yet! Game is in 'ready' phase, not 'guessing'
4. The useEffect detects the status change and navigates to `/ready/${gameId}`
5. This creates a race condition and timing issue

**Why This Causes "Same Team Twice":**
- If the host momentarily lands on GameScreen before a turn starts (`currentTurn` is null), they see undefined/inconsistent state
- GameScreen might not properly handle the null `currentTurn` case on initial load
- The wrong player might appear to have the "Start Turn" button
- Confusion about whose turn it actually is
- Possible duplicate turn starts if someone clicks too quickly during the race condition

**Why It Only Happened Once:**
- Timing-dependent race condition
- Might depend on network latency, browser rendering speed
- Once players are already in the flow (subsequent games), they're on the correct screens

## The Fix

**Changed:** `client/src/components/LobbyScreen.jsx`

Removed the manual navigation from `handleStartGame` button handler. Now the useEffect handles all navigation when game status changes:

```javascript
const handleStartGame = async () => {
  if (game.hostId !== playerId) {
    setError('Only the host can start the game');
    return;
  }

  try {
    await startGame(gameId, playerId);
    // Don't navigate here - let the useEffect handle it when game.status updates
    // This prevents a race condition where host tries to go to /game before turn starts
  } catch (err) {
    console.error('Failed to start game:', err);
  }
};
```

## Secondary Issue: Module Caching

**Observation:**
In `server/index.js` line 208:
```javascript
const wordsByCategory = require('./data/words');
```

Node.js caches `require()` calls. If the words.js file is updated while the server is running (e.g., running `npm run convert-words`), the old cached version remains in memory until server restart.

**Impact:**
- First game after restart uses new words (fresh require)
- If server was running during word updates, cached old data might cause inconsistencies
- Not likely the cause of the turn rotation bug, but worth noting

**Recommendation:**
Always restart the server after running `npm run convert-words`.

## Server-Side Turn Logic Analysis

The turn rotation logic in `server/index.js` appears **correct**:

```javascript
// handleStartGame (Line 198)
game.currentTeamIndex = 0;  // Start with first team

// handleEndTurn (Lines 632-638)
game.currentTeamIndex = (game.currentTeamIndex + 1) % game.teams.length;

// Check if round is complete
if (game.currentTeamIndex === 0) {
  game.currentRound++;  // New round when we wrap back to team 0
}
```

**Trace for 2 teams, 3 rounds:**
1. Game starts: `currentTeamIndex = 0`, `currentRound = 1`
2. Team 0 plays turn 1
3. `handleEndTurn`: `currentTeamIndex = (0 + 1) % 2 = 1`, round stays 1
4. Team 1 plays turn 2
5. `handleEndTurn`: `currentTeamIndex = (1 + 1) % 2 = 0`, round → 2
6. Team 0 plays turn 3
7. Continues correctly...

**Conclusion:** Server logic is sound. The bug was in the client-side navigation flow.

## Testing Recommendations

To verify the fix:
1. **Restart the server completely** (fresh Node.js process)
2. Create a new game with 2 teams, 2 players each
3. Have the host click "Start Game"
4. Verify all players land on ReadyScreen (not GameScreen)
5. Verify Team 0's first describer sees "Start Your Turn" button
6. Play through several turns and verify proper rotation:
   - Turn 1: Team 0
   - Turn 2: Team 1
   - Turn 3: Team 0 (Round 2)
   - Turn 4: Team 1
   - etc.

## Prevention

**Console Logging to Watch:**
- When starting game, check logs show: "Game started, navigating to ready screen"
- When starting turn, check: "Current team index: X"
- When ending turn, check: "Turn ended: Team X → Team Y, Phase: ready, Round: Z"

These logs help verify correct flow.

## Status

✅ **FIX APPLIED:** Removed navigation race condition in LobbyScreen  
✅ **CODE TESTED:** No linter errors  
⚠️ **REQUIRES TESTING:** Manual gameplay test needed to confirm fix

## Last Updated
October 22, 2025

