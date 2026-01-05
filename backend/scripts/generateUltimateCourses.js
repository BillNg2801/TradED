require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');
const { condenseLessons, generateLessonNames, structureLessonContent, qualityReviewContent } = require('../services/openaiService');

// Curated day trading images
const DAY_TRADING_IMAGES = [
    {
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        alt: 'Day trader looking at multiple screens',
        caption: 'Day trader analyzing multiple charts on a trading desk'
    },
    {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200',
        alt: 'Candlestick charts on monitor',
        caption: 'Candlestick patterns on a financial market chart'
    },
    {
        url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1200',
        alt: 'Person checking stock prices on laptop',
        caption: 'Reviewing intraday market moves on a trading platform'
    },
    {
        url: 'https://images.unsplash.com/photo-1523287562758-66c7fc58967a?w=1200',
        alt: 'Trader watching price action',
        caption: 'Monitoring short‑term price action during the trading session'
    },
    {
        url: 'https://images.unsplash.com/photo-1518186233392-c232efbf2373?w=1200',
        alt: 'Team discussing market strategy',
        caption: 'Discussing risk and trade ideas in a trading office'
    },
    {
        url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200',
        alt: 'Charts and financial data on screen',
        caption: 'Visualizing market data and indicators for day trading'
    }
];

function pickImagesForLesson(index) {
    if (!DAY_TRADING_IMAGES.length) return [];
    const first = DAY_TRADING_IMAGES[index % DAY_TRADING_IMAGES.length];
    const second = DAY_TRADING_IMAGES[(index + 1) % DAY_TRADING_IMAGES.length];
    return [first, second];
}

async function findDefaultCourse() {
    const db = await getDatabase();
    const coursesCollection = db.collection('courses');
    
    // Find the default 21-lesson course
    const defaultCourse = await coursesCollection.findOne({
        name: 'Day Trading Fundamentals',
        $or: [
            { type: { $exists: false } },
            { type: { $ne: 'premade' } },
            { type: { $ne: 'ultimate' } }
        ]
    });
    
    if (!defaultCourse) {
        throw new Error('Default "Day Trading Fundamentals" course not found in MongoDB');
    }
    
    // Extract all lessons from modules or flat array
    let allLessons = [];
    if (defaultCourse.modules && Array.isArray(defaultCourse.modules)) {
        defaultCourse.modules.forEach(module => {
            if (module.lessons && Array.isArray(module.lessons)) {
                allLessons = allLessons.concat(module.lessons);
            }
        });
    } else if (defaultCourse.lessons && Array.isArray(defaultCourse.lessons)) {
        allLessons = defaultCourse.lessons;
    }
    
    if (allLessons.length === 0) {
        throw new Error('No lessons found in default course');
    }
    
    console.log(`✅ Found default course with ${allLessons.length} lessons`);
    return allLessons;
}

