require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

async function viewDefaultCourse() {
    try {
        await connectToDatabase();
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        // Find the default course (name: "Day Trading Fundamentals", no type or type != 'premade')
        const defaultCourse = await coursesCollection.findOne({
            name: 'Day Trading Fundamentals',
            $or: [
                { type: { $exists: false } },
                { type: { $ne: 'premade' } }
            ]
        });

        if (!defaultCourse) {
            console.log('\n❌ Default course not found in MongoDB\n');
            console.log('Searching for any course with name containing "Day Trading"...\n');
            const allCourses = await coursesCollection.find({}).toArray();
            allCourses.forEach(c => {
                console.log(`   - ${c.name} (type: ${c.type || 'none'}, lessons: ${c.lessons?.length || c.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 'N/A'})`);
            });
            await closeDatabase();
            return;
        }

        console.log('\n' + '='.repeat(80));
        console.log(`📚 DEFAULT/ORIGINAL COURSE: ${defaultCourse.name}`);
        console.log('='.repeat(80));
        console.log(`   ID: ${defaultCourse._id}`);
        console.log(`   Type: ${defaultCourse.type || 'default (not premade)'}`);
        console.log(`   Created: ${defaultCourse.createdAt || defaultCourse.stats?.createdAt || 'N/A'}`);
        console.log(`   Updated: ${defaultCourse.updatedAt || defaultCourse.stats?.updatedAt || 'N/A'}`);

        // Handle both structures: modules.lessons and flat lessons array
        let allLessons = [];
        
        if (defaultCourse.modules && Array.isArray(defaultCourse.modules)) {
            console.log(`\n   📦 MODULES: ${defaultCourse.modules.length}`);
            
            // Extract all lessons from all modules
            defaultCourse.modules.forEach((module, moduleIndex) => {
                if (module.lessons && Array.isArray(module.lessons)) {
                    console.log(`      Module ${moduleIndex + 1}: ${module.name || module.title || 'Unnamed'} (${module.lessons.length} lessons)`);
                    module.lessons.forEach(lesson => {
                        allLessons.push({
                            ...lesson,
                            moduleName: module.name || module.title || `Module ${moduleIndex + 1}`,
                            moduleIndex: moduleIndex + 1
                        });
                    });
                }
            });
        } else if (defaultCourse.lessons && Array.isArray(defaultCourse.lessons)) {
            // Flat lessons array structure
            console.log(`\n   📖 Using flat lessons array structure`);
            allLessons = defaultCourse.lessons.map(lesson => ({
                ...lesson,
                moduleName: 'Default',
                moduleIndex: 0
            }));
        }

        if (allLessons.length === 0) {
            console.log(`\n   ⚠️  No lessons found in default course`);
            console.log(`   Course structure:`, Object.keys(defaultCourse));
            await closeDatabase();
            return;
        }

        console.log(`\n   📖 TOTAL LESSONS: ${allLessons.length}\n`);

        // Display all lessons
        allLessons.forEach((lesson, index) => {
            const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled Lesson';
            const contentLength = lesson.content ? lesson.content.length : 0;
            const wordCount = lesson.content ? lesson.content.split(/\s+/).length : 0;
            const imageCount = lesson.images ? lesson.images.length : 0;
            
            console.log(`   ┌─ Lesson ${(index + 1).toString().padStart(2, ' ')}: ${title}`);
            if (lesson.moduleName && lesson.moduleName !== 'Default') {
                console.log(`   │   Module: ${lesson.moduleName}`);
            }
            console.log(`   │   Content: ${contentLength.toLocaleString()} characters (${wordCount.toLocaleString()} words)`);
            if (imageCount > 0) {
                console.log(`   │   Images: ${imageCount}`);
            }
            
            // Show content preview
            if (lesson.content) {
                const preview = lesson.content
                    .substring(0, 200)
                    .replace(/\n/g, ' ')
                    .trim();
                console.log(`   │   Preview: "${preview}${lesson.content.length > 200 ? '...' : ''}"`);
            }
            console.log(`   └${'─'.repeat(76)}`);
        });

        // Check for duplicate lesson names
        const lessonTitles = allLessons.map(l => 
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
            console.log(`\n   ⚠️  DUPLICATE LESSON NAMES FOUND:`);
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
            console.log(`\n   ✅ No duplicate lesson names found in default course`);
        }

        // Content statistics
        const contentLengths = allLessons.map(l => l.content ? l.content.length : 0);
        const validLengths = contentLengths.filter(l => l > 0);
        if (validLengths.length > 0) {
            const avgLength = validLengths.reduce((a, b) => a + b, 0) / validLengths.length;
            const minLength = Math.min(...validLengths);
            const maxLength = Math.max(...validLengths);
            
            console.log(`\n   📊 CONTENT STATISTICS:`);
            console.log(`      Average length: ${Math.round(avgLength).toLocaleString()} characters`);
            console.log(`      Shortest: ${minLength.toLocaleString()} characters`);
            console.log(`      Longest: ${maxLength.toLocaleString()} characters`);
            console.log(`      Total content: ${contentLengths.reduce((a, b) => a + b, 0).toLocaleString()} characters`);
        }

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ Error viewing default course:', error);
        console.error(error.stack);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    viewDefaultCourse();
}

module.exports = { viewDefaultCourse };

