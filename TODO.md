# The Hat Game - TODO List
**Last Updated:** October 26, 2025 (Evening Session)

## 🎯 Active Development Tasks

### High Priority
- [ ] **Skip Logic Refinement**: Work on skip logic improvements (expected to be complex)

### Medium Priority
- [ ] **Shuffle Behavior Analysis**: Understand current shuffle behavior, possibly shuffle remaining clues between player turns and shuffle between each phase
- [ ] **Game Over Clue Summary**: Show all the clues at the end of the game with count of how many instances of each clue there were
- [ ] **Rules/About Page**: Add a dedicated page explaining the game rules and how to play

### Low Priority / Nice-to-Have
*Optional improvements and feature ideas*

---

## 📝 Ideas for Future Features

### Gameplay Enhancements
- **Rematch Improvements**: Carry forward team compositions but reset scores
- **Mobile UX Polish**: Test and optimize for various mobile devices
- **Skip Return Visual**: Better indication when skipped clue comes back
- **Phase Transition Animation**: Smoother visual transition between phases
- **Sound Effects**: Optional sound for correct/skip/phase complete

### UI/UX Improvements
- **Settings Panel**: Let host adjust settings (turn duration, clues per player, etc.) in lobby
- **Player Avatars**: Simple color-coded avatars or emoji
- **Dark Mode**: Toggle for dark color scheme
- **Accessibility**: Better keyboard navigation, screen reader support

### Technical Improvements
- **Performance**: Profile and optimize React re-renders
- **Error Recovery**: Better handling of disconnections during gameplay
- **Analytics**: Track game statistics (average clues per turn, phase completion times)
- **Testing**: Add automated tests for critical game logic

---

## ✅ Recently Completed

### Evening Session (October 26, 2025)
- ✅ **Railway Deployment**: Confirmed working deployment on Railway
- ✅ **Premade Clues Feature**: Added 910-name dataset with "Get some suggestions" button
- ✅ **Total Rounds Removal**: Removed totalRounds setting and UI references (game now phase-based)
- ✅ **Hide Play Again Button**: Temporarily hidden for future redesign
- ✅ **Vercel Cleanup**: Removed all Vercel files and references (Railway-only now)
- ✅ **Documentation Updates**: Updated deployment guides and project docs

### Initial Transformation (October 26, 2025)
- ✅ Renamed project from Word Guesser/BackEndTicky to The Hat Game
- ✅ Transformed game model from word-category system to clue submission
- ✅ Implemented three-phase gameplay (Describe, One Word, Charades)
- ✅ Added player clue submission in lobby
- ✅ Implemented skip-with-return logic (must answer skipped clue)
- ✅ Added phase transition detection and auto-advancement
- ✅ Fixed duplicate clue handling (pool index tracking)
- ✅ Fixed clue loading issue (Mongoose subdocument spreading)
- ✅ Implemented auto-end turn when phase completes
- ✅ Updated all UI to show phase information
- ✅ Removed hint system (not in Hat Game rules)
- ✅ Removed word/category system
- ✅ Updated all documentation and README
- ✅ Cleaned up obsolete files

---

## 🔍 Known Issues

*Track bugs and issues here as they're discovered*

---

## 📋 Notes for Developers

### When Adding Features
1. Update this TODO.md with your task
2. Follow conventions in `.cursorrules` and `CONVENTIONS.md`
3. Test on mobile viewport (primary use case)
4. Update ARCHITECTURE.md if adding new patterns
5. Use emoji logging (✅, ❌, 📨, etc.) for consistency

### Testing Checklist
- [ ] Test with 2 teams
- [ ] Test with 3+ teams
- [ ] Test all three phases
- [ ] Test skip-with-return logic
- [ ] Test phase transitions
- [ ] Test on mobile viewport
- [ ] Test with network throttling

---

**Maintained by:** @jdcb4  
**Project:** The Hat Game  
**GitHub:** github.com/jdcb4/HatGame

