const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get all messages (paginated, sorted by newest first)
router.get('/messages', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50; // Default 50 messages
        const skip = parseInt(req.query.skip) || 0;
        
        const db = await getDatabase();
        const messagesCollection = db.collection('messages');
        
        // Get messages sorted by timestamp (newest first)
        const messages = await messagesCollection
            .find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .toArray();
        
        // Reverse to show oldest first (chronological order)
        const reversedMessages = messages.reverse();
        
        // Remove MongoDB _id and format response
        const formattedMessages = reversedMessages.map(msg => ({
            messageId: msg.messageId,
            userId: msg.userId,
            userName: msg.userName,
            message: msg.message,
            timestamp: msg.timestamp
        }));
        
        res.json({
            success: true,
            messages: formattedMessages,
            count: formattedMessages.length
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
});

// Send a new message
router.post('/messages', authenticate, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.userId;
        const userName = req.user.name;
        
        // Validate message
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }
        
        // Limit message length
        if (message.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Message is too long (max 500 characters)'
            });
        }
        
        // Generate unique message ID
        const messageId = generateMessageId();
        const timestamp = new Date();
        
        // Create message document
        const messageDoc = {
            messageId: messageId,
            userId: userId,
            userName: userName,
            message: message.trim(),
            timestamp: timestamp,
            createdAt: timestamp
        };
        
        // Save to database
        const db = await getDatabase();
        const messagesCollection = db.collection('messages');
        await messagesCollection.insertOne(messageDoc);
        
        // Return the created message
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                messageId: messageDoc.messageId,
                userId: messageDoc.userId,
                userName: messageDoc.userName,
                message: messageDoc.message,
                timestamp: messageDoc.timestamp
            }
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
});

// Helper function to generate unique message ID
function generateMessageId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let messageId = '';
    const timestamp = Date.now().toString(36);
    for (let i = 0; i < 6; i++) {
        messageId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `MSG_${timestamp}_${messageId}`;
}

module.exports = router;

