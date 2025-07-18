/**
 * Enhanced MongoDB Models for Educational Application
 * Phase 1: Data Models Implementation
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ===========================
// USER MODEL
// ===========================
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    dateOfBirth: {
      type: Date
    },
    grade: {
      type: String,
      enum: ['elementary', 'middle', 'high', 'college', 'adult', 'other']
    },
    interests: [{
      type: String,
      trim: true
    }]
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    }
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'profile.grade': 1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// ===========================
// ENHANCED CONTENT MODEL
// ===========================
const contentSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
    maxlength: [200, 'Topic cannot exceed 200 characters']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['science', 'mathematics', 'history', 'language', 'technology', 'arts', 'other'],
    trim: true
  },
  concept: {
    type: String,
    required: [true, 'Concept is required'],
    trim: true
  },
  examples: [{
    type: String,
    trim: true
  }],
  questions: [{
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      option: {
        type: String,
        required: true,
        trim: true
      },
      is_correct: {
        type: Boolean,
        required: true
      }
    }],
    explanation: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    tags: [{
      type: String,
      trim: true
    }]
  }],
  metadata: {
    estimatedTime: {
      type: Number,
      default: 10,
      min: [1, 'Estimated time must be at least 1 minute']
    },
    learningObjectives: [{
      type: String,
      trim: true
    }],
    prerequisites: [{
      type: String,
      trim: true
    }]
  },
  createdBy: {
    type: String,
    default: 'ai',
    enum: ['ai', 'admin', 'user']
  },
  // User who generated this content (when createdBy is 'user')
  createdByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for AI/admin generated content
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  stats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
contentSchema.index({ category: 1, difficulty: 1 });
contentSchema.index({ topic: 'text', concept: 'text' });
contentSchema.index({ isPublished: 1, createdAt: -1 });

// ===========================
// USER PROGRESS MODEL
// ===========================
const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'mastered'],
    default: 'not_started'
  },
  attempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    answers: [{
      questionIndex: {
        type: Number,
        required: true
      },
      selectedOption: {
        type: Number,
        required: true
      },
      isCorrect: {
        type: Boolean,
        required: true
      },
      timeSpent: {
        type: Number,
        default: 0
      }
    }]
  }],
  bestScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  firstAttemptAt: Date,
  lastAttemptAt: Date,
  masteredAt: Date
}, {
  timestamps: true
});

// Compound index for efficient queries
userProgressSchema.index({ userId: 1, contentId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, status: 1 });
userProgressSchema.index({ userId: 1, lastAttemptAt: -1 });

// Virtual for completion percentage
userProgressSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'mastered') return 100;
  if (this.status === 'completed') return 80;
  if (this.status === 'in_progress') return 50;
  return 0;
});

// ===========================
// USER STATISTICS MODEL
// ===========================
const userStatisticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  overall: {
    totalQuizzesTaken: {
      type: Number,
      default: 0
    },
    totalQuestionsAnswered: {
      type: Number,
      default: 0
    },
    totalCorrectAnswers: {
      type: Number,
      default: 0
    },
    overallAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalTimeSpent: {
      type: Number,
      default: 0
    },
    averageSessionTime: {
      type: Number,
      default: 0
    },
    topicsExplored: {
      type: Number,
      default: 0
    },
    currentLevel: {
      type: Number,
      default: 1,
      min: 1
    },
    totalXP: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  streaks: {
    current: {
      count: {
        type: Number,
        default: 0,
        min: 0
      },
      startDate: Date,
      lastActivityDate: Date
    },
    longest: {
      count: {
        type: Number,
        default: 0,
        min: 0
      },
      startDate: Date,
      endDate: Date
    }
  },
  weekly: {
    weekStarting: Date,
    quizzesTaken: {
      type: Number,
      default: 0
    },
    questionsAnswered: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    xpEarned: {
      type: Number,
      default: 0
    }
  },
  monthly: {
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    year: Number,
    quizzesTaken: {
      type: Number,
      default: 0
    },
    questionsAnswered: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    xpEarned: {
      type: Number,
      default: 0
    }
  },
  categories: [{
    name: {
      type: String,
      required: true
    },
    quizzesTaken: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    }
  }]
}, {
  timestamps: true
});

// Index for performance
userStatisticsSchema.index({ userId: 1 });

// ===========================
// ACHIEVEMENT MODEL
// ===========================
const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Achievement name is required'],
    trim: true,
    maxlength: [100, 'Achievement name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    trim: true,
    maxlength: [500, 'Achievement description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['streak', 'score', 'topic', 'time', 'special', 'milestone']
  },
  type: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    required: true
  },
  condition: {
    type: {
      type: String,
      required: true,
      enum: [
        'streak_days', 'total_quizzes', 'accuracy_percentage', 
        'time_spent_hours', 'perfect_scores', 'topics_completed',
        'consecutive_correct', 'week_activity', 'month_activity'
      ]
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    operator: {
      type: String,
      enum: ['>=', '<=', '=='],
      default: '>='
    }
  },
  xpReward: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for performance
achievementSchema.index({ category: 1, type: 1 });
achievementSchema.index({ isActive: 1 });

// ===========================
// USER ACHIEVEMENT MODEL
// ===========================
const userAchievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isNotified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, unlockedAt: -1 });

// ===========================
// LEARNING SESSION MODEL
// ===========================
const learningSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: Date,
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  activitiesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  quizzesCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  xpEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  device: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for performance
learningSessionSchema.index({ userId: 1, startTime: -1 });
learningSessionSchema.index({ userId: 1, endTime: -1 });

// Export all models
module.exports = {
  User: mongoose.model('User', userSchema),
  Content: mongoose.model('Content', contentSchema),
  UserProgress: mongoose.model('UserProgress', userProgressSchema),
  UserStatistics: mongoose.model('UserStatistics', userStatisticsSchema),
  Achievement: mongoose.model('Achievement', achievementSchema),
  UserAchievement: mongoose.model('UserAchievement', userAchievementSchema),
  LearningSession: mongoose.model('LearningSession', learningSessionSchema)
};
