const { verifyToken } = require('../utils/auth');
const { getDatabase } = require('../config/database');

/**
 * Middleware to authenticate requests using JWT
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
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

        // Get user from database and attach to request
        const db = await getDatabase();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Attach user info to request (without password)
        req.user = {
            userId: user.userId,
            email: user.email,
            name: user.name
        };

        next();
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error authenticating request' 
        });
    }
}

module.exports = { authenticate };

