# System Design and Architecture

## Overview

WiseBuddy's system architecture follows a modern, scalable microservices design pattern that integrates artificial intelligence capabilities with traditional web application components. The system is designed to handle concurrent users while providing real-time AI-generated educational content and comprehensive learning analytics.

## 1. High-Level Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        WiseBuddy Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer (Client-Side)                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Landing Page  │ │   Main App      │ │   Dashboard     │   │
│  │   (index.html)  │ │   (app.html)    │ │ (dashboard.html)│   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway / Load Balancer                                   │
├─────────────────────────────────────────────────────────────────┤
│  Backend Services Layer                                        │
│  ┌─────────────────┐                   ┌─────────────────┐     │
│  │   Express.js    │ ◄────────────────► │   FastAPI       │     │
│  │   Main Server   │                   │   AI Service    │     │
│  │   (Port 3000)   │                   │   (Port 8000)   │     │
│  └─────────────────┘                   └─────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │    MongoDB      │ │  Session Store  │ │  Google Gemini  │   │
│  │   Database      │ │                 │ │      API        │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

**User Request Flow**
1. **Client Request**: User interacts with frontend interface
2. **API Gateway**: Request routing and load balancing
3. **Authentication**: Session validation and user authorization
4. **Business Logic**: Core application processing
5. **Data Access**: Database operations and external API calls
6. **Response Processing**: Data formatting and response delivery
7. **Client Update**: Frontend state update and UI refresh

## 2. Frontend Architecture

### 2.1 Client-Side Design Pattern

**Single Page Application (SPA) with Progressive Enhancement**

```javascript
// Frontend Architecture Pattern
const WiseBuddyApp = {
    router: {
        // URL routing and navigation management
        navigate: (route) => { /* Route handling logic */ },
        setupRoutes: () => { /* Route configuration */ }
    },
    
    ui: {
        // UI component management
        components: {
            quiz: QuizComponent,
            dashboard: DashboardComponent,
            auth: AuthComponent
        },
        
        render: (component, data) => { /* Rendering logic */ }
    },
    
    api: {
        // API communication layer
        request: async (endpoint, options) => { /* HTTP requests */ },
        auth: AuthAPI,
        content: ContentAPI,
        progress: ProgressAPI
    },
    
    state: {
        // Application state management
        user: null,
        currentQuiz: null,
        progress: {},
        
        update: (key, value) => { /* State updates */ }
    }
};
```

### 2.2 Frontend Component Structure

**Modular Component Design**

1. **Core Components**
   - `AuthComponent`: User authentication and session management
   - `QuizComponent`: Interactive quiz interface and question rendering
   - `DashboardComponent`: User progress visualization and analytics
   - `NavigationComponent`: Application navigation and routing

2. **Utility Modules**
   - `ApiClient`: HTTP request handling and error management
   - `StateManager`: Application state management and persistence
   - `EventBus`: Component communication and event handling
   - `ValidationUtils`: Form validation and input sanitization

### 2.3 Responsive Design Architecture

**Mobile-First Design System**

```css
/* Responsive Design Breakpoints */
:root {
    --mobile: 320px;
    --tablet: 768px;
    --desktop: 1024px;
    --wide: 1440px;
}

/* Component-Based CSS Architecture */
.component {
    /* Base mobile styles */
}

@media (min-width: 768px) {
    .component {
        /* Tablet adaptations */
    }
}

@media (min-width: 1024px) {
    .component {
        /* Desktop optimizations */
    }
}
```

## 3. Backend Architecture

### 3.1 Express.js Main Server Architecture

**Layered Architecture Pattern**

```javascript
// Server Architecture Structure
const ServerArchitecture = {
    // Presentation Layer
    routes: {
        auth: '/api/auth/*',
        dashboard: '/api/dashboard/*',
        content: '/api/content/*',
        progress: '/api/progress/*'
    },
    
    // Business Logic Layer
    controllers: {
        AuthController: {
            login: async (req, res) => { /* Authentication logic */ },
            logout: async (req, res) => { /* Session termination */ },
            register: async (req, res) => { /* User registration */ }
        },
        
        ContentController: {
            generateQuiz: async (req, res) => { /* AI integration */ },
            getContent: async (req, res) => { /* Content retrieval */ }
        },
        
        ProgressController: {
            saveProgress: async (req, res) => { /* Progress tracking */ },
            getStatistics: async (req, res) => { /* Analytics */ }
        }
    },
    
    // Data Access Layer
    models: {
        User: UserModel,
        UserProgress: UserProgressModel,
        UserStatistics: UserStatisticsModel,
        Content: ContentModel
    },
    
    // Infrastructure Layer
    middleware: {
        authentication: AuthMiddleware,
        validation: ValidationMiddleware,
        errorHandling: ErrorHandlerMiddleware,
        logging: LoggingMiddleware
    }
};
```

