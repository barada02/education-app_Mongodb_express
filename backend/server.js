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
    
    // Build filter
    const filter = {};
    if (topic) filter.topic = { $regex: topic, $options: 'i' };
    if (difficulty) filter.difficulty = difficulty;

    // Pagination
    const skip = (page - 1) * limit;
    
    const content = await Content.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Content.countDocuments(filter);
    
    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    const content = await Content.findById(req.params.id);
    
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
app.post('/api/generate', async (req, res) => {
  try {
    const { topic, difficulty = 'beginner' } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    // Check if content already exists
    const existingContent = await Content.findOne({ 
      topic: { $regex: new RegExp(`^${topic}$`, 'i') }, 
      difficulty 
    });

    if (existingContent) {
      return res.json({
        success: true,
        data: existingContent,
        message: 'Content already exists in database'
      });
    }

    // Generate new content using Gemini API
    const geminiResponse = await axios.post(
      `${process.env.GEMINI_API_URL || 'http://localhost:8000'}/generate-content`,
      { topic, difficulty },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 seconds timeout
      }
    );

    const generatedContent = geminiResponse.data;
    
    console.log('📥 Gemini API Response:', JSON.stringify(generatedContent, null, 2));

    // Determine category based on topic keywords
    const topicLower = topic.toLowerCase();
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
    const newContent = new Content({
      topic: generatedContent.topic,
      difficulty: generatedContent.difficulty,
      category: category,
      concept: generatedContent.content.concept,
      examples: generatedContent.content.examples,
      questions: generatedContent.content.questions
    });

    await newContent.save();
    
    console.log('✅ Content saved to database:', newContent._id);

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
app.put('/api/content/:id', async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content,
      message: 'Content updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete content
app.delete('/api/content/:id', async (req, res) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

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
// ENHANCED PROGRESS ROUTES
// ===========================

// Save user progress (enhanced)
app.post('/api/progress', async (req, res) => {
  try {
    const { userId, contentId, score, answers, timeSpent } = req.body;

    // Find or create user progress
    let userProgress = await UserProgress.findOne({ userId, contentId });
    
    if (userProgress) {
      // Update existing progress
      const newAttempt = {
        score,
        answers,
        timeSpent,
        attemptedAt: new Date()
      };
      
      userProgress.attempts.push(newAttempt);
      userProgress.bestScore = Math.max(userProgress.bestScore, score);
      userProgress.lastAttemptAt = new Date();
      
      // Update status based on score
      if (score >= 90) userProgress.status = 'mastered';
      else if (score >= 70) userProgress.status = 'completed';
      else userProgress.status = 'in_progress';
      
    } else {
      // Create new progress
      userProgress = new UserProgress({
        userId,
        contentId,
        bestScore: score,
        attempts: [{
          score,
          answers,
          timeSpent,
          attemptedAt: new Date()
        }],
        status: score >= 90 ? 'mastered' : score >= 70 ? 'completed' : 'in_progress',
        lastAttemptAt: new Date()
      });
    }

    await userProgress.save();
    
    res.status(201).json({
      success: true,
      data: userProgress,
      message: 'Progress saved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
