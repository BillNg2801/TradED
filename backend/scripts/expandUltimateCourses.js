

require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');
const { callOpenAI } = require('../services/openaiService');

async function expandLessonContent(content, lessonName) {
    if (!content || content.trim().length === 0) {
        return content;
    }

    const prompt = `Expand the following day trading lesson content to approximately double its current length. 

CRITICAL INSTRUCTIONS:
- Do NOT add new topics or themes
- Only expand on what is already there
- Add more detail, examples, explanations, and context to existing content
- Maintain the same structure, headings, and organization
- Keep the same tone and style
- Make it roughly 2x longer by elaborating on existing points
- DO NOT add checklists, quality review content, or meta-commentary
- DO NOT add "Related Articles", "Related Pages", or similar sections
- Just expand the existing educational content

Lesson Title: ${lessonName}

Current Content:
${content}

Return the expanded content (approximately 2x longer, no checklists or quality review content):`;

    try {
        const expanded = await callOpenAI(prompt, {
            temperature: 0.3,
            max_tokens: 4000
        });
        return expanded;
    } catch (error) {
        console.error(`Error expanding lesson "${lessonName}":`, error.message);
        return content; // Return original if expansion fails
    }
}

async function expandUltimateCourses() {
    try {
        await connectToDatabase();
        console.log('✅ Connected to database\n');

        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        // Find all ultimate courses
        const courses = await coursesCollection.find({ type: 'ultimate' }).toArray();
        console.log(`Found ${courses.length} ultimate courses to expand\n`);

        for (const course of courses) {
            console.log(`\n📚 Expanding course: ${course.name}`);
            let courseUpdated = false;

            if (course.lessons && Array.isArray(course.lessons)) {
                for (let i = 0; i < course.lessons.length; i++) {
                    const lesson = course.lessons[i];
                    if (lesson.content) {
                        console.log(`  📖 Expanding lesson ${i + 1}/${course.lessons.length}: "${lesson.name || 'Untitled'}"`);
                        
                        const originalLength = lesson.content.length;
                        const expandedContent = await expandLessonContent(lesson.content, lesson.name || `Lesson ${i + 1}`);
                        const newLength = expandedContent.length;
                        
                        if (expandedContent !== lesson.content) {
                            course.lessons[i].content = expandedContent;
                            courseUpdated = true;
                            console.log(`    ✅ Expanded: ${originalLength} → ${newLength} characters (${Math.round((newLength / originalLength) * 100)}%)`);
                        } else {
                            console.log(`    ⚠️  No expansion applied`);
                        }

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }

                if (courseUpdated) {
                    await coursesCollection.updateOne(
                        { _id: course._id },
                        { $set: { lessons: course.lessons, updatedAt: new Date() } }
                    );
                    console.log(`  ✅ Updated course in database`);
                }
            }
        }

        console.log(`\n\n✅ Expansion complete!`);
        console.log(`   Total courses processed: ${courses.length}`);

    } catch (error) {
        console.error('❌ Error during expansion:', error);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    expandUltimateCourses();
}

module.exports = { expandUltimateCourses, expandLessonContent };