### 3.2 Database Schema Design

**MongoDB Document Structure**

```javascript
// User Schema
const UserSchema = {
    _id: ObjectId,
    username: String,
    email: String,
    password: String, // Hashed with bcrypt
    createdAt: Date,
    updatedAt: Date,
    profile: {
        firstName: String,
        lastName: String,
        preferredSubjects: [String],
        learningGoals: [String]
    }
};

// UserProgress Schema
const UserProgressSchema = {
    _id: ObjectId,
    userId: ObjectId, // Reference to User
    subject: String,
    topic: String,
    attempts: [{
        attemptNumber: Number,
        startedAt: Date,
        completedAt: Date,
        totalQuestions: Number,
        correctAnswers: Number,
        score: Number,
        answers: [{
            questionIndex: Number,
            selectedOption: Number,
            isCorrect: Boolean,
            timeSpent: Number
        }]
    }],
    createdAt: Date,
    updatedAt: Date
};

// UserStatistics Schema
const UserStatisticsSchema = {
    _id: ObjectId,
    userId: ObjectId,
    totalQuizzes: Number,
    totalQuestionsAnswered: Number,
    correctAnswers: Number,
    averageScore: Number,
    totalTimeSpent: Number,
    subjectBreakdown: [{
        subject: String,
        quizzesCompleted: Number,
        averageScore: Number,
        timeSpent: Number
    }],
    streakData: {
        currentStreak: Number,
        longestStreak: Number,
        lastActivity: Date
    },
    createdAt: Date,
    updatedAt: Date
};
```

### 3.3 API Design Architecture

**RESTful API Design with Clear Resource Mapping**

```javascript
// API Endpoint Structure
const APIEndpoints = {
    // Authentication Resources
    'POST /api/auth/login': {
        description: 'User authentication',
        input: { username: String, password: String },
        output: { success: Boolean, user: Object, sessionId: String }
    },
    
    'POST /api/auth/logout': {
        description: 'Session termination',
        input: {},
        output: { success: Boolean, message: String }
    },
    
    // Content Resources
    'GET /api/content/quiz': {
        description: 'Generate AI-powered quiz',
        input: { subject: String, topic: String, difficulty: String },
        output: { questions: Array, metadata: Object }
    },
    
    // Progress Resources
    'POST /api/progress': {
        description: 'Save quiz progress',
        input: { 
            subject: String, 
            topic: String, 
            answers: Array, 
            score: Number 
        },
        output: { success: Boolean, progressId: String }
    },
    
    // Dashboard Resources
    'GET /api/dashboard/statistics': {
        description: 'User learning analytics',
        input: {},
        output: { 
            overview: Object, 
            subjectBreakdown: Array, 
            progressTrends: Array 
        }
    }
};
```

## 4. AI Service Architecture

### 4.1 FastAPI Microservice Design

**AI Service Architecture Pattern**

```python
# FastAPI Service Structure
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

class AIServiceArchitecture:
    def __init__(self):
        self.app = FastAPI(title="WiseBuddy AI Service")
        self.setup_routes()
        self.configure_ai()
    
    def setup_routes(self):
        """Configure API endpoints for AI services"""
        
        @self.app.post("/generate-quiz")
        async def generate_quiz(request: QuizRequest):
            """Generate educational quiz using Google Gemini"""
            return await self.quiz_generator.create_quiz(
                subject=request.subject,
                topic=request.topic,
                difficulty=request.difficulty,
                num_questions=request.num_questions
            )
        
        @self.app.post("/generate-content")
        async def generate_content(request: ContentRequest):
            """Generate educational content explanations"""
            return await self.content_generator.create_explanation(
                topic=request.topic,
                level=request.level
            )
    
    def configure_ai(self):
        """Initialize Google Gemini AI configuration"""
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-pro')
```

### 4.2 AI Content Generation Pipeline

**Content Generation Workflow**

