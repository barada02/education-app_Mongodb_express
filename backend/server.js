/**
 * Education App - Express.js Backend Server
 * Handles MongoDB CRUD operations and integrates with Gemini API
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ===========================
// MIDDLEWARE SETUP
// ===========================

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
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

// Content Schema
const contentSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  concept: { type: String, required: true },
  examples: [{ type: String }],
  questions: [{
    question: { type: String, required: true },
    options: [{
      option: { type: String, required: true },
      is_correct: { type: Boolean, required: true }
    }],
    explanation: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Content = mongoose.model('Content', contentSchema);

// User Progress Schema (for future use)
const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  score: { type: Number, min: 0, max: 100 },
  answeredQuestions: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  completedAt: { type: Date, default: Date.now }
});

const Progress = mongoose.model('Progress', progressSchema);

// ===========================
// ROUTES
// ===========================

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Education App Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      content: '/api/content',
      generate: '/api/generate',
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

    // Save to MongoDB
    const newContent = new Content({
      topic: generatedContent.topic,
      difficulty: generatedContent.difficulty,
      concept: generatedContent.content.concept,
      examples: generatedContent.content.examples,
      questions: generatedContent.content.questions
    });

    await newContent.save();

    res.status(201).json({
      success: true,
      data: newContent,
      message: 'Content generated and saved successfully'
    });

  } catch (error) {
    console.error('Generate content error:', error.message);
    
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
// PROGRESS ROUTES (Future)
// ===========================

// Save user progress
app.post('/api/progress', async (req, res) => {
  try {
    const progress = new Progress(req.body);
    await progress.save();
    
    res.status(201).json({
      success: true,
      data: progress,
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
      console.log('  GET  /api/health          - Health check');
      console.log('  GET  /api/content         - Get all content');
      console.log('  GET  /api/content/:id     - Get content by ID');
      console.log('  POST /api/generate        - Generate new content');
      console.log('  PUT  /api/content/:id     - Update content');
      console.log('  DELETE /api/content/:id   - Delete content');
      console.log('\n💡 Ready to handle educational content! 🎓');
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
