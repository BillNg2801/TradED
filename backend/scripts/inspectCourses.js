require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

async function inspectCourses() {
    try {
        await connectToDatabase();
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        console.log('\n' + '='.repeat(80));
        console.log('📚 MONGODB COURSES INSPECTION');
        console.log('='.repeat(80) + '\n');

        // Get all courses
        const allCourses = await coursesCollection.find({}).toArray();
        console.log(`Total courses in database: ${allCourses.length}\n`);

        // Separate by type
        const premadeCourses = allCourses.filter(c => c.type === 'premade');
        const defaultCourses = allCourses.filter(c => !c.type || c.type !== 'premade');

        console.log(`Premade courses: ${premadeCourses.length}`);
        console.log(`Default courses: ${defaultCourses.length}\n`);

        // Inspect each premade course in detail
        for (const course of premadeCourses) {
            console.log('\n' + '='.repeat(80));
            console.log(`📖 COURSE: ${course.name}`);
            console.log('='.repeat(80));
            console.log(`   ID: ${course._id}`);
            console.log(`   Type: ${course.type || 'N/A'}`);
            console.log(`   Confidence Level: ${course.confidenceLevel || 'N/A'}`);
            console.log(`   Lesson Count: ${course.lessonCount || 'N/A'}`);
            console.log(`   Created: ${course.createdAt || course.stats?.createdAt || 'N/A'}`);
            console.log(`   Updated: ${course.updatedAt || course.stats?.updatedAt || 'N/A'}`);

            if (course.lessons && Array.isArray(course.lessons)) {
                console.log(`\n   📝 LESSONS (${course.lessons.length} total):\n`);
                
                course.lessons.forEach((lesson, index) => {
                    const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled Lesson';
                    const contentLength = lesson.content ? lesson.content.length : 0;
                    const imageCount = lesson.images ? lesson.images.length : 0;
                    
                    console.log(`   ${(index + 1).toString().padStart(3, ' ')}. ${title}`);
                    console.log(`        Content: ${contentLength} characters`);
                    if (imageCount > 0) {
                        console.log(`        Images: ${imageCount}`);
                    }
                });

                // Check for duplicate names
                const lessonTitles = course.lessons.map(l => 
                    (l.topic || l.title || l.subtopic || '').toLowerCase().trim()
                );
                const titleCounts = {};
                lessonTitles.forEach(title => {
                    titleCounts[title] = (titleCounts[title] || 0) + 1;
                });
                
                const duplicates = Object.entries(titleCounts).filter(([title, count]) => count > 1);
                if (duplicates.length > 0) {
                    console.log(`\n   ⚠️  DUPLICATE LESSON NAMES FOUND:`);
                    duplicates.forEach(([duplicateTitle, count]) => {
                        // Find all lesson indices with this duplicate title
                        const duplicateIndices = [];
                        lessonTitles.forEach((title, index) => {
                            if (title === duplicateTitle) {
                                duplicateIndices.push(index + 1); // +1 because lessons are 1-indexed
                            }
                        });
                        console.log(`        "${duplicateTitle}" appears ${count} times at lessons: ${duplicateIndices.join(', ')}`);
                    });
                } else {
                    console.log(`\n   ✅ No duplicate lesson names`);
                }

                // Check for very similar content lengths (potential duplicates)
                const contentLengths = course.lessons.map(l => l.content ? l.content.length : 0);
                const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
                const suspiciouslySimilar = contentLengths.filter(len => 
                    len > 0 && Math.abs(len - avgLength) < 100 && len < avgLength * 0.3
                );
                
                if (suspiciouslySimilar.length > 1) {
                    console.log(`\n   ⚠️  WARNING: Some lessons have suspiciously similar short content lengths`);
                    console.log(`        (Potential duplicate content)`);
                }

            } else {
                console.log(`\n   ⚠️  No lessons array found or lessons is not an array`);
            }

            // Show first few lines of first lesson content as sample
            if (course.lessons && course.lessons.length > 0 && course.lessons[0].content) {
                const firstLessonContent = course.lessons[0].content;
                const preview = firstLessonContent.substring(0, 200).replace(/\n/g, ' ');
                console.log(`\n   📄 Sample content (first lesson, first 200 chars):`);
                console.log(`        "${preview}..."`);
            }
        }

        // Summary
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));

        const combinations = [
            { level: 'Beginner', counts: [5, 10, 15, 20] },
            { level: 'Intermediate', counts: [5, 10, 15, 20] },
            { level: 'Advanced', counts: [5, 10, 15, 20] }
        ];

        console.log('\nExpected premade courses (12 total):\n');
        for (const combo of combinations) {
            for (const count of combo.counts) {
                const exists = premadeCourses.find(c => 
                    c.confidenceLevel === combo.level && c.lessonCount === count
                );
                const status = exists ? '✅' : '❌';
                console.log(`   ${status} ${combo.level} - ${count} lessons`);
            }
        }

        const missing = [];
        for (const combo of combinations) {
            for (const count of combo.counts) {
                const exists = premadeCourses.find(c => 
                    c.confidenceLevel === combo.level && c.lessonCount === count
                );
                if (!exists) {
                    missing.push(`${combo.level} ${count} lessons`);
                }
            }
        }

        if (missing.length > 0) {
            console.log(`\n⚠️  Missing courses (${missing.length}):`);
            missing.forEach(m => console.log(`   - ${m}`));
        } else {
            console.log(`\n✅ All 12 expected courses are present`);
        }

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ Error inspecting courses:', error);
        console.error(error.stack);
    } finally {
        await closeDatabase();
    }
}

// Run if called directly
if (require.main === module) {
    inspectCourses();
}

module.exports = { inspectCourses };

