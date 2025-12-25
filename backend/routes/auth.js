const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { 
    hashPassword, 
    comparePassword, 
    generateToken, 
    verifyToken,
    isValidEmail, 
    validatePassword 
} = require('../utils/auth');

// Sign up endpoint
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, password, and name are required' 
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ 
                success: false, 
                message: passwordValidation.message 
            });
        }

        // Check if user already exists
        const db = await getDatabase();
        const usersCollection = db.collection('users');
        
        const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Generate unique userId
        const userId = generateUserId();

        // Create user document
        const userDoc = {
            userId: userId,
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Save user to database
        await usersCollection.insertOne(userDoc);

        // Generate JWT token
        const token = generateToken({ userId: userDoc.userId, email: userDoc.email });

        // Remove password from response
        delete userDoc.password;

        res.json({
            success: true,
            message: 'Account created successfully',
            token: token,
            user: {
                userId: userDoc.userId,
                email: userDoc.email,
                name: userDoc.name
            }
        });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating account. Please try again.' 
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user
        const db = await getDatabase();
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Update last login
        await usersCollection.updateOne(
            { userId: user.userId },
            { $set: { lastLogin: new Date(), updatedAt: new Date() } }
        );

        // Generate JWT token
        const token = generateToken({ userId: user.userId, email: user.email });

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error logging in. Please try again.' 
        });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        // Get user from database
        const db = await getDatabase();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying authentication' 
        });
    }
});

// Helper function to generate unique userId
function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let userId = '';
    for (let i = 0; i < 8; i++) {
        userId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return userId;
}

module.exports = router;

