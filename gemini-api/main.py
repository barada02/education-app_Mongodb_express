"""
FastAPI server for Educational Content Generation using Gemini AI
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import our Gemini function
from gemini import generate_educational_content, test_connection

# Create FastAPI app
app = FastAPI(
    title="Educational Content Generator API",
    description="Generate educational content with concepts, examples, and quiz questions using Gemini AI",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class TopicRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"  # beginner, intermediate, advanced

class MCQOption(BaseModel):
    option: str
    is_correct: bool

class MCQuestion(BaseModel):
    question: str
    options: List[MCQOption]
    explanation: str

class EducationContent(BaseModel):
    concept: str
    examples: List[str]
    questions: List[MCQuestion]

class EducationResponse(BaseModel):
    topic: str
    difficulty: str
    content: EducationContent
    success: bool
    message: str

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Educational Content Generator API",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "generate": "/generate-content",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Test Gemini API connection
    gemini_status = test_connection()
    
    return {
        "status": "healthy" if gemini_status else "unhealthy",
        "gemini_api": "connected" if gemini_status else "disconnected",
        "service": "Educational Content Generator",
        "version": "1.0.0"
    }

@app.post("/generate-content", response_model=EducationResponse)
async def generate_content(request: TopicRequest):
    """
    Generate educational content for a given topic
    
    - **topic**: The subject to generate content for
    - **difficulty**: beginner, intermediate, or advanced
    """
    try:
        # Validate difficulty level
        valid_difficulties = ["beginner", "intermediate", "advanced"]
        if request.difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid difficulty. Must be one of: {valid_difficulties}"
            )
        
        # Generate content using Gemini
        result = generate_educational_content(request.topic, request.difficulty)
        
        if result is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate content. Please check your API configuration."
            )
        
        # Validate the result structure
        if not isinstance(result, dict):
            raise HTTPException(
                status_code=500,
                detail="Invalid response format from content generator"
            )
        
        # Extract content from result
        concept = result.get('concept', '')
        examples = result.get('examples', [])
        questions_data = result.get('questions', [])
        
        # Convert questions to proper format
        questions = []
        for q_data in questions_data:
            if isinstance(q_data, dict):
                options = []
                for opt_data in q_data.get('options', []):
                    if isinstance(opt_data, dict):
                        options.append(MCQOption(
                            option=opt_data.get('option', ''),
                            is_correct=opt_data.get('is_correct', False)
                        ))
                
                questions.append(MCQuestion(
                    question=q_data.get('question', ''),
                    options=options,
                    explanation=q_data.get('explanation', '')
                ))
        
        # Create response
        education_content = EducationContent(
            concept=concept,
            examples=examples,
            questions=questions
        )
        
        response = EducationResponse(
            topic=request.topic,
            difficulty=request.difficulty,
            content=education_content,
            success=True,
            message="Content generated successfully"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/topics/suggestions")
async def get_topic_suggestions():
    """Get suggested topics for content generation"""
    suggestions = {
        "science": [
            "Photosynthesis", "Solar System", "DNA Structure", "Climate Change",
            "Chemical Reactions", "Electricity", "Magnetism", "Evolution"
        ],
        "technology": [
            "Artificial Intelligence", "Machine Learning", "Blockchain",
            "Cloud Computing", "Cybersecurity", "Internet of Things", "5G Technology"
        ],
        "mathematics": [
            "Algebra Basics", "Geometry", "Calculus", "Statistics",
            "Probability", "Linear Algebra", "Number Theory"
        ],
        "history": [
            "World War II", "Industrial Revolution", "Ancient Egypt",
            "Renaissance", "Cold War", "American Revolution"
        ],
        "language": [
            "Grammar Basics", "Vocabulary Building", "Creative Writing",
            "Public Speaking", "Literature Analysis"
        ]
    }
    
    return {
        "message": "Available topic suggestions by category",
        "categories": suggestions,
        "total_topics": sum(len(topics) for topics in suggestions.values())
    }

@app.get("/difficulties")
async def get_difficulty_levels():
    """Get available difficulty levels with descriptions"""
    levels = {
        "beginner": {
            "description": "Basic concepts with simple explanations and easy questions",
            "target_audience": "Students new to the topic"
        },
        "intermediate": {
            "description": "More detailed concepts with moderate complexity questions",
            "target_audience": "Students with some background knowledge"
        },
        "advanced": {
            "description": "In-depth explanations with challenging questions",
            "target_audience": "Students with strong foundation in the topic"
        }
    }
    
    return {
        "message": "Available difficulty levels",
        "levels": levels
    }

if __name__ == "__main__":
    print("🚀 Starting Educational Content Generator API...")
    print("📚 Server will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    
    # Run the server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
