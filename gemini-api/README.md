# Educational Content Generator API

FastAPI service that generates educational content using Google's Gemini AI. Creates structured learning materials with concepts, examples, and quiz questions.

## 🚀 Quick Start

### Option 1: Automated Setup & Start
```bash
python start.py
```
This will install dependencies, check configuration, and start the server.

### Option 2: Manual Setup

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Key:**
   - Make sure your `.env` file has:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

3. **Start FastAPI Server:**
   ```bash
   python main.py
   ```

4. **Test the API:**
   ```bash
   python test_api.py
   ```

## 📊 API Endpoints

### 🏠 Root
```http
GET /
```
Basic API information and available endpoints.

### 💚 Health Check
```http
GET /health
```
Check server status and Gemini API connection.

### 🎓 Generate Educational Content
```http
POST /generate-content
Content-Type: application/json

{
    "topic": "Photosynthesis",
    "difficulty": "beginner"
}
```

**Response:**
```json
{
    "topic": "Photosynthesis",
    "difficulty": "beginner",
    "success": true,
    "message": "Content generated successfully",
    "content": {
        "concept": "Photosynthesis is the process by which plants...",
        "examples": ["Plants in your garden...", "Trees in forests...", "Algae in oceans..."],
        "questions": [
            {
                "question": "What is the primary purpose of photosynthesis?",
                "options": [
                    {"option": "To produce oxygen", "is_correct": false},
                    {"option": "To convert sunlight into energy", "is_correct": true},
                    {"option": "To absorb water", "is_correct": false},
                    {"option": "To release carbon dioxide", "is_correct": false}
                ],
                "explanation": "Photosynthesis converts sunlight into chemical energy..."
            }
        ]
    }
}
```

### 💡 Topic Suggestions
```http
GET /topics/suggestions
```
Get suggested topics organized by category (science, technology, mathematics, etc.).

### 📊 Difficulty Levels
```http
GET /difficulties
```
Get available difficulty levels with descriptions.

## 🧪 Testing

### Test Gemini Module
```bash
python gemini.py
```

### Test FastAPI Server
```bash
# Start server first
python main.py

# Then in another terminal
python test_api.py
```

### Interactive Testing
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuration

### Difficulty Levels
- **beginner**: Simple explanations, easy questions
- **intermediate**: Detailed concepts, moderate complexity  
- **advanced**: In-depth explanations, challenging questions

### Supported Topics
The API can generate content for any topic, with suggestions available in:
- Science (Photosynthesis, Solar System, DNA, etc.)
- Technology (AI, Machine Learning, Blockchain, etc.)
- Mathematics (Algebra, Geometry, Calculus, etc.)
- History (World Wars, Renaissance, etc.)
- Language (Grammar, Writing, Literature, etc.)

## 📁 Project Structure

```
gemini-api/
├── main.py              # FastAPI application
├── gemini.py            # Gemini AI content generator
├── test_api.py          # API endpoint tests
├── start.py             # Automated setup & start script
├── requirements.txt     # Dependencies
├── .env                 # Environment variables
└── README.md           # This file
```

## 🌟 Features

- ✅ **RESTful API** with FastAPI
- ✅ **Structured JSON Output** for easy integration
- ✅ **Multiple Difficulty Levels** 
- ✅ **Topic Suggestions** by category
- ✅ **CORS Enabled** for frontend integration
- ✅ **Interactive Documentation** with Swagger UI
- ✅ **Health Monitoring** with status endpoints
- ✅ **Error Handling** with detailed messages

## 🔗 Integration Ready

This API is designed to integrate with:
- **Frontend**: HTML/CSS/JavaScript
- **Backend**: Express.js with MongoDB (next phase)
- **Mobile**: React Native, Flutter, etc.

## 📝 Usage Examples

### JavaScript/Frontend
```javascript
// Generate content
const response = await fetch('http://localhost:8000/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        topic: 'Machine Learning',
        difficulty: 'intermediate'
    })
});

const result = await response.json();
console.log(result.content);
```

### Python
```python
import requests

response = requests.post('http://localhost:8000/generate-content', 
    json={'topic': 'Climate Change', 'difficulty': 'beginner'})
    
content = response.json()
print(content['content']['concept'])
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Run `pip install -r requirements.txt`
2. **API Key Issues**: Check your `.env` file configuration
3. **Connection Errors**: Make sure server is running on port 8000
4. **CORS Issues**: Server includes CORS middleware for cross-origin requests

### Debug Tips

- Check server logs for detailed error messages
- Use `/health` endpoint to verify Gemini API connectivity
- Test with simple topics first (e.g., "Water Cycle")
- Verify your API key at https://aistudio.google.com/app/apikey

## 🚀 Next Phase

Ready for integration with Express.js backend and MongoDB database!

3. **Test Gemini API (Optional):**
   ```bash
   python test_gemini.py
   ```

4. **Run the FastAPI server:**
   ```bash
   python main.py
   ```
   or
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. **Test the API:**
   - Health check: http://localhost:8000/health
   - API docs: http://localhost:8000/docs
   - Generate content: POST http://localhost:8000/generate-content

## API Endpoints

### POST /generate-content
Generate educational content for a topic.

**Request:**
```json
{
    "topic": "Photosynthesis",
    "difficulty": "beginner"
}
```

**Response:**
```json
{
    "topic": "Photosynthesis",
    "concept": "Concept explanation...",
    "examples": ["Example 1", "Example 2", "Example 3"],
    "questions": [
        {
            "question": "What is the main purpose of photosynthesis?",
            "options": [
                {"option": "To produce oxygen", "is_correct": false},
                {"option": "To produce glucose", "is_correct": true},
                {"option": "To absorb water", "is_correct": false},
                {"option": "To release carbon dioxide", "is_correct": false}
            ],
            "explanation": "Photosynthesis primarily produces glucose..."
        }
    ]
}
```

### GET /health
Check if the service is running and Gemini API is configured.
