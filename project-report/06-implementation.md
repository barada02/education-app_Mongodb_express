# Implementation

## Overview

This section provides a comprehensive analysis of the implementation of WiseBuddy, covering the technical development process, code implementation strategies, integration details, and the challenges overcome during the development phase. The implementation follows the architectural design outlined in the previous section and demonstrates practical application of modern web development technologies integrated with artificial intelligence capabilities.

## 1. Development Environment Setup

### 1.1 Project Structure Implementation

The WiseBuddy project is organized into a modular structure that separates concerns and enables independent development and deployment of different components:

```
education-app/
├── backend/                    # Express.js main application
│   ├── package.json           # Node.js dependencies and scripts
│   ├── server.js              # Main server application file
│   ├── models/                # MongoDB schema definitions
│   │   └── index.js           # Centralized model exports
│   ├── routes/                # API endpoint definitions
│   │   ├── auth.js            # Authentication routes
│   │   └── dashboard.js       # Dashboard and analytics routes
│   ├── middleware/            # Custom middleware functions
│   │   └── auth.js            # Authentication middleware
│   └── test-*.js              # Testing and validation scripts
├── frontend/                  # Client-side application
│   ├── index.html             # Landing page
│   ├── app.html               # Main application interface
│   ├── dashboard.html         # User dashboard
│   ├── *.js                   # JavaScript functionality modules
│   ├── *.css                  # Styling and responsive design
│   └── package.json           # Frontend dependencies
├── gemini-api/                # AI microservice
│   ├── main.py                # FastAPI application entry point
│   ├── gemini.py              # Google Gemini AI integration
│   ├── requirements.txt       # Python dependencies
│   └── gem/                   # Python virtual environment
└── project-report/            # Comprehensive documentation
```

### 1.2 Technology Stack Implementation

**Backend Technology Integration**

```javascript
// server.js - Core server implementation
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');

// Application initialization with comprehensive middleware stack
const app = express();

// MongoDB connection with production-ready configuration
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,        // Connection pooling for performance
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0
});

// Session management with secure configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/education-app',
        touchAfter: 24 * 3600  // Lazy session update
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,  // 24 hours
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Security and parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('frontend'));

// CORS configuration for cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});
```

### 1.3 Database Schema Implementation

**MongoDB Model Definitions**

```javascript
// models/index.js - Comprehensive schema definitions
const mongoose = require('mongoose');

// User schema with authentication and profile management
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
        validate: {
            validator: function(v) {
                return /^[a-zA-Z0-9_]+$/.test(v);
            },
            message: 'Username can only contain letters, numbers, and underscores'
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;  // Never return password in JSON
            return ret;
        }
    }
});

// UserProgress schema for detailed learning tracking
const userProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    topic: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    attempts: [{
        attemptNumber: {
            type: Number,
            required: true,
            min: 1
        },
        startedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        completedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
            max: 50
        },
        correctAnswers: {
            type: Number,
            required: true,
            min: 0
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        answers: [{
            questionIndex: {
                type: Number,
                required: true,
                min: 0
            },
            selectedOption: {
                type: Number,
                required: true,
                min: 0,
                max: 3
            },
            isCorrect: {
                type: Boolean,
                required: true
            },
            timeSpent: {
                type: Number,
                default: 0,
                min: 0
            }
        }]
    }]
}, {
    timestamps: true
});

// UserStatistics schema for analytics and reporting
const userStatisticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    totalQuizzes: {
        type: Number,
        default: 0,
        min: 0
    },
    totalQuestionsAnswered: {
        type: Number,
        default: 0,
        min: 0
    },
    correctAnswers: {
        type: Number,
        default: 0,
        min: 0
    },
    averageScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalTimeSpent: {
        type: Number,
        default: 0,
        min: 0
    },
    subjectBreakdown: [{
        subject: {
            type: String,
            required: true
        },
        quizzesCompleted: {
            type: Number,
            default: 0,
            min: 0
        },
        averageScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        timeSpent: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    streakData: {
        currentStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        longestStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Compound indexes for performance optimization
userProgressSchema.index({ userId: 1, subject: 1, topic: 1 });
userProgressSchema.index({ userId: 1, createdAt: -1 });

// Export models for application use
module.exports = {
    User: mongoose.model('User', userSchema),
    UserProgress: mongoose.model('UserProgress', userProgressSchema),
    UserStatistics: mongoose.model('UserStatistics', userStatisticsSchema)
};
```