async function generateUltimateCourse(lessonCount) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Generating Ultimate Course: ${lessonCount} Lessons`);
    console.log('='.repeat(80));
    
    try {
        // 1. Get default course lessons
        const defaultLessons = await findDefaultCourse();
        
        // 2. Condense lessons
        console.log(`\n📦 Step 1: Condensing ${defaultLessons.length} lessons into ${lessonCount} lessons...`);
        const condensedLessons = await condenseLessons(defaultLessons, lessonCount);
        console.log(`✅ Condensed to ${condensedLessons.length} lessons`);
        
        // 3. Generate unique lesson names
        console.log(`\n📝 Step 2: Generating ${lessonCount} unique lesson names...`);
        const lessonNames = await generateLessonNames(lessonCount, condensedLessons);
        
        // Validate no duplicates
        const uniqueNames = new Set(lessonNames.map(n => n.toLowerCase()));
        if (uniqueNames.size !== lessonNames.length) {
            console.log(`⚠️  Warning: Found duplicate names, regenerating...`);
            const newNames = await generateLessonNames(lessonCount, condensedLessons);
            lessonNames.splice(0, lessonNames.length, ...newNames);
        }
        console.log(`✅ Generated ${lessonNames.length} unique lesson names`);
        
        // 4. Structure content and assign names
        console.log(`\n✨ Step 3: Structuring content for ${condensedLessons.length} lessons...`);
        const structuredLessons = [];
        
        for (let i = 0; i < condensedLessons.length; i++) {
            const lesson = condensedLessons[i];
            const lessonName = lessonNames[i] || `Day Trading Lesson ${i + 1}`;
            
            console.log(`   Structuring lesson ${i + 1}/${condensedLessons.length}: ${lessonName}`);
            
            // Structure the content
            const structuredContent = await structureLessonContent(lesson.content);
            
            structuredLessons.push({
                name: lessonName,
                content: structuredContent
            });
            
            // Delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`✅ Structured all ${structuredLessons.length} lessons`);
        
        // 5. Quality review pass
        console.log(`\n🔍 Step 4: Quality review for ${structuredLessons.length} lessons...`);
        const finalLessons = [];
        
        for (let i = 0; i < structuredLessons.length; i++) {
            const lesson = structuredLessons[i];
            
            console.log(`   Reviewing lesson ${i + 1}/${structuredLessons.length}: ${lesson.name}`);
            
            // Quality review
            const reviewedContent = await qualityReviewContent(lesson.content, lesson.name);
            
            // Assign images
            const images = pickImagesForLesson(i);
            
            finalLessons.push({
                topic: lesson.name,
                title: lesson.name,
                content: reviewedContent,
                images: images
            });
            
            // Delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`✅ Quality reviewed all ${finalLessons.length} lessons`);
        
        // 6. Final validation - check for duplicates and content distribution
        const finalNames = finalLessons.map(l => l.topic.toLowerCase());
        const duplicates = finalNames.filter((name, index) => finalNames.indexOf(name) !== index);
        if (duplicates.length > 0) {
            throw new Error(`Duplicate lesson names found: ${[...new Set(duplicates)].join(', ')}`);
        }
        
        // Check content distribution
        const contentLengths = finalLessons.map(l => l.content ? l.content.length : 0);
        const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
        const minLength = Math.min(...contentLengths);
        const maxLength = Math.max(...contentLengths);
        
        console.log(`\n📊 Content Distribution Check:`);
        console.log(`   Average length: ${Math.round(avgLength).toLocaleString()} characters`);
        console.log(`   Min: ${minLength.toLocaleString()}, Max: ${maxLength.toLocaleString()}`);
        
        // Warn if distribution is very uneven
        if (minLength < avgLength * 0.3) {
            console.log(`   ⚠️  Warning: Some lessons are significantly shorter than average`);
        }
        
        // 7. Create course document
        const course = {
            name: `Ultimate Day Trading Course - ${lessonCount} Lessons`,
            type: 'ultimate',
            lessonCount: lessonCount,
            lessons: finalLessons,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // 8. Save to MongoDB
        console.log(`\n💾 Step 5: Saving to MongoDB...`);
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');
        
        // Check if course already exists
        const existing = await coursesCollection.findOne({
            type: 'ultimate',
            lessonCount: lessonCount
        });
        
        if (existing) {
            await coursesCollection.updateOne(
                { _id: existing._id },
                { $set: course }
            );
            console.log(`✅ Updated existing ultimate course: ${lessonCount} lessons`);
        } else {
            await coursesCollection.insertOne(course);
            console.log(`✅ Created new ultimate course: ${lessonCount} lessons`);
        }
        
        console.log(`\n✅ SUCCESS: Ultimate ${lessonCount}-lesson course generated and saved!`);
        return course;
        
    } catch (error) {
        console.error(`\n❌ Error generating ${lessonCount}-lesson course:`, error.message);
        throw error;
    }
}

async function generateAllUltimateCourses() {
    try {
        await connectToDatabase();
        console.log('\n' + '='.repeat(80));
        console.log('🎯 ULTIMATE COURSES GENERATION');
        console.log('='.repeat(80));
        console.log('Generating 4 ultimate courses: 5, 10, 15, 20 lessons');
        console.log('This will take some time. Please be patient...\n');
        
        const lessonCounts = [5, 10, 15, 20];
        const results = [];
        
        for (const count of lessonCounts) {
            try {
                const course = await generateUltimateCourse(count);
                results.push({ count, success: true, course });
                
                // Delay between courses
                if (count !== lessonCounts[lessonCounts.length - 1]) {
                    console.log('\n⏳ Waiting 5 seconds before next course...\n');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.error(`\n❌ Failed to generate ${count}-lesson course:`, error.message);
                results.push({ count, success: false, error: error.message });
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 GENERATION SUMMARY');
        console.log('='.repeat(80));
        
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.count} lessons: SUCCESS`);
            } else {
                console.log(`❌ ${result.count} lessons: FAILED - ${result.error}`);
            }
        });
        
        const successCount = results.filter(r => r.success).length;
        console.log(`\n✅ Generated ${successCount}/4 ultimate courses successfully`);
        console.log('='.repeat(80) + '\n');
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    generateAllUltimateCourses();
}

module.exports = { generateUltimateCourse, generateAllUltimateCourses };

