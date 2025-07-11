const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
    console.log('🔍 Testing MongoDB Atlas connection...');
    console.log(`📍 Connection URI: ${process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
    
    try {
        // Test connection
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Atlas connection successful!');
        console.log(`🏠 Connected to host: ${conn.connection.host}`);
        console.log(`📊 Database name: ${conn.connection.name}`);
        console.log(`🔗 Connection state: ${conn.connection.readyState}`);
        
        // Test database operations
        const testCollection = conn.connection.db.collection('test');
        const testDoc = { message: 'Hello MongoDB!', timestamp: new Date() };
        const result = await testCollection.insertOne(testDoc);
        console.log('✅ Test document inserted successfully');
        
        // Clean up test document
        await testCollection.deleteOne({ _id: result.insertedId });
        console.log('✅ Test document cleaned up');
        
        await mongoose.disconnect();
        console.log('✅ Connection closed successfully');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.message.includes('authentication failed')) {
            console.error('\n💡 Authentication troubleshooting:');
            console.error('   1. Check username and password in MongoDB Atlas');
            console.error('   2. Ensure the user has access to the "edu" database');
            console.error('   3. Check if IP address is whitelisted');
            console.error('   4. Verify the cluster is running');
        }
        
        if (error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Network troubleshooting:');
            console.error('   1. Check internet connection');
            console.error('   2. Verify cluster hostname');
            console.error('   3. Check firewall settings');
        }
        
        process.exit(1);
    }
}

// Run the test
testMongoConnection();