## 2. Core Functionality Implementation

### 2.1 Authentication System Implementation

**Secure User Authentication with Session Management**

```javascript
// Authentication route implementation with comprehensive security
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Input validation with detailed error handling
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        // Rate limiting check (implement with express-rate-limit in production)
        const rateLimitKey = `login_attempts_${req.ip}`;
        // Implementation would include Redis-based rate limiting
        
        // User lookup with case-insensitive username matching
        const user = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() }
            ]
        });
        
        if (!user) {
            // Generic error message to prevent user enumeration
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Password verification using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            // Log failed attempt for security monitoring
            console.log(`Failed login attempt for user: ${username} from IP: ${req.ip}`);
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login timestamp
        await User.findByIdAndUpdate(user._id, {
            lastLoginAt: new Date()
        });
        
        // Create secure session
        req.session.userId = user._id;
        req.session.username = user.username;
        
        // Regenerate session ID for security
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Session creation failed'
                });
            }
            
            req.session.userId = user._id;
            req.session.username = user.username;
            
            // Return user data (password excluded by schema transform)
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt
                }
            });
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Registration endpoint with comprehensive validation
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // Comprehensive input validation
        const validationErrors = [];
        
        if (!username || username.length < 3) {
            validationErrors.push('Username must be at least 3 characters long');
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            validationErrors.push('Username can only contain letters, numbers, and underscores');
        }
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            validationErrors.push('Please enter a valid email address');
        }
        
        if (!password || password.length < 6) {
            validationErrors.push('Password must be at least 6 characters long');
        }
        
        if (password !== confirmPassword) {
            validationErrors.push('Passwords do not match');
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: validationErrors
            });
        }
        
        // Check for existing users
        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }
        
        // Hash password with bcrypt
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const newUser = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword
        });
        
        await newUser.save();
        
        // Initialize user statistics
        const userStats = new UserStatistics({
            userId: newUser._id
        });
        await userStats.save();
        
        // Create session for new user
        req.session.userId = newUser._id;
        req.session.username = newUser.username;
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                createdAt: newUser.createdAt
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
```

### 2.2 Progress Tracking Implementation

**Comprehensive Learning Analytics and Progress Management**

