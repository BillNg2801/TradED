// Vercel serverless function entry point
// This imports the Express app from backend/server.js
const path = require('path');

// Use absolute path to ensure it works in Vercel
const app = require(path.join(__dirname, '../backend/server.js'));

module.exports = app;