```python
class ContentGenerationPipeline:
    """AI-powered educational content generation system"""
    
    async def generate_quiz(self, subject: str, topic: str, difficulty: str) -> dict:
        """
        Generate structured quiz content using AI
        
        Pipeline Steps:
        1. Context Preparation
        2. Prompt Engineering
        3. AI Content Generation
        4. Response Validation
        5. Format Standardization
        """
        
        # Step 1: Context Preparation
        context = self.prepare_educational_context(subject, topic, difficulty)
        
        # Step 2: Prompt Engineering
        prompt = self.build_quiz_prompt(context)
        
        # Step 3: AI Generation
        response = await self.model.generate_content_async(prompt)
        
        # Step 4: Validation
        validated_content = self.validate_quiz_format(response.text)
        
        # Step 5: Standardization
        return self.standardize_quiz_format(validated_content)
    
    def prepare_educational_context(self, subject: str, topic: str, difficulty: str) -> dict:
        """Prepare educational context for AI generation"""
        return {
            'subject': subject,
            'topic': topic,
            'difficulty': difficulty,
            'learning_objectives': self.get_learning_objectives(subject, topic),
            'prerequisite_knowledge': self.get_prerequisites(subject, topic)
        }
    
    def build_quiz_prompt(self, context: dict) -> str:
        """Engineer optimized prompts for educational content generation"""
        return f"""
        Create a {context['difficulty']} level quiz about {context['topic']} 
        in {context['subject']}.
        
        Requirements:
        - Generate exactly 5 multiple choice questions
        - Each question should have 4 options (A, B, C, D)
        - Include detailed explanations for correct answers
        - Align with learning objectives: {context['learning_objectives']}
        - Consider prerequisite knowledge: {context['prerequisite_knowledge']}
        
        Format the response as valid JSON with the following structure:
        {
            "questions": [
                {
                    "question": "Question text here",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": 0,
                    "explanation": "Detailed explanation here"
                }
            ]
        }
        """
```

## 5. Data Architecture

### 5.1 Database Design Strategy

**Document-Oriented Data Model**

```javascript
// Database Architecture Pattern
const DatabaseArchitecture = {
    // Primary Collections
    collections: {
        users: {
            purpose: "User account and profile information",
            indexes: ["username", "email", "createdAt"],
            relationships: {
                userProgress: "one-to-many",
                userStatistics: "one-to-one"
            }
        },
        
        userProgress: {
            purpose: "Individual quiz attempts and learning progress",
            indexes: ["userId", "subject", "topic", "createdAt"],
            partitioning: "by userId for scalability"
        },
        
        userStatistics: {
            purpose: "Aggregated learning analytics and metrics",
            indexes: ["userId", "updatedAt"],
            computed_fields: ["averageScore", "totalTimeSpent"]
        },
        
        content: {
            purpose: "Generated educational content caching",
            indexes: ["subject", "topic", "difficulty", "createdAt"],
            ttl: "30 days for cache invalidation"
        }
    },
    
    // Data Access Patterns
    queries: {
        user_dashboard: {
            pattern: "Aggregate user statistics and recent progress",
            optimization: "Index on userId + updatedAt",
            caching: "Redis for frequently accessed data"
        },
        
        progress_tracking: {
            pattern: "Insert quiz results and update statistics",
            optimization: "Bulk operations for performance",
            consistency: "Atomic updates using transactions"
        }
    }
};
```

### 5.2 Session Management Architecture

**Secure Session Handling**

```javascript
// Session Architecture
const SessionArchitecture = {
    store: "MongoDB with connect-mongo",
    configuration: {
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true,
            sameSite: 'strict'
        }
    },
    
    security: {
        csrf_protection: "Built-in CSRF token validation",
        session_rotation: "New session ID on authentication",
        timeout_handling: "Automatic cleanup of expired sessions"
    }
};
```

## 6. Security Architecture

### 6.1 Multi-Layer Security Design

**Defense in Depth Strategy**

```javascript
// Security Architecture Layers
const SecurityArchitecture = {
    // Layer 1: Network Security
    network: {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        },
        
        rate_limiting: {
            window: '15 minutes',
            max_requests: 100,
            skip_successful_requests: false
        }
    },
    
    // Layer 2: Application Security
    application: {
        authentication: {
            strategy: "Session-based authentication",
            password_hashing: "bcrypt with salt rounds: 12",
            session_security: "HttpOnly, Secure, SameSite cookies"
        },
        
        authorization: {
            middleware: "Route-level access control",
            user_isolation: "Data access limited to authenticated user",
            admin_protection: "Role-based access control"
        }
    },
    
    // Layer 3: Data Security
    data: {
        input_validation: {
            sanitization: "Express-validator for all inputs",
            type_checking: "Mongoose schema validation",
            length_limits: "Request size limiting"
        },
        
        output_encoding: {
            xss_prevention: "HTML entity encoding",
            json_sanitization: "Safe JSON serialization",
            error_masking: "Generic error messages for security"
        }
    }
};
```

