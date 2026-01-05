require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

async function checkUltimateCourses() {
    try {
        await connectToDatabase();
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        console.log('\n' + '='.repeat(80));
        console.log('🔍 ULTIMATE COURSES QUALITY CHECK');
        console.log('='.repeat(80) + '\n');

        // Get all ultimate courses
        const ultimateCourses = await coursesCollection.find({ type: 'ultimate' }).toArray();

        if (ultimateCourses.length === 0) {
            console.log('❌ No ultimate courses found in MongoDB\n');
            await closeDatabase();
            return;
        }

        console.log(`Found ${ultimateCourses.length} ultimate course(s)\n`);

        const expectedCounts = [5, 10, 15, 20];
        const foundCounts = ultimateCourses.map(c => c.lessonCount).sort((a, b) => a - b);

        // Check if all 4 courses exist
        console.log('📊 Course Count Check:');
        expectedCounts.forEach(count => {
            const exists = foundCounts.includes(count);
            console.log(`   ${exists ? '✅' : '❌'} ${count} lessons: ${exists ? 'FOUND' : 'MISSING'}`);
        });

        if (foundCounts.length !== 4) {
            console.log(`\n⚠️  WARNING: Expected 4 courses, found ${foundCounts.length}`);
        }

        // Detailed check for each course
        for (const course of ultimateCourses.sort((a, b) => a.lessonCount - b.lessonCount)) {
            console.log('\n' + '='.repeat(80));
            console.log(`📚 ${course.name}`);
            console.log('='.repeat(80));
            console.log(`   Lesson Count: ${course.lessonCount}`);
            console.log(`   Expected Lessons: ${course.lessonCount}`);
            console.log(`   Actual Lessons: ${course.lessons?.length || 0}`);

            if (!course.lessons || !Array.isArray(course.lessons)) {
                console.log(`\n   ❌ ERROR: No lessons array found!`);
                continue;
            }

            if (course.lessons.length !== course.lessonCount) {
                console.log(`\n   ⚠️  WARNING: Lesson count mismatch! Expected ${course.lessonCount}, got ${course.lessons.length}`);
            }

            // Check for duplicate lesson names
            const lessonTitles = course.lessons.map(l => 
                (l.topic || l.title || l.subtopic || '').toLowerCase().trim()
            );
            const titleCounts = {};
            lessonTitles.forEach(title => {
                if (title) {
                    titleCounts[title] = (titleCounts[title] || 0) + 1;
                }
            });

            const duplicates = Object.entries(titleCounts).filter(([title, count]) => count > 1);

            if (duplicates.length > 0) {
                console.log(`\n   ❌ DUPLICATE LESSON NAMES FOUND:`);
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

            // Check for empty or very short content
            const emptyLessons = course.lessons.filter(l => !l.content || l.content.trim().length < 100);
            if (emptyLessons.length > 0) {
                console.log(`\n   ⚠️  WARNING: ${emptyLessons.length} lesson(s) have very short or empty content`);
                emptyLessons.forEach((l, idx) => {
                    const title = l.topic || l.title || 'Untitled';
                    const len = l.content ? l.content.length : 0;
                    console.log(`      - "${title}": ${len} characters`);
                });
            }

            // Content distribution analysis
            const contentLengths = course.lessons.map(l => l.content ? l.content.length : 0);
            const validLengths = contentLengths.filter(l => l > 0);
            
            if (validLengths.length > 0) {
                const avgLength = validLengths.reduce((a, b) => a + b, 0) / validLengths.length;
                const minLength = Math.min(...validLengths);
                const maxLength = Math.max(...validLengths);
                const totalLength = contentLengths.reduce((a, b) => a + b, 0);

                console.log(`\n   📊 Content Statistics:`);
                console.log(`      Total content: ${totalLength.toLocaleString()} characters`);
                console.log(`      Average per lesson: ${Math.round(avgLength).toLocaleString()} characters`);
                console.log(`      Shortest: ${minLength.toLocaleString()} characters`);
                console.log(`      Longest: ${maxLength.toLocaleString()} characters`);

                // Check distribution balance
                const distributionRatio = minLength / avgLength;
                if (distributionRatio < 0.5) {
                    console.log(`      ⚠️  WARNING: Content distribution is uneven (shortest is ${Math.round(distributionRatio * 100)}% of average)`);
                } else {
                    console.log(`      ✅ Content distribution is balanced`);
                }
            }

            // Check for proper structure (headings, formatting)
            let lessonsWithHeadings = 0;
            let lessonsWithBullets = 0;
            let lessonsWithImages = 0;

            course.lessons.forEach(lesson => {
                const content = lesson.content || '';
                if (content.includes('##') || content.includes('###')) {
                    lessonsWithHeadings++;
                }
                if (content.includes('- ') || content.includes('* ')) {
                    lessonsWithBullets++;
                }
                if (lesson.images && lesson.images.length > 0) {
                    lessonsWithImages++;
                }
            });

            console.log(`\n   📝 Structure Check:`);
            console.log(`      Lessons with headings: ${lessonsWithHeadings}/${course.lessons.length}`);
            console.log(`      Lessons with bullet points: ${lessonsWithBullets}/${course.lessons.length}`);
            console.log(`      Lessons with images: ${lessonsWithImages}/${course.lessons.length}`);

            if (lessonsWithHeadings < course.lessons.length * 0.8) {
                console.log(`      ⚠️  WARNING: Some lessons may lack proper headings`);
            }
            if (lessonsWithBullets < course.lessons.length * 0.7) {
                console.log(`      ⚠️  WARNING: Some lessons may lack bullet points`);
            }
            if (lessonsWithImages < course.lessons.length) {
                console.log(`      ⚠️  WARNING: Not all lessons have images`);
            }

            // List all lesson names
            console.log(`\n   📖 Lesson Names:`);
            course.lessons.forEach((lesson, index) => {
                const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled';
                const contentLen = lesson.content ? lesson.content.length : 0;
                const imageCount = lesson.images ? lesson.images.length : 0;
                console.log(`      ${(index + 1).toString().padStart(2, ' ')}. ${title} (${contentLen.toLocaleString()} chars, ${imageCount} images)`);
            });
        }

        // Overall summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 OVERALL SUMMARY');
        console.log('='.repeat(80));

        const allHaveNoDuplicates = ultimateCourses.every(course => {
            if (!course.lessons) return false;
            const titles = course.lessons.map(l => (l.topic || l.title || '').toLowerCase());
            return new Set(titles).size === titles.length;
        });

        const allHaveProperCount = ultimateCourses.every(course => 
            course.lessons && course.lessons.length === course.lessonCount
        );

        const allHaveContent = ultimateCourses.every(course =>
            course.lessons && course.lessons.every(l => l.content && l.content.length > 100)
        );

        console.log(`\n✅ All 4 courses exist: ${ultimateCourses.length === 4 ? 'YES' : 'NO'}`);
        console.log(`✅ No duplicates: ${allHaveNoDuplicates ? 'YES' : 'NO'}`);
        console.log(`✅ Correct lesson counts: ${allHaveProperCount ? 'YES' : 'NO'}`);
        console.log(`✅ All lessons have content: ${allHaveContent ? 'YES' : 'NO'}`);

        const meetsRequirements = ultimateCourses.length === 4 && allHaveNoDuplicates && allHaveProperCount && allHaveContent;
        
        console.log(`\n${meetsRequirements ? '✅' : '❌'} Overall: ${meetsRequirements ? 'MEETS ALL REQUIREMENTS' : 'DOES NOT MEET REQUIREMENTS'}`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ Error checking ultimate courses:', error);
        console.error(error.stack);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    checkUltimateCourses();
}

module.exports = { checkUltimateCourses };

