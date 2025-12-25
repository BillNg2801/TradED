const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');

// Directly fetch premade course based on user's survey data
router.get('/user/custom', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`[Courses] Fetching premade course for user: ${userId}`);
        
        const db = await getDatabase();
        const personalStatsCollection = db.collection('personalStats');
        const coursesCollection = db.collection('courses');

        // Get user's survey data
        const stats = await personalStatsCollection.findOne({ userId });
        
        if (!stats) {
            console.log(`[Courses] No survey data found for user ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'Please complete the survey first.'
            });
        }

        // Extract level and pace from survey
        const level = stats.screen2; // Beginner / Intermediate / Advanced
        const paceStr = stats.screen5; // "5 lessons", "10 lessons", etc.
        
        if (!level || !paceStr) {
            console.log(`[Courses] Missing survey data: screen2="${level}", screen5="${paceStr}"`);
            return res.status(400).json({
                success: false,
                message: 'Survey incomplete. Please complete all survey screens.'
            });
        }
        
        const count = parseInt(paceStr.toString().match(/\d+/)?.[0] || '20', 10);
        
        console.log(`[Courses] User survey: level="${level}", pace="${paceStr}" → lessonCount=${count}`);

        // Find exact premade match
        let premade = await coursesCollection.findOne({
            type: 'premade',
            confidenceLevel: level,
            lessonCount: count
        });

        if (premade) {
            console.log(`[Courses] ✅ Found exact match: ${premade.name} (${premade.lessons?.length || 0} lessons)`);
            return res.json({ success: true, course: premade });
        }

        // Fallback: same lessonCount, any level
        console.log(`[Courses] No exact match for ${level}/${count}, trying fallback by lessonCount...`);
        premade = await coursesCollection.findOne({
            type: 'premade',
            lessonCount: count
        });
        
        if (premade) {
            console.log(`[Courses] ✅ Found fallback: ${premade.name} (${premade.lessons?.length || 0} lessons)`);
            return res.json({ success: true, course: premade });
        }

        // Last resort: any premade
        premade = await coursesCollection.findOne({ type: 'premade' });
        if (premade) {
            console.log(`[Courses] ✅ Found any premade: ${premade.name} (${premade.lessons?.length || 0} lessons)`);
            return res.json({ success: true, course: premade });
        }
        
        // No premades exist at all
        console.error(`[Courses] ERROR: No premade courses found in database!`);
        return res.status(404).json({
            success: false,
            message: 'No courses available. Please contact support.'
        });
    } catch (error) {
        console.error('[Courses] Error in /api/courses/user/custom:', error);
        return res.status(500).json({
            success: false,
            message: 'Error loading course: ' + error.message
        });
    }
});

module.exports = router;


