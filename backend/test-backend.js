/**
 * Test script for Express.js backend
 * Run this to test all API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test functions
async function testHealthEndpoint() {
    console.log('🔄 Testing health endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health Status:', response.data.status);
        console.log('📊 Database:', response.data.database);
        console.log('🤖 Gemini API:', response.data.gemini_api);
        return true;
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return false;
    }
}

async function testRootEndpoint() {
    console.log('\n🔄 Testing root endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/`);
        console.log('✅ Root response:', response.data.message);
        return true;
    } catch (error) {
        console.log('❌ Root endpoint failed:', error.message);
        return false;
    }
}

async function testGenerateContent() {
    console.log('\n🔄 Testing content generation...');
    try {
        const testData = {
            topic: 'Test Topic - Photosynthesis',
            difficulty: 'beginner'
        };

        const response = await axios.post(`${BASE_URL}/api/generate`, testData);
        console.log('✅ Content generated successfully!');
        console.log('📝 Topic:', response.data.data.topic);
        console.log('📊 Difficulty:', response.data.data.difficulty);
        console.log('💡 Concept length:', response.data.data.concept.length, 'characters');
        console.log('📚 Examples:', response.data.data.examples.length);
        console.log('❓ Questions:', response.data.data.questions.length);
        return response.data.data._id;
    } catch (error) {
        console.log('❌ Content generation failed:', error.response?.data?.error || error.message);
        return null;
    }
}

async function testGetAllContent() {
    console.log('\n🔄 Testing get all content...');
    try {
        const response = await axios.get(`${BASE_URL}/api/content`);
        console.log('✅ Retrieved content successfully!');
        console.log('📊 Total items:', response.data.data.length);
        console.log('📄 Pagination:', response.data.pagination);
        return true;
    } catch (error) {
        console.log('❌ Get content failed:', error.message);
        return false;
    }
}

async function testGetContentById(contentId) {
    if (!contentId) return false;
    
    console.log('\n🔄 Testing get content by ID...');
    try {
        const response = await axios.get(`${BASE_URL}/api/content/${contentId}`);
        console.log('✅ Retrieved content by ID successfully!');
        console.log('📝 Topic:', response.data.data.topic);
        return true;
    } catch (error) {
        console.log('❌ Get content by ID failed:', error.message);
        return false;
    }
}

async function testUpdateContent(contentId) {
    if (!contentId) return false;
    
    console.log('\n🔄 Testing update content...');
    try {
        const updateData = {
            concept: 'Updated concept for testing purposes'
        };

        const response = await axios.put(`${BASE_URL}/api/content/${contentId}`, updateData);
        console.log('✅ Content updated successfully!');
        console.log('💬 Message:', response.data.message);
        return true;
    } catch (error) {
        console.log('❌ Update content failed:', error.message);
        return false;
    }
}

// Main test function
async function runAllTests() {
    console.log('🧪 Express.js Backend API Tests');
    console.log('=' * 40);

    // Test basic endpoints
    const healthOk = await testHealthEndpoint();
    if (!healthOk) {
        console.log('\n❌ Backend server is not running or unhealthy');
        console.log('Please start the server with: npm run dev');
        return;
    }

    await testRootEndpoint();
    await testGetAllContent();

    // Test content generation (requires Gemini API)
    console.log('\n🤖 Testing Gemini API integration...');
    const contentId = await testGenerateContent();
    
    if (contentId) {
        await testGetContentById(contentId);
        await testUpdateContent(contentId);
        
        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        try {
            await axios.delete(`${BASE_URL}/api/content/${contentId}`);
            console.log('✅ Test data cleaned up successfully');
        } catch (error) {
            console.log('⚠️  Could not clean up test data:', error.message);
        }
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Start Gemini API (FastAPI): python main.py');
    console.log('3. Start Express backend: npm run dev');
    console.log('4. Run tests: node test-backend.js');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('❌ Unhandled Promise Rejection:', err.message);
    process.exit(1);
});

// Run tests
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testHealthEndpoint,
    testGenerateContent,
    testGetAllContent
};
