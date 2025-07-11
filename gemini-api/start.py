"""
Simple startup script for the Educational Content Generator API
"""
import subprocess
import sys
import os
from pathlib import Path

def install_dependencies():
    """Install required packages"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_env():
    """Check environment configuration"""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found!")
        return False
    
    # Check if API key is properly set
    with open(".env", "r") as f:
        content = f.read()
        if "GEMINI_API_KEY=" in content and "your_api_key_here" not in content:
            lines = content.split('\n')
            for line in lines:
                if line.startswith('GEMINI_API_KEY='):
                    key = line.split('=', 1)[1].strip()
                    if key and len(key) > 10:
                        print("✅ API key configured")
                        return True
    
    print("❌ Please set your GEMINI_API_KEY in .env file")
    return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting FastAPI server...")
    print("📚 API will be available at: http://localhost:8000")
    print("📖 Interactive docs: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([sys.executable, "main.py"])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

def main():
    """Main startup function"""
    print("🎓 Educational Content Generator API - Startup")
    print("=" * 45)
    
    # Check current directory
    if not Path("main.py").exists():
        print("❌ main.py not found. Please run this from the correct directory.")
        return
    
    print("1. Installing dependencies...")
    if not install_dependencies():
        return
    
    print("\n2. Checking environment...")
    if not check_env():
        print("Please configure your .env file with a valid GEMINI_API_KEY")
        return
    
    print("\n3. Starting server...")
    start_server()

if __name__ == "__main__":
    main()