```javascript
// Progress saving with detailed analytics integration
app.post('/api/progress', async (req, res) => {
    try {
        // Authentication middleware check
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const { subject, topic, answers, score, timeSpent, totalQuestions } = req.body;
        
        // Input validation with detailed error checking
        if (!subject || !topic || !Array.isArray(answers) || typeof score !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data. Required: subject, topic, answers array, and score.'
            });
        }
        
        if (score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                message: 'Score must be between 0 and 100'
            });
        }
        
        const userId = req.session.userId;
        const questionsCount = totalQuestions || answers.length;
        const correctAnswersCount = answers.filter(answer => answer === 1 || answer === true).length;
        
        // Find existing progress document or create new one
        let userProgress = await UserProgress.findOne({
            userId: userId,
            subject: subject,
            topic: topic
        });
        
        if (!userProgress) {
            userProgress = new UserProgress({
                userId: userId,
                subject: subject,
                topic: topic,
                attempts: []
            });
        }
        
        // Calculate attempt number
        const attemptNumber = userProgress.attempts.length + 1;
        
        // Transform simple answers array into detailed answer objects
        const detailedAnswers = answers.map((answer, index) => ({
            questionIndex: index,
            selectedOption: typeof answer === 'number' ? answer : (answer ? 1 : 0),
            isCorrect: answer === 1 || answer === true,
            timeSpent: Math.floor((timeSpent || 0) / answers.length) // Distribute time evenly
        }));
        
        // Create new attempt object
        const newAttempt = {
            attemptNumber: attemptNumber,
            startedAt: new Date(Date.now() - (timeSpent || 0) * 1000),
            completedAt: new Date(),
            totalQuestions: questionsCount,
            correctAnswers: correctAnswersCount,
            score: Math.round(score),
            answers: detailedAnswers
        };
        
        // Add attempt to progress document
        userProgress.attempts.push(newAttempt);
        
        // Save progress with error handling
        const savedProgress = await userProgress.save();
        
        // Update user statistics asynchronously
        updateUserStatistics(userId, {
            subject: subject,
            questionsAnswered: questionsCount,
            correctAnswers: correctAnswersCount,
            score: score,
            timeSpent: timeSpent || 0
        }).catch(error => {
            console.error('Error updating user statistics:', error);
        });
        
        // Log successful progress save for analytics
        console.log(`Progress saved for user ${userId}: ${subject}/${topic} - Score: ${score}%`);
        
        res.json({
            success: true,
            message: 'Progress saved successfully',
            data: {
                progressId: savedProgress._id,
                attemptNumber: attemptNumber,
                score: score,
                correctAnswers: correctAnswersCount,
                totalQuestions: questionsCount
            }
        });
        
    } catch (error) {
        console.error('Error saving progress:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Data validation failed',
                details: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to save progress'
        });
    }
});

// Advanced user statistics update function
async function updateUserStatistics(userId, progressData) {
    try {
        const { subject, questionsAnswered, correctAnswers, score, timeSpent } = progressData;
        
        // Find or create user statistics document
        let userStats = await UserStatistics.findOne({ userId: userId });
        
        if (!userStats) {
            userStats = new UserStatistics({ userId: userId });
        }
        
        // Update overall statistics
        userStats.totalQuizzes += 1;
        userStats.totalQuestionsAnswered += questionsAnswered;
        userStats.correctAnswers += correctAnswers;
        userStats.totalTimeSpent += timeSpent;
        
        // Recalculate average score
        userStats.averageScore = Math.round(
            (userStats.correctAnswers / userStats.totalQuestionsAnswered) * 100
        );
        
        // Update subject-specific breakdown
        let subjectData = userStats.subjectBreakdown.find(s => s.subject === subject);
        
        if (!subjectData) {
            subjectData = {
                subject: subject,
                quizzesCompleted: 0,
                averageScore: 0,
                timeSpent: 0
            };
            userStats.subjectBreakdown.push(subjectData);
        }
        
        subjectData.quizzesCompleted += 1;
        subjectData.timeSpent += timeSpent;
        subjectData.averageScore = Math.round(
            ((subjectData.averageScore * (subjectData.quizzesCompleted - 1)) + score) / 
            subjectData.quizzesCompleted
        );
        
        // Update streak data
        const today = new Date();
        const lastActivity = new Date(userStats.streakData.lastActivity);
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
            // Continue or maintain streak
            if (daysDiff === 1) {
                userStats.streakData.currentStreak += 1;
            }
        } else {
            // Reset streak
            userStats.streakData.currentStreak = 1;
        }
        
        // Update longest streak if current streak is longer
        if (userStats.streakData.currentStreak > userStats.streakData.longestStreak) {
            userStats.streakData.longestStreak = userStats.streakData.currentStreak;
        }
        
        userStats.streakData.lastActivity = today;
        
        // Save updated statistics
        await userStats.save();
        
        console.log(`Statistics updated for user ${userId}: Average Score: ${userStats.averageScore}%`);
        
    } catch (error) {
        console.error('Error updating user statistics:', error);
        throw error;
    }
}
```

## 3. AI Integration Implementation

### 3.1 FastAPI Microservice Development

**Google Gemini AI Integration Service**

