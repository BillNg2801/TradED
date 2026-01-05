const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { connectToDatabase, getDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const courseRoutes = require('./routes/courses');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// SerpApi configuration
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

// Node.js 18+ has built-in fetch
const fetch = globalThis.fetch;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Authentication routes
app.use('/api/auth', authRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Course routes
app.use('/api/courses', courseRoutes);

// Endpoint to save personal stats (temporary - before auth)
app.post('/api/save-stats-temp', async (req, res) => {
    try {
        const surveyData = req.body;
        
        // Just acknowledge receipt - will be saved after authentication
        res.json({ success: true, message: 'Survey data received' });
    } catch (error) {
        console.error('Error saving temporary stats:', error);
        res.status(500).json({ success: false, message: 'Error saving survey data' });
    }
});

// Endpoint to save personal stats (authenticated - links to user account)
app.post('/api/save-stats', authenticate, async (req, res) => {
    try {
        const surveyData = req.body;
        const authenticatedUserId = req.user.userId; // Get userId from authenticated user
        
        // Save to MongoDB
        try {
            const db = await getDatabase();
            const collection = db.collection('personalStats');
            
            // Create document with timestamp - use authenticated user's ID
            const statsDocument = {
                userId: authenticatedUserId, // Use authenticated user ID
                email: req.user.email,
                userName: surveyData.userName || req.user.name,
                screen1: surveyData.screen1,
                screen2: surveyData.screen2,
                screen3: surveyData.screen3 || [],
                screen4: surveyData.screen4,
                screen5: surveyData.screen5,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Use upsert to update if exists, insert if new
            await collection.updateOne(
                { userId: authenticatedUserId },
                { $set: statsDocument },
                { upsert: true }
            );
            
            console.log(`Personal stats saved to MongoDB for authenticated user: ${authenticatedUserId}`);
        } catch (dbError) {
            console.error('Error saving to MongoDB:', dbError);
            // Continue to file backup even if MongoDB fails
        }
        
        // Also save to file as backup (optional - you can remove this if you only want MongoDB)
        try {
            // Format the data
            let content = `${surveyData.userId}\n\n`;
            
            content += `Name: ${surveyData.userName}\n`;
            content += `\n`;
            content += `Screen 1 - What do you want to study?\n`;
            content += `Answer: ${surveyData.screen1}\n`;
            content += `\n`;
            content += `Screen 2 - How confident do you feel about managing your personal finances?\n`;
            content += `Answer: ${surveyData.screen2}\n`;
            content += `\n`;
            // Get the correct Screen 3 question based on study choice
            let screen3Question = 'What are your main financial goals for the next 1–3 years?';
            if (surveyData.screen1 === 'Investing') {
                screen3Question = 'What are your main investing goals for the next 1–3 years?';
            } else if (surveyData.screen1 === 'Quant Finance') {
                screen3Question = 'What are your main goals in quantitative finance?';
            } else if (surveyData.screen1 === 'Career & Professional Finance') {
                screen3Question = 'What are your main professional finance goals?';
            }
            
            content += `Screen 3 - ${screen3Question}\n`;
            content += `Answer:\n`;
            if (surveyData.screen3 && surveyData.screen3.length > 0) {
                surveyData.screen3.forEach((goal, index) => {
                    content += `  ${index + 1}. ${goal}\n`;
                });
            } else {
                content += `  (No goals selected)\n`;
            }
            content += `\n`;
            content += `Screen 4 - Which description best matches your current situation?\n`;
            content += `Answer: ${surveyData.screen4}\n`;
            content += `\n`;
            content += `Screen 5 - How do you prefer to learn?\n`;
            content += `Answer: ${surveyData.screen5}\n`;
            
            // Save to personal stats.txt file inside personal data folder
            const folderPath = path.join(__dirname, 'personal data');
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const filePath = path.join(folderPath, 'personal stats.txt');
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (fileError) {
            console.error('Error saving to file:', fileError);
        }
        
        res.json({ success: true, message: 'Personal stats saved successfully' });
    } catch (error) {
        console.error('Error saving personal stats:', error);
        res.status(500).json({ success: false, message: 'Error saving personal stats' });
    }
});

// Endpoint to get personal stats by userId (requires authentication)
app.get('/api/get-stats/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const authenticatedUserId = req.user.userId;
        
        // Ensure user can only access their own stats
        if (userId !== authenticatedUserId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }
        
        const db = await getDatabase();
        const collection = db.collection('personalStats');
        
        const userStats = await collection.findOne({ userId: userId });
        
        if (!userStats) {
            return res.status(404).json({ success: false, message: 'User stats not found' });
        }
        
        // Remove MongoDB _id field for cleaner response
        delete userStats._id;
        
        res.json({ success: true, data: userStats });
    } catch (error) {
        console.error('Error retrieving personal stats:', error);
        res.status(500).json({ success: false, message: 'Error retrieving personal stats' });
    }
});

// Helper function to fetch events from SerpApi Google Events
async function fetchSerpApiEvents() {
    if (!SERPAPI_KEY) {
        console.error('SerpApi key not configured');
        return [];
    }

    try {
        // Use location-based queries for trading/market events
        // Try multiple major cities to get more results
        const queries = [
            'trading events in New York',
            'day trading conference in San Francisco',
            'stock market events in Chicago',
            'forex trading events in Boston',
            'trading workshop in Los Angeles'
        ];
        
        // Try queries until we get results
        let events = [];
        for (const query of queries) {
            const url = `https://serpapi.com/search.json?engine=google_events&q=${encodeURIComponent(query)}&hl=en&gl=us&htichips=date:next_month&api_key=${SERPAPI_KEY}`;
            
            console.log('Fetching events from SerpApi Google Events...');
            console.log('Query:', query);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.log(`Query "${query}" failed with status ${response.status}`);
                continue;
            }

            const data = await response.json();
            
            if (data.error) {
                console.log(`Query "${query}" returned error:`, data.error);
                continue;
            }
            
            if (data.events_results && data.events_results.length > 0) {
                console.log(`Query "${query}" found ${data.events_results.length} events`);
                events = data.events_results;
                break; // Use first successful query
            }
        }
        
        if (events.length === 0) {
            console.log('No events found from any query');
            return [];
        }
        
        console.log(`Processing ${events.length} events`);
        
        // Transform SerpApi Google Events to our format
        const transformedEvents = events.slice(0, 15).map(event => {
            // Handle date formatting
            let dateStr = 'Date TBA';
            if (event.date) {
                if (event.date.when) {
                    dateStr = event.date.when;
                } else if (event.date.start_date) {
                    dateStr = event.date.start_date;
                    if (event.date.start_time) {
                        dateStr += ` • ${event.date.start_time}`;
                    }
                }
            }

            // Handle location - prefer address, fallback to venue
            let location = 'Location TBA';
            if (event.address && Array.isArray(event.address) && event.address.length > 0) {
                location = event.address.join(', ');
            } else if (event.venue && event.venue.name) {
                location = event.venue.name;
            } else if (event.address && typeof event.address === 'string') {
                location = event.address;
            }

            // Handle description
            const description = event.description || event.snippet || '';

            // Handle link
            const link = event.link || event.serpapi_link || '#';

            return {
                title: event.title || 'Untitled Event',
                date: dateStr,
                description: description,
                location: location,
                link: link,
                source: 'Google Events',
                speaker: location // Using location as speaker field for display
            };
        });

        console.log(`Successfully processed ${transformedEvents.length} events`);
        return transformedEvents;
    } catch (error) {
        console.error('Error fetching SerpApi events:', error.message);
        return [];
    }
}

// Events endpoint
app.get('/api/events', async (req, res) => {
    try {
        const events = await fetchSerpApiEvents();
        res.json({ events });
    } catch (error) {
        console.error('Error in /api/events:', error);
        res.json({ events: [] });
    }
});

// Initialize courses (one-time generation)
async function initializeCourses() {
    try {
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');
        
        // Check if the day trading course already exists
        const existingCourse = await coursesCollection.findOne({ 
            name: 'Day Trading Fundamentals' 
        });
        
        if (!existingCourse) {
            console.log('\n========================================');
            console.log('Generating comprehensive Day Trading Fundamentals course...');
            console.log('This is a one-time process. Please wait...');
            console.log('========================================\n');
            
            const { generateDayTradingCourse, saveCourse } = require('./services/courseGenerator');
            
            // Generate ONE comprehensive course
            const course = await generateDayTradingCourse();
            const courseId = await saveCourse(course);
            
            console.log('\n========================================');
            console.log('✓ Course generation complete!');
            console.log(`✓ Course saved with ID: ${courseId}`);
            console.log(`✓ Modules created: ${course.modules.length}`);
            console.log(`✓ Total lessons: ${course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}`);
            console.log('========================================\n');
        } else {
            console.log('\n✓ Day Trading Fundamentals course already exists');
            console.log(`✓ Course ID: ${existingCourse._id}`);
            console.log(`✓ Modules: ${existingCourse.modules.length}`);
            console.log(`✓ Total lessons: ${existingCourse.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)}\n`);
        }
    } catch (error) {
        console.error('Error initializing courses:', error);
        // Don't crash server if course generation fails
        console.log('Continuing server startup despite course initialization error...\n');
    }
}

// Connect to MongoDB and start server
async function startServer() {
    try {
        // Connect to MongoDB
        await connectToDatabase();
        console.log('MongoDB connection established');
        
        // Initialize ONE course (only if it doesn't exist)
        await initializeCourses();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    const { closeDatabase } = require('./config/database');
    await closeDatabase();
    process.exit(0);
});

// Start the server
startServer();

