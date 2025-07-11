"""
Test script for FastAPI Educational Content Generator
Run this after starting the FastAPI server
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔄 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {response.json()}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Make sure FastAPI server is running.")
        print("Start server with: python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_root():
    """Test root endpoint"""
    print("\n🔄 Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_generate_content():
    """Test content generation endpoint"""
    print("\n🔄 Testing content generation...")
    
    test_data = {
        "topic": "Photosynthesis",
        "difficulty": "beginner"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-content",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📝 Topic: {result.get('topic')}")
            print(f"📊 Difficulty: {result.get('difficulty')}")
            print(f"✅ Success: {result.get('success')}")
            print(f"💬 Message: {result.get('message')}")
            
            content = result.get('content', {})
            print(f"💡 Concept: {content.get('concept', 'N/A')[:100]}...")
            print(f"📚 Examples: {len(content.get('examples', []))} examples")
            print(f"❓ Questions: {len(content.get('questions', []))} questions")
            
            # Show first question
            questions = content.get('questions', [])
            if questions:
                q = questions[0]
                print(f"\n📋 First Question: {q.get('question')}")
                for i, opt in enumerate(q.get('options', [])):
                    mark = "✓" if opt.get('is_correct') else " "
                    print(f"   {chr(65+i)}. [{mark}] {opt.get('option')}")
                
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Details: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_topic_suggestions():
    """Test topic suggestions endpoint"""
    print("\n🔄 Testing topic suggestions...")
    try:
        response = requests.get(f"{BASE_URL}/topics/suggestions")
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📚 Total topics available: {data.get('total_topics')}")
            categories = data.get('categories', {})
            for category, topics in categories.items():
                print(f"📂 {category.title()}: {len(topics)} topics")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_difficulties():
    """Test difficulty levels endpoint"""
    print("\n🔄 Testing difficulty levels...")
    try:
        response = requests.get(f"{BASE_URL}/difficulties")
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            levels = data.get('levels', {})
            for level, info in levels.items():
                print(f"📊 {level.title()}: {info.get('description')}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 FastAPI Educational Content Generator Tests")
    print("=" * 50)
    
    # Test basic endpoints first
    health_ok = test_health()
    if not health_ok:
        print("\n❌ Health check failed. Please:")
        print("1. Start the server: python main.py")
        print("2. Check your .env file has GEMINI_API_KEY")
        return
    
    root_ok = test_root()
    
    # Test additional endpoints
    if health_ok and root_ok:
        test_topic_suggestions()
        test_difficulties()
        test_generate_content()
    
    print("\n🎉 Testing completed!")
    print("\n📝 To view interactive docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
