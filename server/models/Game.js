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
      default: 30
    },
    totalRounds: {
      type: Number,
      default: 3
    },
    skipsPerTurn: {
      type: Number,
      default: 1
    },
    penaltyForExtraSkip: {
      type: Number,
      default: 1
    }
  },
  currentPhase: {
    type: String,
    enum: ['ready', 'guessing', 'finished'],
    default: 'ready'
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
  currentTurn: {
    category: String,
    word: String,
    wordQueue: [String],  // Preloaded words for optimistic client updates
    queueIndex: {         // Current position in word queue
      type: Number,
      default: 0
    },
    startTime: Date,
    timeLeft: Number,
    turnWords: [{
      word: String,
      status: {
        type: String,
        enum: ['correct', 'skipped']
      },
      timestamp: Date
    }],
    skipsRemaining: Number,
    turnScore: Number,
    describerPlayerId: String,
    describerPlayerName: String
  },
  wordsByCategoryForGame: {
    type: Object,
    default: {}
  },
  lastCompletedTurn: {
    category: String,
    teamIndex: Number,
    teamName: String,
    describerPlayerId: String,
    describerPlayerName: String,
    score: Number,
    turnWords: [{
      word: String,
      status: {
        type: String,
        enum: ['correct', 'skipped']
      },
      timestamp: Date
    }]
  }
});

// Create indexes for better performance
gameSchema.index({ id: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Game', gameSchema);
