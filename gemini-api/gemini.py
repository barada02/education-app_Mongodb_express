# To run this code you need to install the following dependencies:
# pip install google-genai python-dotenv

import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def generate_educational_content(topic="Photosynthesis", difficulty="beginner"):
    """Generate structured educational content for a given topic"""
    
    # Get API key from environment
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Try to load manually from .env file
        try:
            with open('.env', 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip().strip('"\'')
                        os.environ['GEMINI_API_KEY'] = api_key
                        break
        except:
            pass
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment or .env file!")
        return None
    
    # Initialize client
    client = genai.Client(api_key=api_key)
    
    # Create educational prompt for structured output
    prompt = f"""You are an expert Educator. Create educational content for the topic '{topic}' at {difficulty} level.

    Provide response in this exact JSON format:
    {{
        "concept": "Clear explanation of the concept related to the topic '{topic}'",
        "examples": ["Example 1", "Example 2", "Example 3"],
        "questions": [
            {{
                "question": "Question text?",
                "options": [
                    {{"option": "Option A", "is_correct": false}},
                    {{"option": "Option B", "is_correct": true}},
                    {{"option": "Option C", "is_correct": false}},
                    {{"option": "Option D", "is_correct": false}}
                ],
                "explanation": "Why this answer is correct"
            }}
        ]
    }}

    Requirements:
    - Generate exactly 3 multiple choice questions
    - Each question has 4 options with only one correct answer
    - Provide clear explanations
    - Make examples practical and relatable
    - Return ONLY valid JSON without markdown or extra text"""

    # Generate content
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        )
    ]
    
    tools = [types.Tool(googleSearch=types.GoogleSearch())]
    
    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=-1),
        tools=tools,
        response_mime_type="text/plain"
    )

    print(f"🔄 Generating content for: {topic} ({difficulty})")
    
    try:
        # Get response
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        content_text = response.text.strip()
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group()
            content_data = json.loads(json_str)
            
            print("✅ Content generated successfully!")
            print(f"📝 Topic: {topic}")
            print(f"💡 Concept: {content_data.get('concept', 'N/A')[:100]}...")
            print(f"📚 Examples: {len(content_data.get('examples', []))} examples")
            print(f"❓ Questions: {len(content_data.get('questions', []))} questions")
            
            return content_data
        else:
            print("❌ No valid JSON found in response")
            return None
            
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_connection():
    """Test API connection"""
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        # Try manual loading
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip().strip('"\'')
                        break
        except:
            pass
    
    if not api_key:
        print("❌ API key not found!")
        return False
    
    try:
        client = genai.Client(api_key=api_key)
        print("✅ API connection successful!")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🎓 Educational Content Generator")
    print("=" * 35)
    
    # Test connection
    if not test_connection():
        print("Please check your .env file and API key")
        exit(1)
    
    # Generate content for a specific topic
    result = generate_educational_content("Photosynthesis", "beginner")
    
    if result:
        print("\n✅ Content generated successfully!")
        print(f"📚 Generated {len(result.get('questions', []))} questions")
        
        # Display first question as sample
        if result.get('questions'):
            q = result['questions'][0]
            print(f"\n📋 Sample Question: {q.get('question')}")
            for i, opt in enumerate(q.get('options', [])):
                mark = "✓" if opt.get('is_correct') else " "
                print(f"   {chr(65+i)}. [{mark}] {opt.get('option')}")
    else:
        print("❌ Failed to generate content")
    
    print("\n🎉 Test completed!")