```python
# gemini-api/main.py - FastAPI microservice implementation
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import google.generativeai as genai
import json
import re
import os
from typing import List, Optional
import logging
from datetime import datetime

# Configure logging for production monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application with comprehensive configuration
app = FastAPI(
    title="WiseBuddy AI Service",
    description="AI-powered educational content generation using Google Gemini",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Configure Google Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set")
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model with optimal configuration
model = genai.GenerativeModel(
    'gemini-pro',
    generation_config=genai.types.GenerationConfig(
        candidate_count=1,
        max_output_tokens=2048,
        temperature=0.7,  # Balanced creativity and consistency
    )
)

# Pydantic models for request/response validation
class QuizRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=1, max_length=200)
    difficulty: str = Field(default="medium", regex="^(easy|medium|hard)$")
    num_questions: int = Field(default=5, ge=1, le=10)
    
    @validator('subject', 'topic')
    def validate_text_fields(cls, v):
        if not v.strip():
            raise ValueError('Field cannot be empty or only whitespace')
        return v.strip()

class Question(BaseModel):
    question: str
    options: List[str] = Field(..., min_items=4, max_items=4)
    correct_answer: int = Field(..., ge=0, le=3)
    explanation: str

class QuizResponse(BaseModel):
    questions: List[Question]
    metadata: dict

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str

# Quiz generation with comprehensive error handling and validation
@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """
    Generate educational quiz using Google Gemini AI
    
    This endpoint creates a structured quiz based on the provided subject,
    topic, and difficulty level. The AI generates contextually appropriate
    questions with multiple choice options and detailed explanations.
    """
    try:
        logger.info(f"Generating quiz for {request.subject}/{request.topic} - {request.difficulty}")
        
        # Construct optimized prompt for educational content generation
        prompt = f"""
        Create a {request.difficulty} level educational quiz about "{request.topic}" in the subject of {request.subject}.

        Requirements:
        - Generate exactly {request.num_questions} multiple choice questions
        - Each question must have exactly 4 options labeled A, B, C, D
        - Questions should be appropriate for {request.difficulty} difficulty level
        - Include detailed explanations for the correct answers
        - Ensure questions test understanding, not just memorization
        - Make options plausible to encourage critical thinking

        Response format (JSON only, no additional text):
        {{
            "questions": [
                {{
                    "question": "Clear, well-formulated question here",
                    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
                    "correct_answer": 0,
                    "explanation": "Detailed explanation of why this answer is correct and why others are wrong"
                }}
            ]
        }}
        
        Subject: {request.subject}
        Topic: {request.topic}
        Difficulty: {request.difficulty}
        Number of questions: {request.num_questions}
        """
        
        # Generate content using Gemini AI
        response = model.generate_content(prompt)
        
        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="AI service returned empty response"
            )
        
        # Clean and parse the AI response
        cleaned_response = clean_ai_response(response.text)
        quiz_data = parse_quiz_response(cleaned_response)
        
        # Validate the generated quiz structure
        validated_quiz = validate_quiz_structure(quiz_data, request.num_questions)
        
        # Create response with metadata
        quiz_response = QuizResponse(
            questions=validated_quiz["questions"],
            metadata={
                "subject": request.subject,
                "topic": request.topic,
                "difficulty": request.difficulty,
                "generated_at": datetime.now().isoformat(),
                "total_questions": len(validated_quiz["questions"]),
                "ai_model": "gemini-pro"
            }
        )
        
        logger.info(f"Successfully generated {len(quiz_response.questions)} questions")
        return quiz_response
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse AI response. Please try again."
        )
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}"
        )

def clean_ai_response(response_text: str) -> str:
    """
    Clean and prepare AI response for JSON parsing
    
    Removes markdown formatting, extra whitespace, and non-JSON content
    that might interfere with parsing.
    """
    # Remove markdown code blocks
    cleaned = re.sub(r'```json\s*', '', response_text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    
    # Remove extra whitespace and newlines
    cleaned = re.sub(r'\n\s*\n', '\n', cleaned)
    cleaned = cleaned.strip()
    
    # Extract JSON content if it's embedded in other text
    json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group(0)
    
    return cleaned

def parse_quiz_response(response_text: str) -> dict:
    """
    Parse AI response into structured quiz data
    
    Handles various JSON formats and validates basic structure
    before detailed validation.
    """
    try:
        quiz_data = json.loads(response_text)
        
        # Ensure the response has the expected structure
        if "questions" not in quiz_data:
            raise ValueError("Response missing 'questions' field")
        
        if not isinstance(quiz_data["questions"], list):
            raise ValueError("'questions' must be a list")
        
        return quiz_data
        
    except json.JSONDecodeError:
        # Attempt to fix common JSON issues
        fixed_response = fix_common_json_issues(response_text)
        return json.loads(fixed_response)

def fix_common_json_issues(text: str) -> str:
    """
    Attempt to fix common JSON formatting issues in AI responses
    """
    # Fix missing commas between objects
    text = re.sub(r'}\s*{', '}, {', text)
    
    # Fix missing commas in arrays
    text = re.sub(r']\s*\[', '], [', text)
    
    # Fix unescaped quotes in strings
    text = re.sub(r'(?<!\\)"(?=.*")', '\\"', text)
    
    return text

