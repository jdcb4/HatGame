# Hint Feature Implementation Summary

## Overview
Implemented hint functionality and removed redundant "words remaining" text from the describer view.

## Changes Made

### 1. Removed "words remaining" Text
**File:** `client/src/components/GameScreen.jsx`
- Removed the debug info showing "X words remaining" from the describer's screen (lines 373-378)
- This information relates to backend caching and doesn't need to be visible to players

### 2. Added Hint System

#### Backend Changes

**File:** `server/models/Game.js`
- Added `hintsPerTurn` setting to `gameSettings` (default: 2)
  - Configurable for future adjustments
  - Stored at game level for consistency across all turns
- Added `hintsRemaining` to `currentTurn` schema
  - Tracks how many hints the describer has left in current turn
  - Initialized when turn starts, decrements when used

**File:** `server/index.js`
- Added `handleUseHint` function (lines 490-515)
  - Validates currentTurn exists
  - Checks if hints are available
  - Decrements hintsRemaining counter
  - Includes emoji logging (💡 for hints)
- Added 'use-hint' case to socket action switch (line 125-127)
- Updated `handleStartTurn` to initialize `hintsRemaining` from `gameSettings.hintsPerTurn` (line 353)

#### Frontend Changes

**File:** `client/src/components/GameScreen.jsx`

**State Management:**
- Added `showHint` state to control hint visibility (line 20)
- Added `currentHint` state to store current hint text (line 21)

**Hint Display Logic:**
- Added useEffect to clear hint when word changes (lines 42-46)
  - Ensures hint disappears when moving to next word
  - Automatic cleanup on word index change
- Clear hint when turn ends in `handleEndTurn` (lines 232-234)

**Hint Button & Display:**
- Added `handleShowHint` function (lines 240-250)
  - Retrieves hint from `hintQueue` at current word index
  - Shows hint in UI
  - Sends 'use-hint' action to server to decrement counter
  - Disabled when no hints remaining or hint already showing
- Added hint button UI (lines 452-461)
  - Shows "💡 Hint (X)" where X is remaining hints
  - Positioned above Skip/Correct buttons
  - Full width, indigo color scheme
  - Disabled when: no hints left, hint currently showing, or hintsRemaining is 0
  - Button grayed out (bg-slate-400) when disabled
- Added hint display box (lines 400-407)
  - Appears below category when hint is shown
  - Indigo color scheme matching button
  - Shows "💡 {hint text}"
  - Responsive design with max-width

## How It Works

### Turn Flow:
1. **Turn starts:** Describer has 2 hints available (configurable)
2. **Clicking hint button:**
   - Fetches hint for current word from `hintQueue`
   - Displays hint in blue box below category
   - Sends 'use-hint' action to server
   - Server decrements `hintsRemaining`
   - Button shows updated count
3. **Word changes (Correct/Skip):**
   - Hint automatically clears
   - Button re-enabled if hints remain
   - New hint available for new word
4. **Turn ends:**
   - Hint clears
   - Next turn resets to 2 hints

### Data Flow:
```
Server (handleStartTurn):
- Loads hints from words.js into hintQueue
- Sets hintsRemaining = gameSettings.hintsPerTurn (2)

Client (GameScreen):
- Shows hint button with count
- On click: display hint from hintQueue[localWordIndex]
- Sends use-hint action to server
- Server decrements hintsRemaining
- Button updates to show new count

On word change:
- Client clears hint display
- Button remains available if hintsRemaining > 0
```

## Configuration

To change the number of hints per turn in the future:
1. Modify `hintsPerTurn` default in `server/models/Game.js` (line 55-58)
2. Or add UI in lobby to configure `gameSettings.hintsPerTurn`
3. The system will automatically use the configured value

## Testing Checklist

- ✅ Hint button shows correct count (2 at start)
- ✅ Clicking hint displays hint text
- ✅ Hint count decrements after use
- ✅ Button disabled when no hints left
- ✅ Button disabled when hint already showing
- ✅ Hint clears when word changes (Correct/Skip)
- ✅ Hint clears when turn ends
- ✅ New turn resets hints to 2
- ✅ Hint displays correct text for each word
- ✅ Mobile responsive design
- ✅ No linter errors

## Files Modified

1. `client/src/components/GameScreen.jsx` - UI and hint logic
2. `server/models/Game.js` - Schema updates
3. `server/index.js` - Server-side hint handling
4. `server/data/words.js` - Already had hints from previous update

## Notes

- Hints are already populated in the word data from the CSV conversion
- Hint feature is ready to use immediately
- Easy to make configurable in lobby settings later
- Uses optimistic UI pattern (shows hint instantly, server validates)
- Simple and understandable code for novice coders
- Follows project conventions (emoji logging, descriptive names)

## Last Updated
October 22, 2025

