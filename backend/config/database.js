const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string - MUST be set in environment variables
if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required. Please set it in your .env file.');
}
const uri = process.env.MONGODB_URI;

// Database name
const dbName = process.env.MONGODB_DB_NAME || 'FinEdu';

// MongoClient options optimized for serverless environments (Vercel)
const clientOptions = {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    connectTimeoutMS: 10000, // Give up initial connection after 10s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 1, // Maintain at least 1 socket connection
    maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
    retryWrites: true, // Enable retryable writes
    retryReads: true, // Enable retryable reads
    // TLS/SSL options - ensure proper TLS handling for serverless
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
};

// Create a new MongoClient with serverless-optimized options
const client = new MongoClient(uri, clientOptions);

// Database connection instance
let db = null;

// Connect to MongoDB
async function connectToDatabase() {
    try {
        // For serverless (Vercel), reuse connection if available
        // MongoClient handles connection pooling internally
        if (!db) {
            // Connect to the MongoDB cluster
            await client.connect();
            console.log('Connected to MongoDB successfully');
            
            // Get the database
            db = client.db(dbName);
        }
        
        return db;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        // Reset connection state on error
        db = null;
        throw error;
    }
}

// Get database instance (for use in other files)
async function getDatabase() {
    if (!db) {
        await connectToDatabase();
    }
    return db;
}

// Close database connection
async function closeDatabase() {
    try {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed');
            db = null;
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        throw error;
    }
}

module.exports = {
    connectToDatabase,
    getDatabase,
    closeDatabase
};

