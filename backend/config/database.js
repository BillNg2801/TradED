const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string - MUST be set in environment variables
if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required. Please set it in your .env file.');
}
const uri = process.env.MONGODB_URI;

// Database name
const dbName = process.env.MONGODB_DB_NAME || 'FinEdu';

// Create a new MongoClient
const client = new MongoClient(uri);

// Database connection instance
let db = null;

// Connect to MongoDB
async function connectToDatabase() {
    try {
        if (db) {
            return db;
        }

        // Connect to the MongoDB cluster
        await client.connect();
        console.log('Connected to MongoDB successfully');

        // Get the database
        db = client.db(dbName);
        return db;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
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

