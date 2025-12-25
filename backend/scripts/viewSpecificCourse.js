require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

// Usage: node scripts/viewSpecificCourse.js [confidenceLevel] [lessonCount]
// Example: node scripts/viewSpecificCourse.js Intermediate 15
// Example: node scripts/viewSpecificCourse.js Beginner 20

async function viewSpecificCourse() {
    try {
        const args = process.argv.slice(2);
        const confidenceLevel = args[0] || null;
        const lessonCount = args[1] ? parseInt(args[1], 10) : null;

        await connectToDatabase();
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        let coursesToShow = [];

        if (confidenceLevel && lessonCount) {
            // Show specific course
            const course = await coursesCollection.findOne({
                type: 'premade',
                confidenceLevel: confidenceLevel,
                lessonCount: lessonCount
            });
            if (course) {
                coursesToShow = [course];
            } else {
                console.log(`\n❌ Course not found: ${confidenceLevel} - ${lessonCount} lessons\n`);
                await closeDatabase();
                return;
            }
        } else {
            // Show all courses
            coursesToShow = await coursesCollection.find({ type: 'premade' }).toArray();
        }

        for (const course of coursesToShow) {
            console.log('\n' + '='.repeat(80));
            console.log(`📚 COURSE: ${course.name}`);
            console.log('='.repeat(80));
            console.log(`   Level: ${course.confidenceLevel}`);
            console.log(`   Pace: ${course.lessonCount} lessons`);
            console.log(`   ID: ${course._id}`);
            console.log(`   Created: ${course.createdAt || course.stats?.createdAt || 'N/A'}`);

            if (course.lessons && Array.isArray(course.lessons)) {
                console.log(`\n   📖 ALL LESSONS (${course.lessons.length} total):\n`);
                
                course.lessons.forEach((lesson, index) => {
                    const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled Lesson';
                    const contentLength = lesson.content ? lesson.content.length : 0;
                    const wordCount = lesson.content ? lesson.content.split(/\s+/).length : 0;
                    const imageCount = lesson.images ? lesson.images.length : 0;
                    
                    console.log(`   ┌─ Lesson ${(index + 1).toString().padStart(2, ' ')}: ${title}`);
                    console.log(`   │   Content: ${contentLength.toLocaleString()} characters (${wordCount.toLocaleString()} words)`);
                    if (imageCount > 0) {
                        console.log(`   │   Images: ${imageCount}`);
                    }
                    
                    // Show content preview (first 300 characters)
                    if (lesson.content) {
                        const preview = lesson.content
                            .substring(0, 300)
                            .replace(/\n/g, ' ')
                            .trim();
                        console.log(`   │   Preview: "${preview}${lesson.content.length > 300 ? '...' : ''}"`);
                    }
                    
                    // Show images if any
                    if (lesson.images && lesson.images.length > 0) {
                        console.log(`   │   Image URLs:`);
                        lesson.images.forEach((img, imgIdx) => {
                            const imgUrl = img.url || img.src || 'N/A';
                            const imgCaption = img.caption || img.alt || '';
                            console.log(`   │     ${imgIdx + 1}. ${imgUrl}`);
                            if (imgCaption) {
                                console.log(`   │        Caption: ${imgCaption}`);
                            }
                        });
                    }
                    
                    console.log(`   └${'─'.repeat(76)}`);
                });

                // Check for duplicates
                const lessonTitles = course.lessons.map(l => 
                    (l.topic || l.title || l.subtopic || '').toLowerCase().trim()
                );
                const titleCounts = {};
                lessonTitles.forEach(title => {
                    titleCounts[title] = (titleCounts[title] || 0) + 1;
                });
                
                const duplicates = Object.entries(titleCounts).filter(([title, count]) => count > 1);
                if (duplicates.length > 0) {
                    console.log(`\n   ⚠️  DUPLICATE LESSON NAMES:`);
                    duplicates.forEach(([duplicateTitle, count]) => {
                        const duplicateIndices = [];
                        lessonTitles.forEach((title, index) => {
                            if (title === duplicateTitle) {
                                duplicateIndices.push(index + 1);
                            }
                        });
                        console.log(`      "${duplicateTitle}" appears ${count} times at lessons: ${duplicateIndices.join(', ')}`);
                    });
                } else {
                    console.log(`\n   ✅ No duplicate lesson names`);
                }

                // Content analysis
                const contentLengths = course.lessons.map(l => l.content ? l.content.length : 0);
                const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
                const minLength = Math.min(...contentLengths.filter(l => l > 0));
                const maxLength = Math.max(...contentLengths);
                
                console.log(`\n   📊 CONTENT STATISTICS:`);
                console.log(`      Average length: ${Math.round(avgLength).toLocaleString()} characters`);
                console.log(`      Shortest: ${minLength.toLocaleString()} characters`);
                console.log(`      Longest: ${maxLength.toLocaleString()} characters`);
                console.log(`      Total content: ${contentLengths.reduce((a, b) => a + b, 0).toLocaleString()} characters`);

            } else {
                console.log(`\n   ⚠️  No lessons found`);
            }

            console.log('\n' + '='.repeat(80) + '\n');
        }

    } catch (error) {
        console.error('\n❌ Error viewing course:', error);
        console.error(error.stack);
    } finally {
        await closeDatabase();
    }
}

// Show usage if no args or help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('\n📚 View Specific Course\n');
    console.log('Usage:');
    console.log('  node scripts/viewSpecificCourse.js [confidenceLevel] [lessonCount]');
    console.log('\nExamples:');
    console.log('  node scripts/viewSpecificCourse.js Intermediate 15');
    console.log('  node scripts/viewSpecificCourse.js Beginner 20');
    console.log('  node scripts/viewSpecificCourse.js Advanced 5');
    console.log('\nTo view all courses, run without arguments:');
    console.log('  node scripts/viewSpecificCourse.js');
    console.log('\n');
    process.exit(0);
}

if (require.main === module) {
    viewSpecificCourse();
}

module.exports = { viewSpecificCourse };

