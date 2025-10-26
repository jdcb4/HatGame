# The Hat Game - Official Rules

## Overview

The Hat Game is a multiplayer party game where teams compete across three distinct phases to guess as many person names (clues) as possible. The same set of clues is used in all three phases, with each phase having different rules for how the describer can communicate.

## Setup

### Teams
- **2 to 4 teams** (configurable)
- **At least 2 players per team** (teams don't need to be equal size)

### Clue Submission
- Each player submits a configurable number of clues (default: 6)
- **Each clue must be the name of a person** (real or fictional)
  - Examples: "Barack Obama", "Superman", "Beyoncé", "Gandalf"
- All clues go into a shared pool used across all three phases

## Game Flow

### Phase 1: Describe (Multiple Words)
**Goal:** Describe the person using as many words as you want

**Rules for Describer:**
- Can say as many words as needed to describe the person
- Cannot say any part of the person's actual name
- Can give hints about what they're known for, their appearance, relationships, etc.

**Example:**
- Clue: "Albert Einstein"
- Valid: "Famous physicist with wild white hair, developed theory of relativity"
- Invalid: "His first name is Albert..."

### Phase 2: One Word (Single Word Only)
**Goal:** Give a clue using exactly ONE WORD

**Rules for Describer:**
- Can say exactly **ONE WORD** for the entire clue
- No gestures or sound effects allowed
- Teammates must rely on memory from Phase 1

**Example:**
- Clue: "Albert Einstein"
- Valid: "Relativity" or "Physicist" or "E=MC²"
- Invalid: "Wild hair scientist" (more than one word)

### Phase 3: Charades (Silent Acting)
**Goal:** Act out the person silently

**Rules for Describer:**
- **Complete silence** - no words or sounds allowed
- Use only physical movement and gestures
- Teammates rely on memory from previous phases

**Example:**
- Clue: "Albert Einstein"
- Valid: Act out writing equations, make wild hair gesture
- Invalid: Making any sounds or saying anything

## Turn Structure

### Each Turn
1. **Timer starts** (default: 45 seconds, configurable)
2. **Describer sees clues** one at a time
3. **For each clue:**
   - Team guesses the person's name
   - If correct: describer clicks "Correct" → next clue appears instantly
   - If skip: describer clicks "Skip" → see skip rules below

### Scoring
- **+1 point** for each correct guess
- **No penalty** for skipping

### Skip Rules (With Return)
- Describer gets **1 skip per turn** (configurable)
- After skipping a clue, the skip button is **disabled**
- Skip button **re-enables** only after the skipped clue is answered correctly
- If the skipped clue comes up again, it must be answered before skipping another

**Why?** This prevents describers from skipping difficult clues indefinitely while still allowing them to come back to it later.

### Describer Rotation
- Each team has its own describer rotation
- After a team's turn ends, their describer rotates to the next player
- All players on a team will get equal turns describing

## Phase Completion

### Advancing to Next Phase
- A phase ends when **all clues in the pool have been guessed correctly**
- The game automatically advances to the next phase
- Clues reset for the new phase (all clues available again)

### Phase Transition
When a phase completes:
1. **Announcement banner** shows "Phase X Complete!"
2. **Leaderboard** displays current scores
3. **Next phase rules** are clearly displayed
4. **Continue playing** - teams keep their accumulated scores

## Game End

### Completion
- Game ends after **Phase 3** is complete (all clues guessed in charades)
- **Final scores** are tallied across all three phases
- **Winning team** is the team with the highest total score

### Rounds (Optional)
- Can configure multiple rounds (each round includes all 3 phases)
- Default: 3 rounds
- Teams continue rotating describers each turn

## Strategy Tips

### For Describers
1. **Phase 1:** Be detailed and memorable - teammates will need this in later phases
2. **Phase 2:** Think of the most distinctive single word
3. **Phase 3:** Use memorable gestures that teammates can recall

### For Guessers
1. **Remember clues** from earlier phases
2. **Pay attention** during other teams' turns (you'll see the same clues later)
3. **Think back** to Phase 1 descriptions when stuck in Phase 2 or 3

### For Teams
1. **Inside jokes** often develop around recurring clues
2. **Creative descriptions** in Phase 1 help immensely in Phase 3
3. **Stay engaged** even during other teams' turns

## Game Settings (Configurable)

- **Turn Duration:** 15-120 seconds (default: 45s)
- **Total Rounds:** 1-10 rounds (default: 3)
- **Skips per Turn:** 0-5 skips (default: 1)
- **Clues per Player:** 3-10 clues (default: 6)

## Technical Notes

### Optimistic Updates
The game uses word preloading for instant feedback:
- When you click "Correct", the next clue appears immediately (0ms delay)
- Scoring happens in the background
- This creates smooth gameplay even on slow connections

### Mobile Support
- Fully responsive design
- Optimized for phone screens
- Large touch targets for easy gameplay

## Quick Reference

| Phase | Describer Can | Describer Cannot |
|-------|--------------|------------------|
| 1: Describe | Use unlimited words | Say any part of the name |
| 2: One Word | Say exactly ONE word | Use multiple words or gestures |
| 3: Charades | Use gestures and movement | Make any sounds or speak |

---

**Have fun and enjoy The Hat Game!** 🎩🎉

