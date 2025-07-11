# Education App - Express.js Backend

Express.js server with MongoDB integration for the Education App. Handles CRUD operations for educational content and integrates with the Gemini API.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Additional Required Packages
```bash
# Core backend dependencies
npm install mongoose dotenv cors axios helmet express-rate-limit joi

# Development dependencies (already installed)
# express nodemon
```

### 3. Setup MongoDB
You need to install and run MongoDB. Choose one option:

#### Option A: MongoDB Community Server (Local)
1. Download from: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. Default connection: `mongodb://localhost:27017`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at: https://www.mongodb.com/atlas
2. Create cluster and get connection string
3. Update `MONGODB_URI` in `.env` file

#### Option C: Using mongosh (MongoDB Shell)
```bash
# Install mongosh
npm install -g mongosh

# Connect to local MongoDB
mongosh

# Or connect to Atlas
mongosh "mongodb+srv://your-cluster-url"
```

### 4. Configure Environment
Edit `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/education_app
GEMINI_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 📊 API Endpoints

### 🏠 Root & Health
```http
GET /                    # API information
GET /api/health         # Health check (MongoDB + Gemini API status)
```

### 📚 Content Management
```http
GET    /api/content              # Get all content (with pagination)
GET    /api/content/:id          # Get content by ID
POST   /api/generate             # Generate new content via Gemini API
PUT    /api/content/:id          # Update existing content
DELETE /api/content/:id          # Delete content
```

### 📈 Progress Tracking (Future)
```http
POST   /api/progress            # Save user progress
```

## 🗂️ Database Schema

### Content Schema
```javascript
{
  topic: String,           // "Photosynthesis"
  difficulty: String,      // "beginner", "intermediate", "advanced"
  concept: String,         // Main explanation
  examples: [String],      // Array of examples
  questions: [{            // Quiz questions
    question: String,
    options: [{
      option: String,
      is_correct: Boolean
    }],
    explanation: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🧪 Testing

### Test the Backend
```bash
node test-backend.js
```

### Manual Testing with curl
```bash
# Health check
curl http://localhost:5000/api/health

# Get all content
curl http://localhost:5000/api/content

# Generate new content
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Solar System", "difficulty": "beginner"}'
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: development/production
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_URL`: FastAPI Gemini service URL
- `FRONTEND_URL`: Frontend URL for CORS

### Security Features
- ✅ **Helmet**: Security headers
- ✅ **CORS**: Cross-origin requests
- ✅ **Rate Limiting**: API rate limiting
- ✅ **Input Validation**: Request validation
- ✅ **Error Handling**: Comprehensive error handling

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── test-backend.js        # API testing script
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
└── README.md             # This file
```

## 🔗 Integration

### With Gemini API (FastAPI)
- Automatically calls Gemini API to generate content
- Caches generated content in MongoDB
- Handles API failures gracefully

### With Frontend
- CORS enabled for frontend requests
- RESTful API design
- JSON responses

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   mongosh --eval "db.adminCommand('ismaster')"
   
   # Or start MongoDB service
   sudo systemctl start mongodb  # Linux
   brew services start mongodb   # macOS
   net start MongoDB            # Windows
   ```

2. **Gemini API Unavailable**
   - Make sure FastAPI server is running: `python main.py`
   - Check `GEMINI_API_URL` in `.env`

3. **Port Already in Use**
   ```bash
   # Change PORT in .env file or kill process
   lsof -ti:5000 | xargs kill  # macOS/Linux
   netstat -ano | findstr :5000  # Windows
   ```

### Debug Mode
Set `NODE_ENV=development` for detailed error logging.

## 📦 Required Installations

### What you need to install:

1. **Node.js Packages** (run these commands):
```bash
npm install mongoose dotenv cors axios helmet express-rate-limit joi
```

2. **MongoDB** (choose one):
   - **Local**: MongoDB Community Server
   - **Cloud**: MongoDB Atlas
   - **CLI**: `npm install -g mongosh`

3. **Optional Tools**:
   - **MongoDB Compass**: GUI for MongoDB
   - **Postman**: API testing tool

### Package Explanations:
- **mongoose**: MongoDB object modeling
- **dotenv**: Environment variables
- **cors**: Cross-origin resource sharing
- **axios**: HTTP client for Gemini API calls
- **helmet**: Security middleware
- **express-rate-limit**: API rate limiting
- **joi**: Request validation

## 🚀 Next Steps

1. ✅ **Phase 1**: Express.js backend (Current)
2. 🔄 **Phase 2**: Frontend integration
3. 🔄 **Phase 3**: User authentication
4. 🔄 **Phase 4**: Progress tracking
5. 🔄 **Phase 5**: Deployment

Your Express.js backend is ready to handle educational content! 🎓