def validate_quiz_structure(quiz_data: dict, expected_questions: int) -> dict:
    """
    Comprehensive validation of quiz structure and content
    
    Ensures all questions have required fields and proper formatting
    """
    questions = quiz_data.get("questions", [])
    
    if len(questions) != expected_questions:
        logger.warning(f"Expected {expected_questions} questions, got {len(questions)}")
    
    validated_questions = []
    
    for i, question in enumerate(questions):
        try:
            # Validate required fields
            if not all(key in question for key in ["question", "options", "correct_answer", "explanation"]):
                raise ValueError(f"Question {i+1} missing required fields")
            
            # Validate question text
            if not question["question"].strip():
                raise ValueError(f"Question {i+1} has empty question text")
            
            # Validate options
            options = question["options"]
            if not isinstance(options, list) or len(options) != 4:
                raise ValueError(f"Question {i+1} must have exactly 4 options")
            
            if any(not str(option).strip() for option in options):
                raise ValueError(f"Question {i+1} has empty option(s)")
            
            # Validate correct answer
            correct_answer = question["correct_answer"]
            if not isinstance(correct_answer, int) or correct_answer < 0 or correct_answer > 3:
                raise ValueError(f"Question {i+1} correct_answer must be 0, 1, 2, or 3")
            
            # Validate explanation
            if not question["explanation"].strip():
                raise ValueError(f"Question {i+1} has empty explanation")
            
            # Create validated question object
            validated_question = Question(
                question=question["question"].strip(),
                options=[str(option).strip() for option in options],
                correct_answer=correct_answer,
                explanation=question["explanation"].strip()
            )
            
            validated_questions.append(validated_question)
            
        except Exception as e:
            logger.error(f"Validation error for question {i+1}: {e}")
            continue
    
    if not validated_questions:
        raise ValueError("No valid questions could be generated")
    
    return {"questions": validated_questions}

# Health check endpoint for monitoring
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for service monitoring
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version="1.0.0"
    )

# Error handling middleware
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP Exception: {exc.detail}")
    return {"error": exc.detail, "status_code": exc.status_code}

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {exc}")
    return {"error": "Internal server error", "status_code": 500}

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server with production-ready configuration
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True
    )
