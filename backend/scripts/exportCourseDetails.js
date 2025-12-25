require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

async function exportCourseDetails() {
    try {
        await connectToDatabase();
        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        // Get all premade courses
        const premadeCourses = await coursesCollection.find({ type: 'premade' }).toArray();

        const exportDir = path.join(__dirname, '..', 'course-exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        console.log(`\n📤 Exporting ${premadeCourses.length} courses to ${exportDir}\n`);

        for (const course of premadeCourses) {
            const filename = `${course.confidenceLevel || 'Unknown'}-${course.lessonCount || 'Unknown'}lessons.txt`;
            const filepath = path.join(exportDir, filename);

            let content = `COURSE EXPORT\n`;
            content += `=${'='.repeat(78)}\n\n`;
            content += `Name: ${course.name}\n`;
            content += `Type: ${course.type}\n`;
            content += `Confidence Level: ${course.confidenceLevel || 'N/A'}\n`;
            content += `Lesson Count: ${course.lessonCount || 'N/A'}\n`;
            content += `Created: ${course.createdAt || course.stats?.createdAt || 'N/A'}\n`;
            content += `Updated: ${course.updatedAt || course.stats?.updatedAt || 'N/A'}\n`;
            content += `\n${'='.repeat(80)}\n\n`;

            if (course.lessons && Array.isArray(course.lessons)) {
                course.lessons.forEach((lesson, index) => {
                    const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled Lesson';
                    const lessonContent = lesson.content || '(No content)';
                    
                    content += `\n${'='.repeat(80)}\n`;
                    content += `LESSON ${index + 1}: ${title}\n`;
                    content += `${'='.repeat(80)}\n\n`;
                    content += `${lessonContent}\n\n`;
                    
                    if (lesson.images && lesson.images.length > 0) {
                        content += `\n[Images: ${lesson.images.length}]\n`;
                        lesson.images.forEach((img, imgIdx) => {
                            content += `  ${imgIdx + 1}. ${img.url || img.src || 'N/A'}\n`;
                            if (img.caption) content += `     Caption: ${img.caption}\n`;
                        });
                        content += '\n';
                    }
                });
            }

            fs.writeFileSync(filepath, content, 'utf8');
            console.log(`   ✅ Exported: ${filename}`);
        }

        console.log(`\n✅ Export complete! Check: ${exportDir}\n`);

    } catch (error) {
        console.error('\n❌ Error exporting courses:', error);
        console.error(error.stack);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    exportCourseDetails();
}

module.exports = { exportCourseDetails };

