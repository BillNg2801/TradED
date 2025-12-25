const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb+srv://mailtobin05_db_user:09F64qt3mWnA1jt4@cluster0.i6eenlx.mongodb.net/?appName=Cluster0';

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

