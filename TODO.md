# The Hat Game - TODO List
**Last Updated:** October 26, 2025

## 🎯 Active Development Tasks

### High Priority
- [ ] **Skip Logic Refinement**: Work on skip logic improvements (expected to be complex)
- [ ] **Railway Deployment**: Get Railway deployment configured and working

### Medium Priority
- [ ] **Premade Clues Dataset**: Add dataset of premade clues users can load instead of making their own (user has list ready)
- [ ] **Remove Round Counter**: Remove "Round x of y" text from the UI
- [ ] **Remove Total Rounds from Settings**: Remove Total Rounds from Game Settings UI in lobby
- [ ] **Audit Total Rounds Usage**: Check if Total Rounds needs to be removed or modified elsewhere in the codebase

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

### Transformation to The Hat Game (October 26, 2025)
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

