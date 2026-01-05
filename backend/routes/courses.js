const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
const { callOpenAIChatbot } = require('../services/openaiService');

// Fetch ultimate course based ONLY on pace (lessonCount) from survey
router.get('/user/custom', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`[Courses] Fetching ultimate course for user: ${userId}`);
        
        const db = await getDatabase();
        const personalStatsCollection = db.collection('personalStats');
        const coursesCollection = db.collection('courses');

        // Get user's survey data AND quiz progress
        const stats = await personalStatsCollection.findOne({ userId }, { 
            projection: { screen5: 1, quizProgress: 1 } 
        });
        
        if (!stats) {
            console.log(`[Courses] No survey data found for user ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'Please complete the survey first.'
            });
        }

        // Extract ONLY pace from survey (ignore confidenceLevel)
        const paceStr = stats.screen5; // "5 lessons", "10 lessons", etc.
        
        if (!paceStr) {
            console.log(`[Courses] Missing pace data: screen5="${paceStr}"`);
            return res.status(400).json({
                success: false,
                message: 'Survey incomplete. Please complete all survey screens.'
            });
        }
        
        // Improved parsing with better logging
        const match = paceStr.toString().match(/\d+/);
        const count = match ? parseInt(match[0], 10) : null;
        
        console.log(`[Courses] Raw paceStr: "${paceStr}", Parsed count: ${count}`);
        
        if (!count || isNaN(count)) {
            console.error(`[Courses] ERROR: Could not parse lesson count from "${paceStr}"`);
            return res.status(400).json({
                success: false,
                message: 'Invalid course pace selection. Please complete the survey again.'
            });
        }

        // Find ultimate course by pace ONLY (no confidenceLevel)
        const ultimateCourse = await coursesCollection.findOne({
            type: 'ultimate',
            lessonCount: count
        });

        if (ultimateCourse) {
            console.log(`[Courses] ✅ Found exact match: ${ultimateCourse.name} (${ultimateCourse.lessonCount || ultimateCourse.lessons?.length || 0} lessons)`);
            return res.json({ 
                success: true, 
                course: ultimateCourse,
                quizProgress: stats?.quizProgress || {} // Return quiz progress
            });
        }

        // Fallback: find closest match (if exact match not found)
        console.log(`[Courses] ⚠️  No exact match for ${count} lessons, searching for closest match...`);
        const allUltimateCourses = await coursesCollection.find({ type: 'ultimate' }).toArray();
        
        if (allUltimateCourses.length > 0) {
            // Find the closest match by lesson count
            const sorted = allUltimateCourses.sort((a, b) => {
                const aCount = a.lessonCount || a.lessons?.length || 0;
                const bCount = b.lessonCount || b.lessons?.length || 0;
                const aDiff = Math.abs(aCount - count);
                const bDiff = Math.abs(bCount - count);
                return aDiff - bDiff;
            });
            
            const bestMatch = sorted[0];
            const bestMatchCount = bestMatch.lessonCount || bestMatch.lessons?.length || 0;
            console.log(`[Courses] ✅ Found closest match: ${bestMatch.name} (${bestMatchCount} lessons, requested: ${count})`);
            return res.json({ 
                success: true, 
                course: bestMatch,
                quizProgress: stats?.quizProgress || {} // Return quiz progress
            });
        }

        // No ultimate courses exist
        console.error(`[Courses] ERROR: No ultimate courses found in database!`);
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

// Fetch ultimate quizzes based on user's course pace (quizzes are already generated)
router.get('/quizzes/user/custom', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`[Quizzes] Fetching quizzes for user: ${userId}`);
        
        const db = await getDatabase();
        const personalStatsCollection = db.collection('personalStats');
        const quizzesCollection = db.collection('UltimateQuizzes');
        const coursesCollection = db.collection('courses');

        // Parallel queries: Get user stats (including quizProgress) and find all ultimate courses simultaneously
        const [stats, allUltimateCourses] = await Promise.all([
            personalStatsCollection.findOne({ userId }, { projection: { screen5: 1, quizProgress: 1 } }),
            coursesCollection.find({ type: 'ultimate' }, { projection: { _id: 1, lessonCount: 1 } }).toArray()
        ]);
        
        if (!stats) {
            return res.status(404).json({
                success: false,
                message: 'Please complete the survey first.'
            });
        }

        // Extract pace from survey (screen5: "5 lessons", "10 lessons", etc.)
        const paceStr = stats.screen5;
        const match = paceStr.toString().match(/\d+/);
        const pace = match ? parseInt(match[0], 10) : null;
        
        if (!pace || ![5, 10, 15, 20].includes(pace)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course pace. Please complete the survey again.'
            });
        }

        console.log(`[Quizzes] User pace: ${pace}`);

        // Find course for this pace (from already fetched courses)
        const course = allUltimateCourses.find(c => c.lessonCount === pace);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'No course found for your selected pace.'
            });
        }

        console.log(`[Quizzes] Found course ID: ${course._id}`);

        // Match quiz pack by courseId and pace (quizzes are already generated)
        // Only return needed fields to reduce payload size
        const quizPack = await quizzesCollection.findOne({
            courseId: course._id,
            pace: pace
        }, {
            projection: { _id: 1, pace: 1, quizzes: 1 }
        });

        if (!quizPack || !quizPack.quizzes || quizPack.quizzes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No quizzes available for your course pace. Quizzes may not have been generated yet.'
            });
        }

        // Sort quizzes by quizNumber (1, 2, 3, ...)
        const sortedQuizzes = quizPack.quizzes.sort((a, b) => a.quizNumber - b.quizNumber);

        console.log(`[Quizzes] ✅ Found ${sortedQuizzes.length} quizzes for pace ${pace}`);

        return res.json({
            success: true,
            quizzes: sortedQuizzes,
            pace: pace,
            quizProgress: stats?.quizProgress || {} // Return quiz progress for this user
        });
    } catch (error) {
        console.error('[Quizzes] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error loading quizzes: ' + error.message
        });
    }
});

// Save quiz progress endpoint (passed status + user's selected answers)
router.post('/quizzes/progress', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { quizNumber, pace, passed, answers } = req.body;
        
        if (quizNumber === undefined || !pace || passed === undefined || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: 'Quiz number, pace, passed status, and answers array are required'
            });
        }
        
        const db = await getDatabase();
        const personalStatsCollection = db.collection('personalStats');
        
        // Get current quiz progress or initialize empty object
        const stats = await personalStatsCollection.findOne({ userId });
        const currentProgress = stats?.quizProgress || {};
        
        console.log(`[Quiz Progress] Before save - User: ${userId}, Quiz: ${quizNumber}, Current progress:`, JSON.stringify(currentProgress));
        
        // Update progress for this quiz
        currentProgress[quizNumber.toString()] = {
            passed: passed,
            answers: answers, // User's actual selected answers (array of indices)
            pace: pace,
            completedAt: new Date()
        };
        
        console.log(`[Quiz Progress] After update - New progress:`, JSON.stringify(currentProgress));
        
        // Update personalStats with quiz progress
        const updateResult = await personalStatsCollection.updateOne(
            { userId },
            { 
                $set: { 
                    quizProgress: currentProgress,
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );
        
        console.log(`[Quiz Progress] ✅ Saved to MongoDB - User: ${userId}, Quiz: ${quizNumber}, Passed: ${passed}, Modified: ${updateResult.modifiedCount}, Matched: ${updateResult.matchedCount}`);
        
        // Verify the save by fetching it back
        const verifyStats = await personalStatsCollection.findOne({ userId }, { projection: { quizProgress: 1 } });
        console.log(`[Quiz Progress] Verification - Fetched back:`, JSON.stringify(verifyStats?.quizProgress));
        
        return res.json({
            success: true,
            quizProgress: currentProgress
        });
    } catch (error) {
        console.error('[Quizzes] Error saving quiz progress:', error);
        return res.status(500).json({
            success: false,
            message: 'Error saving quiz progress: ' + error.message
        });
    }
});

// Course chatbot endpoint
router.post('/chatbot', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { message, conversationHistory = [], currentLesson = null } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const db = await getDatabase();
        const personalStatsCollection = db.collection('personalStats');
        const coursesCollection = db.collection('courses');

        // Get user's pace from survey
        const stats = await personalStatsCollection.findOne({ userId }, { projection: { screen5: 1 } });
        if (!stats || !stats.screen5) {
            return res.status(404).json({
                success: false,
                message: 'Please complete the survey first.'
            });
        }

        // Extract pace
        const paceStr = stats.screen5;
        const match = paceStr.toString().match(/\d+/);
        const pace = match ? parseInt(match[0], 10) : null;

        if (!pace || ![5, 10, 15, 20].includes(pace)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course pace.'
            });
        }

        // Get course for this pace (only need lesson count and titles for context)
        const course = await coursesCollection.findOne({
            type: 'ultimate',
            lessonCount: pace
        }, {
            projection: { lessons: 1, lessonCount: 1 }
        });

        if (!course || !course.lessons) {
            return res.status(404).json({
                success: false,
                message: 'Course not found for your selected pace.'
            });
        }

        // Build course context - use current lesson if available, otherwise use lesson titles only
        let courseContext;
        
        if (currentLesson && currentLesson.content) {
            // Use only the current lesson's content to reduce token usage
            const lessonTitle = currentLesson.topic || 'Current Lesson';
            const lessonContent = currentLesson.content;
            
            // Truncate lesson content if too long (keep first 8000 characters)
            const truncatedContent = lessonContent.length > 8000 
                ? lessonContent.substring(0, 8000) + '\n\n[Content truncated for context...]'
                : lessonContent;
            
            courseContext = `You are a helpful course assistant for a day trading fundamentals course. The user is currently viewing a lesson. Here is the content of the current lesson:\n\n=== ${lessonTitle} ===\n${truncatedContent}\n\nCRITICAL INSTRUCTIONS:\n1. You can ONLY answer questions based on the current lesson content provided above.\n2. If asked about something not in this lesson, politely say that it's not covered in the current lesson.\n3. ALWAYS keep your answers SHORT and CONCISE - aim for 2-4 sentences maximum unless the user explicitly asks for a detailed explanation.\n4. Get straight to the point - no fluff, no lengthy introductions, no unnecessary context.\n5. If the answer can be given in one sentence, do so.`;
        } else {
            // Fallback: use lesson titles only (much smaller context)
            const lessonTitles = course.lessons.map((lesson, index) => {
                return `${index + 1}. ${lesson.topic || lesson.title || `Lesson ${index + 1}`}`;
            }).join('\n');
            
            courseContext = `You are a helpful course assistant for a day trading fundamentals course. The course has ${course.lessons.length} lessons:\n\n${lessonTitles}\n\nCRITICAL INSTRUCTIONS:\n1. You can answer general questions about day trading fundamentals.\n2. If asked about specific lesson content, politely say that you need the user to open that lesson first.\n3. ALWAYS keep your answers SHORT and CONCISE - aim for 2-4 sentences maximum unless the user explicitly asks for a detailed explanation.\n4. Get straight to the point - no fluff, no lengthy introductions, no unnecessary context.\n5. If the answer can be given in one sentence, do so.`;
        }

        // Build conversation messages
        // Ensure conversationHistory is an array
        const safeHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
        
        const messages = [
            {
                role: 'system',
                content: courseContext
            },
            ...safeHistory,
            {
                role: 'user',
                content: message
            }
        ];

        // Call OpenAI
        const response = await callOpenAIChatbot(messages, {
            model: 'gpt-4o',
            temperature: 0.5,
            max_tokens: 300
        });

        return res.json({
            success: true,
            response: response
        });

    } catch (error) {
        console.error('[Chatbot] Error:', error);
        console.error('[Chatbot] Error stack:', error.stack);
        console.error('[Chatbot] Request details:', {
            userId: req.user?.userId,
            message: req.body?.message,
            conversationHistoryLength: req.body?.conversationHistory?.length
        });
        return res.status(500).json({
            success: false,
            message: 'Error processing chatbot request: ' + error.message
        });
    }
});

module.exports = router;