### 6.2 Authentication Flow Architecture

**Secure Authentication Process**

```javascript
// Authentication Flow Design
const AuthenticationFlow = {
    login: {
        steps: [
            "Validate input format and length",
            "Rate limit check for brute force protection",
            "Database lookup for user credentials",
            "Password verification using bcrypt",
            "Session creation and secure cookie setting",
            "User data serialization (excluding sensitive fields)",
            "Success response with user profile"
        ],
        
        security_measures: [
            "Password complexity requirements",
            "Account lockout after failed attempts",
            "Secure session token generation",
            "HTTPS-only cookie transmission"
        ]
    },
    
    session_management: {
        validation: "Middleware checks session validity on each request",
        renewal: "Session expiration and automatic cleanup",
        logout: "Secure session destruction and cookie clearing"
    }
};
```

## 7. Performance Architecture

### 7.1 Optimization Strategies

**Multi-Level Performance Optimization**

```javascript
// Performance Architecture
const PerformanceArchitecture = {
    // Frontend Optimization
    frontend: {
        lazy_loading: "Component-based lazy loading for large content",
        caching: {
            browser_cache: "Static assets with long-term caching",
            local_storage: "User preferences and session data",
            service_worker: "Offline capability and asset caching"
        },
        
        bundling: {
            code_splitting: "Route-based code splitting",
            minification: "CSS and JavaScript compression",
            image_optimization: "WebP format with fallbacks"
        }
    },
    
    // Backend Optimization
    backend: {
        database: {
            indexing: "Strategic indexes for frequent queries",
            aggregation: "MongoDB aggregation pipelines for analytics",
            connection_pooling: "Mongoose connection management"
        },
        
        api: {
            response_compression: "Gzip compression for large responses",
            request_validation: "Early validation to prevent processing",
            error_handling: "Efficient error response patterns"
        }
    },
    
    // Infrastructure Optimization
    infrastructure: {
        load_balancing: "Distribution across multiple server instances",
        cdn: "Content delivery network for static assets",
        monitoring: "Real-time performance metrics and alerting"
    }
};
```

### 7.2 Scalability Architecture

**Horizontal and Vertical Scaling Strategies**

```javascript
// Scalability Design
const ScalabilityArchitecture = {
    horizontal_scaling: {
        microservices: "Independent scaling of AI service and main app",
        database_sharding: "User-based data partitioning",
        load_distribution: "Request routing based on resource utilization"
    },
    
    vertical_scaling: {
        resource_optimization: "Memory and CPU usage optimization",
        database_optimization: "Query performance tuning",
        caching_layers: "Multi-level caching strategy"
    },
    
    auto_scaling: {
        metrics: ["CPU utilization", "Memory usage", "Request latency"],
        thresholds: "Dynamic scaling based on demand patterns",
        health_checks: "Automated failure detection and recovery"
    }
};
```

## 8. Integration Architecture

### 8.1 Service Integration Pattern

**Microservices Communication**

```javascript
// Service Integration Architecture
const IntegrationArchitecture = {
    service_mesh: {
        main_app: {
            port: 3000,
            responsibilities: [
                "User authentication and session management",
                "Database operations and data persistence",
                "Frontend API and business logic"
            ]
        },
        
        ai_service: {
            port: 8000,
            responsibilities: [
                "AI content generation using Google Gemini",
                "Educational content optimization",
                "Natural language processing"
            ]
        }
    },
    
    communication: {
        protocol: "HTTP REST APIs",
        data_format: "JSON for all service communication",
        error_handling: "Graceful degradation and fallback strategies",
        timeout_management: "Request timeouts and retry logic"
    },
    
    external_apis: {
        google_gemini: {
            integration: "FastAPI service wrapper",
            rate_limiting: "API quota management",
            error_handling: "Fallback content generation"
        }
    }
};
```

This comprehensive system design ensures that WiseBuddy is built on a solid architectural foundation that supports scalability, maintainability, security, and performance while providing an excellent user experience for educational content consumption and learning analytics.
