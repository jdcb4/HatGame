const mongoose = require('mongoose');

// Game schema for MongoDB
const gameSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 6).toUpperCase()
  },
  status: {
    type: String,
    enum: ['lobby', 'in-progress', 'finished'],
    default: 'lobby'
  },
  hostId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  teams: [{
    name: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    players: {
      type: Object,
      default: {}
    }
  }],
  gameSettings: {
    turnDuration: {
      type: Number,
      default: 45
    },
    totalRounds: {
      type: Number,
      default: 3
    },
    skipsPerTurn: {
      type: Number,
      default: 1
    },
    cluesPerPlayer: {
      type: Number,
      default: 6
    }
  },
  currentPhase: {
    type: String,
    enum: ['ready', 'guessing', 'finished'],
    default: 'ready'
  },
  currentGamePhase: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  currentRound: {
    type: Number,
    default: 1
  },
  currentTeamIndex: {
    type: Number,
    default: 0
  },
  currentDescriberIndex: {
    type: Map,
    of: Number,
    default: {}
  },
  cluePool: [{
    clue: String,
    submittedBy: String,
    submittedByName: String
  }],
  usedCluesInPhase: [{
    type: Number  // Store indices of clue pool items, not strings (handles duplicates)
  }],
  clueSubmissions: {
    type: Object,
    default: {}
  },
  currentTurn: {
    clue: String,
    clueQueue: [String],  // Preloaded clues for optimistic client updates
    clueQueueIndices: [Number],  // Pool indices corresponding to clueQueue items
    queueIndex: {         // Current position in clue queue
      type: Number,
      default: 0
    },
    startTime: Date,
    timeLeft: Number,
    turnClues: [{
      clue: String,
      status: {
        type: String,
        enum: ['correct', 'skipped']
      },
      timestamp: Date,
      poolIndex: Number  // Track which pool item this was (for phase completion)
    }],
    skipsRemaining: Number,
    skippedClueThisTurn: String,  // Track the one skipped clue that must be answered
    turnScore: Number,
    describerPlayerId: String,
    describerPlayerName: String
  },
  lastCompletedTurn: {
    teamIndex: Number,
    teamName: String,
    describerPlayerId: String,
    describerPlayerName: String,
    score: Number,
    turnClues: [{
      clue: String,
      status: {
        type: String,
        enum: ['correct', 'skipped']
      },
      timestamp: Date,
      poolIndex: Number  // Track which pool item this was
    }],
    phaseCompleted: Boolean,    // True if this turn completed a phase
    completedPhase: Number       // Which phase was completed (1, 2, or 3)
  }
});

// Create indexes for better performance
gameSchema.index({ id: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Game', gameSchema);
