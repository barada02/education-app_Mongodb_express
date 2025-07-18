/**
 * Education App - Express.js Backend Server
 * Handles MongoDB CRUD operations, user authentication, and integrates with Gemini API
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const axios = require('axios');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const { requireAuth } = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ===========================
// MIDDLEWARE SETUP
// ===========================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// Rate limiting (more lenient in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 in production, 1000 in development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV !== 'production';
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// ===========================
// DATABASE CONNECTION
// ===========================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Please check your MongoDB URI and credentials in the .env file');
    process.exit(1);
  }
};

// ===========================
// MODELS
// ===========================

// Import enhanced models
const {
  User,
  Content,
  UserProgress,
  UserStatistics,
  Achievement,
  UserAchievement,
  LearningSession
} = require('./models');

// ===========================
// ROUTES
// ===========================

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Education App Backend API',
    status: 'running',
    version: '2.0.0',
    features: [
      'Educational Content Generation',
      'User Authentication & Management',
      'Progress Tracking & Analytics',
      'Achievement System',
      'Dashboard & Statistics',
      'Learning Streaks'
    ],
    endpoints: {
      content: '/api/content',
      generate: '/api/generate',
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      health: '/api/health'
    }
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Gemini API (FastAPI) connection
    let geminiStatus = 'disconnected';
    try {
      const geminiResponse = await axios.get(`${process.env.GEMINI_API_URL || 'http://localhost:8000'}/health`);
      geminiStatus = geminiResponse.data.status === 'healthy' ? 'connected' : 'error';
    } catch (error) {
      geminiStatus = 'disconnected';
    }

    res.json({
      status: 'healthy',
      database: dbStatus,
      gemini_api: geminiStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ===========================
// CONTENT ROUTES
// ===========================

// Get all content
app.get('/api/content', async (req, res) => {
  try {
    const { topic, difficulty, page = 1, limit = 10 } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive integer'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }
    
    // Build filter
    const filter = { isPublished: true }; // Only show published content
    if (topic && typeof topic === 'string') {
      filter.topic = { $regex: topic.trim(), $options: 'i' };
    }
    if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      filter.difficulty = difficulty;
    }

    // Pagination
    const skip = (pageNum - 1) * limitNum;
    
    const content = await Content.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v'); // Exclude version field
    
    const total = await Content.countDocuments(filter);
    
    res.json({
      success: true,
      data: content,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get content by ID
app.get('/api/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content ID format'
      });
    }

    const content = await Content.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate and save new content
app.post('/api/generate', requireAuth, async (req, res) => {
  try {
    const { topic, difficulty = 'beginner' } = req.body;

    console.log(`🔍 Content generation request from user: ${req.session.userId}`);
    console.log(`📋 Session details:`, {
      userId: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      sessionId: req.sessionID
    });

    // Input validation
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required and must be a non-empty string'
      });
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be one of: beginner, intermediate, advanced'
      });
    }

    // Sanitize topic input
    const sanitizedTopic = topic.trim().substring(0, 200); // Limit length

    // Check if content already exists for this user
    const userId = req.session.userId;
    const existingContent = await Content.findOne({ 
      topic: { $regex: new RegExp(`^${sanitizedTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, 
      difficulty,
      createdByUser: userId // Only check user's own content
    });

    if (existingContent) {
      console.log(`📝 Existing content found for user ${userId}: ${existingContent._id}`);
      return res.json({
        success: true,
        data: existingContent,
        message: 'Content already exists in your library'
      });
    }

    // Generate new content using Gemini API
    const geminiResponse = await axios.post(
      `${process.env.GEMINI_API_URL || 'http://localhost:8000'}/generate-content`,
      { topic: sanitizedTopic, difficulty },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 seconds timeout
      }
    );

    const generatedContent = geminiResponse.data;
    
    console.log('📥 Gemini API Response:', JSON.stringify(generatedContent, null, 2));

    // Determine category based on topic keywords
    const topicLower = sanitizedTopic.toLowerCase();
    let category = 'other'; // default category
    
    if (topicLower.includes('math') || topicLower.includes('algebra') || topicLower.includes('geometry') || 
        topicLower.includes('calculus') || topicLower.includes('statistics') || topicLower.includes('number')) {
      category = 'mathematics';
    } else if (topicLower.includes('science') || topicLower.includes('physics') || topicLower.includes('chemistry') || 
               topicLower.includes('biology') || topicLower.includes('atom') || topicLower.includes('molecule') ||
               topicLower.includes('spectrum') || topicLower.includes('color') || topicLower.includes('light')) {
      category = 'science';
    } else if (topicLower.includes('history') || topicLower.includes('war') || topicLower.includes('ancient') || 
               topicLower.includes('medieval') || topicLower.includes('civilization')) {
      category = 'history';
    } else if (topicLower.includes('language') || topicLower.includes('grammar') || topicLower.includes('literature') || 
               topicLower.includes('writing') || topicLower.includes('reading')) {
      category = 'language';
    } else if (topicLower.includes('computer') || topicLower.includes('programming') || topicLower.includes('technology') || 
               topicLower.includes('software') || topicLower.includes('algorithm')) {
      category = 'technology';
    } else if (topicLower.includes('art') || topicLower.includes('music') || topicLower.includes('painting') || 
               topicLower.includes('drawing') || topicLower.includes('sculpture')) {
      category = 'arts';
    }

    // Save to MongoDB
    console.log(`👤 Creating content for user: ${userId}`);
    
    const newContent = new Content({
      topic: generatedContent.topic,
      difficulty: generatedContent.difficulty,
      category: category,
      concept: generatedContent.content.concept,
      examples: generatedContent.content.examples,
      questions: generatedContent.content.questions,
      createdBy: 'user', // Mark as user-generated content
      createdByUser: userId // Reference to the user who generated it
    });

    await newContent.save();
    
    console.log(`✅ Content saved to database: ${newContent._id} for user: ${userId}`);
    console.log(`🔗 CreatedByUser field: ${newContent.createdByUser}`);

    res.status(201).json({
      success: true,
      data: newContent,
      message: 'Content generated and saved successfully'
    });

  } catch (error) {
    console.error('Generate content error:', error.message);
    console.error('Full error:', error);
    
    // More specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error: ' + error.message,
        details: error.errors
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Gemini API service unavailable'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update content
app.put('/api/content/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content ID format'
      });
    }

    // Find content and check ownership
    const existingContent = await Content.findById(id);
    if (!existingContent) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Check if user owns this content or is admin
    if (existingContent.createdByUser?.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own content'
      });
    }

    const content = await Content.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: content,
      message: 'Content updated successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error: ' + error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete content
app.delete('/api/content/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content ID format'
      });
    }

    // Find content and check ownership
    const existingContent = await Content.findById(id);
    if (!existingContent) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Check if user owns this content or is admin
    if (existingContent.createdByUser?.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own content'
      });
    }

    await Content.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// ROUTE MOUNTING
// ===========================

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// ===========================
// SESSION CHECK ENDPOINT
// ===========================

// Check current session status
app.get('/api/session', (req, res) => {
  console.log('🔍 Session check:', {
    sessionExists: !!req.session,
    userId: req.session?.userId,
    username: req.session?.username,
    sessionId: req.sessionID
  });
  
  res.json({
    success: true,
    authenticated: !!(req.session && req.session.userId),
    user: req.session?.userId ? {
      id: req.session.userId,
      username: req.session.username,
      email: req.session.email
    } : null
  });
});

// ===========================
// ENHANCED PROGRESS ROUTES
// ===========================

// Save user progress (enhanced)
app.post('/api/progress', requireAuth, async (req, res) => {
  try {
    const { contentId, score, answers, timeSpent, completedAt } = req.body;
    const userId = req.session.userId; // Get userId from session

    console.log(`📊 Saving progress for user ${userId} on content ${contentId}`);
    console.log(`📝 Received data:`, { score, answers, timeSpent });

    // Validate required fields
    if (!contentId || typeof score !== 'number' || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, score, and answers are required'
      });
    }

    // Get content to validate answers
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const totalQuestions = content.questions.length;
    let correctAnswers = 0;

    // Transform frontend answers format to backend format
    const formattedAnswers = answers.map((selectedOption, questionIndex) => {
      const question = content.questions[questionIndex];
      const isCorrect = question && question.options[selectedOption]?.is_correct === true;
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex,
        selectedOption: selectedOption || 0,
        isCorrect,
        timeSpent: Math.floor((timeSpent || 0) / totalQuestions) // Distribute time evenly
      };
    });

    // Find or create user progress
    let userProgress = await UserProgress.findOne({ userId, contentId });
    
    if (userProgress) {
      // Update existing progress
      const attemptNumber = userProgress.attempts.length + 1;
      const newAttempt = {
        attemptNumber,
        startedAt: new Date(Date.now() - (timeSpent * 1000)), // Estimate start time
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        score,
        correctAnswers,
        totalQuestions,
        timeSpent: timeSpent || 0,
        answers: formattedAnswers
      };
      
      userProgress.attempts.push(newAttempt);
      userProgress.bestScore = Math.max(userProgress.bestScore, score);
      userProgress.totalAttempts = userProgress.attempts.length;
      userProgress.averageScore = Math.round(
        userProgress.attempts.reduce((sum, attempt) => sum + attempt.score, 0) / userProgress.attempts.length
      );
      userProgress.lastAttemptAt = new Date();
      
      // Update status based on score
      if (score >= 90) userProgress.status = 'mastered';
      else if (score >= 70) userProgress.status = 'completed';
      else userProgress.status = 'in_progress';
      
      // Set mastered date if achieved
      if (score >= 90 && !userProgress.masteredAt) {
        userProgress.masteredAt = new Date();
      }
      
    } else {
      // Create new progress
      userProgress = new UserProgress({
        userId,
        contentId,
        status: score >= 90 ? 'mastered' : score >= 70 ? 'completed' : 'in_progress',
        attempts: [{
          attemptNumber: 1,
          startedAt: new Date(Date.now() - (timeSpent * 1000)),
          completedAt: completedAt ? new Date(completedAt) : new Date(),
          score,
          correctAnswers,
          totalQuestions,
          timeSpent: timeSpent || 0,
          answers: formattedAnswers
        }],
        bestScore: score,
        totalAttempts: 1,
        averageScore: score,
        firstAttemptAt: new Date(),
        lastAttemptAt: new Date(),
        masteredAt: score >= 90 ? new Date() : undefined
      });
    }

    await userProgress.save();
    
    // Update user statistics
    await updateUserStatistics(userId, score, timeSpent, contentId);
    
    console.log(`✅ Progress saved for user ${userId}: ${score}% on content ${contentId}`);
    
    res.status(201).json({
      success: true,
      data: userProgress,
      message: 'Progress saved successfully'
    });
  } catch (error) {
    console.error('❌ Progress save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to update user statistics
async function updateUserStatistics(userId, score, timeSpent, contentId) {
  try {
    console.log(`📊 Updating statistics for user ${userId}`);
    
    // Find or create user statistics
    let userStats = await UserStatistics.findOne({ userId });
    
    if (!userStats) {
      console.log(`📊 Creating new statistics record for user ${userId}`);
      userStats = new UserStatistics({
        userId,
        overall: {
          totalQuizzesTaken: 0,
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          overallAccuracy: 0,
          totalTimeSpent: 0,
          averageSessionTime: 0,
          topicsExplored: 0,
          currentLevel: 1,
          totalXP: 0
        },
        streaks: {
          current: { count: 0, startDate: new Date() },
          longest: { count: 0, startDate: new Date(), endDate: new Date() }
        },
        categories: []
      });
    }

    // Get content to calculate questions answered
    const content = await Content.findById(contentId);
    const questionsAnswered = content ? content.questions.length : 0;
    const correctAnswers = Math.round((score / 100) * questionsAnswered);

    // Update overall statistics
    userStats.overall.totalQuizzesTaken += 1;
    userStats.overall.totalQuestionsAnswered += questionsAnswered;
    userStats.overall.totalCorrectAnswers += correctAnswers;
    userStats.overall.totalTimeSpent += timeSpent || 0;
    
    // Calculate overall accuracy
    if (userStats.overall.totalQuestionsAnswered > 0) {
      userStats.overall.overallAccuracy = Math.round(
        (userStats.overall.totalCorrectAnswers / userStats.overall.totalQuestionsAnswered) * 100
      );
    }
    
    // Calculate average session time
    if (userStats.overall.totalQuizzesTaken > 0) {
      userStats.overall.averageSessionTime = Math.round(
        userStats.overall.totalTimeSpent / userStats.overall.totalQuizzesTaken
      );
    }
    
    // Update XP based on score (1 XP per percentage point)
    const xpGained = Math.round(score);
    userStats.overall.totalXP += xpGained;
    
    // Update level based on XP (100 XP per level)
    userStats.overall.currentLevel = Math.floor(userStats.overall.totalXP / 100) + 1;
    
    // Update streak (assuming daily activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    const lastActivity = userStats.streaks.current.lastActivityDate;
    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, update last activity
        userStats.streaks.current.lastActivityDate = new Date();
      } else if (daysDiff === 1) {
        // Next day, continue streak
        userStats.streaks.current.count += 1;
        userStats.streaks.current.lastActivityDate = new Date();
      } else {
        // Streak broken, start new streak
        userStats.streaks.current.count = 1;
        userStats.streaks.current.startDate = new Date();
        userStats.streaks.current.lastActivityDate = new Date();
      }
    } else {
      // First activity
      userStats.streaks.current.count = 1;
      userStats.streaks.current.startDate = new Date();
      userStats.streaks.current.lastActivityDate = new Date();
    }
    
    // Update longest streak
    if (userStats.streaks.current.count > userStats.streaks.longest.count) {
      userStats.streaks.longest.count = userStats.streaks.current.count;
      userStats.streaks.longest.startDate = userStats.streaks.current.startDate;
      userStats.streaks.longest.endDate = new Date();
    }
    
    await userStats.save();
    console.log(`✅ User statistics updated for user ${userId}`);
    
  } catch (error) {
    console.error('❌ Error updating user statistics:', error);
    // Don't throw error to prevent progress saving from failing
  }
}

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ===========================
// SERVER STARTUP
// ===========================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Education App Backend Server Started');
      console.log('=' * 40);
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app'}`);
      console.log(`🤖 Gemini API: ${process.env.GEMINI_API_URL || 'http://localhost:8000'}`);
      console.log('\n📋 Available endpoints:');
      console.log('  GET  /api/health                    - Health check');
      console.log('  GET  /api/content                   - Get all content');
      console.log('  GET  /api/content/:id               - Get content by ID');
      console.log('  POST /api/generate                  - Generate new content');
      console.log('  PUT  /api/content/:id               - Update content');
      console.log('  DELETE /api/content/:id             - Delete content');
      console.log('  POST /api/progress                  - Save user progress');
      console.log('\n🔐 Authentication endpoints:');
      console.log('  POST /api/auth/register             - User registration');
      console.log('  POST /api/auth/login                - User login');
      console.log('  POST /api/auth/logout               - User logout');
      console.log('  GET  /api/auth/profile              - Get user profile');
      console.log('  PUT  /api/auth/profile              - Update user profile');
      console.log('  PUT  /api/auth/change-password      - Change password');
      console.log('\n📊 Dashboard endpoints:');
      console.log('  GET  /api/dashboard/overview        - Dashboard overview');
      console.log('  GET  /api/dashboard/stats           - Detailed statistics');
      console.log('  GET  /api/dashboard/achievements    - User achievements');
      console.log('  GET  /api/dashboard/progress        - Progress tracking');
      console.log('  GET  /api/dashboard/streaks         - Learning streaks');
      console.log('  GET  /api/dashboard/leaderboard     - Leaderboard');
      console.log('\n💡 Ready to handle educational content with user management! 🎓');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Start the server
startServer();