```

## 4. Frontend Implementation

### 4.1 Interactive Quiz Interface

**Dynamic Quiz Component with Real-time Feedback**

```javascript
// frontend/dashboard.js - Quiz interface implementation
class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null;
        this.questionStartTime = null;
        this.isQuizActive = false;
        this.timeSpentPerQuestion = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Quiz generation form submission
        document.getElementById('quiz-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQuiz();
        });
        
        // Answer selection handling
        document.addEventListener('change', (e) => {
            if (e.target.name === 'quiz-answer') {
                this.handleAnswerSelection(e.target.value);
            }
        });
        
        // Navigation button handlers
        document.getElementById('next-question')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        document.getElementById('submit-quiz')?.addEventListener('click', () => {
            this.submitQuiz();
        });
        
        // Quiz restart functionality
        document.getElementById('restart-quiz')?.addEventListener('click', () => {
            this.restartQuiz();
        });
    }
    
    async generateQuiz() {
        try {
            const formData = new FormData(document.getElementById('quiz-form'));
            const subject = formData.get('subject');
            const topic = formData.get('topic');
            const difficulty = formData.get('difficulty') || 'medium';
            
            // Input validation
            if (!subject || !topic) {
                this.showError('Please fill in all required fields');
                return;
            }
            
            // Show loading state
            this.showLoadingState('Generating your personalized quiz...');
            
            // Make API request to generate quiz
            const response = await fetch('http://127.0.0.1:8000/generate-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject: subject,
                    topic: topic,
                    difficulty: difficulty,
                    num_questions: 5
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate quiz');
            }
            
            const quizData = await response.json();
            
            // Initialize quiz state
            this.currentQuiz = quizData;
            this.currentQuestionIndex = 0;
            this.answers = new Array(quizData.questions.length).fill(null);
            this.startTime = Date.now();
            this.timeSpentPerQuestion = [];
            this.isQuizActive = true;
            
            // Display the first question
            this.displayQuestion();
            this.hideLoadingState();
            
            // Log quiz generation for analytics
            console.log(`Quiz generated: ${subject}/${topic} - ${quizData.questions.length} questions`);
            
        } catch (error) {
            console.error('Quiz generation error:', error);
            this.showError(`Failed to generate quiz: ${error.message}`);
            this.hideLoadingState();
        }
    }
    
    displayQuestion() {
        if (!this.currentQuiz || !this.isQuizActive) return;
        
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const questionContainer = document.getElementById('question-container');
        
        // Record time for previous question
        if (this.questionStartTime) {
            const timeSpent = Date.now() - this.questionStartTime;
            this.timeSpentPerQuestion[this.currentQuestionIndex - 1] = timeSpent;
        }
        
        // Start timing for current question
        this.questionStartTime = Date.now();
        
        // Generate question HTML with accessibility features
        const questionHTML = `
            <div class="question-wrapper" role="region" aria-labelledby="question-text">
                <div class="question-header">
                    <span class="question-number">Question ${this.currentQuestionIndex + 1} of ${this.currentQuiz.questions.length}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100}%"></div>
                    </div>
                </div>
                
                <h3 id="question-text" class="question-text">${this.escapeHtml(question.question)}</h3>
                
                <div class="options-container" role="radiogroup" aria-labelledby="question-text">
                    ${question.options.map((option, index) => `
                        <label class="option-label" for="option-${index}">
                            <input 
                                type="radio" 
                                id="option-${index}" 
                                name="quiz-answer" 
                                value="${index}"
                                ${this.answers[this.currentQuestionIndex] === index ? 'checked' : ''}
                                aria-describedby="question-text"
                            >
                            <span class="option-text">${this.escapeHtml(option)}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div class="question-navigation">
                    ${this.currentQuestionIndex > 0 ? 
                        '<button type="button" id="prev-question" class="btn btn-secondary">Previous</button>' : ''
                    }
                    
                    ${this.currentQuestionIndex < this.currentQuiz.questions.length - 1 ? 
                        '<button type="button" id="next-question" class="btn btn-primary" disabled>Next Question</button>' :
                        '<button type="button" id="submit-quiz" class="btn btn-success" disabled>Submit Quiz</button>'
                    }
                </div>
            </div>
        `;
        
        questionContainer.innerHTML = questionHTML;
        
        // Re-attach event listeners for dynamically created elements
        this.attachQuestionEventListeners();
        
        // Update navigation button state
        this.updateNavigationState();
    }
    
    attachQuestionEventListeners() {
        // Previous question handler
        document.getElementById('prev-question')?.addEventListener('click', () => {
            this.previousQuestion();
        });
        
        // Next question handler
        document.getElementById('next-question')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Submit quiz handler
        document.getElementById('submit-quiz')?.addEventListener('click', () => {
            this.submitQuiz();
        });
        
        // Answer selection handlers
        document.querySelectorAll('input[name="quiz-answer"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleAnswerSelection(parseInt(e.target.value));
            });
        });
    }
    
    handleAnswerSelection(selectedOption) {
        if (!this.isQuizActive) return;
        
        // Store the selected answer
        this.answers[this.currentQuestionIndex] = selectedOption;
        
        // Update navigation button state
        this.updateNavigationState();
        
        // Provide visual feedback
        this.highlightSelectedOption(selectedOption);
        
        // Auto-advance after a brief delay (optional UX enhancement)
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            setTimeout(() => {
                document.getElementById('next-question')?.focus();
            }, 200);
        }
    }
    
    updateNavigationState() {
        const hasAnswer = this.answers[this.currentQuestionIndex] !== null;
        const nextButton = document.getElementById('next-question');
        const submitButton = document.getElementById('submit-quiz');
        
        if (nextButton) {
            nextButton.disabled = !hasAnswer;
        }
        
        if (submitButton) {
            const allAnswered = this.answers.every(answer => answer !== null);
            submitButton.disabled = !allAnswered;
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }
    
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }
    
    async submitQuiz() {
        try {
            if (!this.isQuizActive || !this.currentQuiz) return;
            
            // Record time for last question
            if (this.questionStartTime) {
                const timeSpent = Date.now() - this.questionStartTime;
                this.timeSpentPerQuestion[this.currentQuestionIndex] = timeSpent;
            }
            
            // Calculate quiz results
            const results = this.calculateResults();
            
            // Show loading state for submission
            this.showLoadingState('Submitting your quiz...');
            
            // Submit progress to backend
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    subject: this.currentQuiz.metadata.subject,
                    topic: this.currentQuiz.metadata.topic,
                    answers: this.answers.map(answer => answer !== null ? 1 : 0), // Convert to binary
                    score: results.score,
                    timeSpent: results.totalTime,
                    totalQuestions: this.currentQuiz.questions.length
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit quiz');
            }
            
            const submissionResult = await response.json();
            
            // Display results
            this.displayResults(results, submissionResult);
            this.hideLoadingState();
            
            // Mark quiz as completed
            this.isQuizActive = false;
            
            // Refresh dashboard statistics
            if (typeof refreshDashboard === 'function') {
                await refreshDashboard();
            }
            
        } catch (error) {
            console.error('Quiz submission error:', error);
            this.showError(`Failed to submit quiz: ${error.message}`);
            this.hideLoadingState();
        }
    }
    
    calculateResults() {
        let correctAnswers = 0;
        const totalQuestions = this.currentQuiz.questions.length;
        const totalTime = Date.now() - this.startTime;
        
        // Calculate correct answers
        this.answers.forEach((answer, index) => {
            if (answer === this.currentQuiz.questions[index].correct_answer) {
                correctAnswers++;
            }
        });
        
        const score = Math.round((correctAnswers / totalQuestions) * 100);
        
        return {
            correctAnswers,
            totalQuestions,
            score,
            totalTime: Math.round(totalTime / 1000), // Convert to seconds
            timePerQuestion: this.timeSpentPerQuestion
        };
    }
    
    displayResults(results, submissionData) {
        const questionContainer = document.getElementById('question-container');
        
        // Generate detailed results HTML
        const resultsHTML = `
            <div class="quiz-results" role="main" aria-labelledby="results-title">
                <div class="results-header">
                    <h2 id="results-title">Quiz Complete! 🎉</h2>
                    <div class="score-display">
                        <span class="score-value">${results.score}%</span>
                        <span class="score-label">${results.correctAnswers} out of ${results.totalQuestions} correct</span>
                    </div>
                </div>
                
                <div class="results-stats">
                    <div class="stat-item">
                        <span class="stat-label">Time Taken:</span>
                        <span class="stat-value">${this.formatTime(results.totalTime)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average per Question:</span>
                        <span class="stat-value">${this.formatTime(Math.round(results.totalTime / results.totalQuestions))}</span>
                    </div>
                </div>
                
                <div class="results-breakdown">
                    <h3>Question Review</h3>
                    ${this.generateQuestionReview()}
                </div>
                
                <div class="results-actions">
                    <button type="button" id="restart-quiz" class="btn btn-primary">Try Again</button>
                    <button type="button" id="new-quiz" class="btn btn-secondary">New Topic</button>
                    <button type="button" id="view-dashboard" class="btn btn-outline">View Dashboard</button>
                </div>
            </div>
        `;
        
        questionContainer.innerHTML = resultsHTML;
        
        // Attach event listeners for result actions
        this.attachResultEventListeners();
        
        // Announce results for screen readers
        this.announceResults(results);
    }
    
    generateQuestionReview() {
        return this.currentQuiz.questions.map((question, index) => {
            const userAnswer = this.answers[index];
            const correctAnswer = question.correct_answer;
            const isCorrect = userAnswer === correctAnswer;
            
            return `
                <div class="question-review-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="review-header">
                        <span class="question-number">Q${index + 1}</span>
                        <span class="result-indicator ${isCorrect ? 'correct' : 'incorrect'}">
                            ${isCorrect ? '✓' : '✗'}
                        </span>
                    </div>
                    <p class="review-question">${this.escapeHtml(question.question)}</p>
                    <div class="review-answers">
                        <p class="user-answer">
                            Your answer: <span class="${isCorrect ? 'correct' : 'incorrect'}">${question.options[userAnswer] || 'No answer'}</span>
                        </p>
                        ${!isCorrect ? `
                            <p class="correct-answer">
                                Correct answer: <span class="correct">${question.options[correctAnswer]}</span>
                            </p>
                        ` : ''}
                    </div>
                    <div class="explanation">
                        <p><strong>Explanation:</strong> ${this.escapeHtml(question.explanation)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    showLoadingState(message) {
        const container = document.getElementById('question-container');
        container.innerHTML = `
            <div class="loading-state" role="status" aria-live="polite">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
    }
    
    hideLoadingState() {
        // Loading state is replaced when content is loaded
    }
    
    showError(message) {
        const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
        errorContainer.innerHTML = `
            <div class="error-message" role="alert">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button type="button" class="error-close" onclick="this.parentElement.style.display='none'">×</button>
            </div>
        `;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
    
    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.className = 'error-container';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }
}

// Initialize quiz manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizManager = new QuizManager();
});
```

This implementation demonstrates comprehensive full-stack development with modern web technologies, AI integration, and production-ready features including error handling, security measures, performance optimization, and accessibility considerations.
