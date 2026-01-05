require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');

async function cleanupCourses() {
    try {
        await connectToDatabase();
        console.log('✅ Connected to database\n');

        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        // Find all ultimate courses
        const courses = await coursesCollection.find({ type: 'ultimate' }).toArray();
        console.log(`Found ${courses.length} ultimate courses to clean\n`);

        let totalLessonsCleaned = 0;

        for (const course of courses) {
            console.log(`\n📚 Cleaning course: ${course.name}`);
            let courseUpdated = false;

            if (course.lessons && Array.isArray(course.lessons)) {
                for (let i = 0; i < course.lessons.length; i++) {
                    const lesson = course.lessons[i];
                    if (lesson.content) {
                        let originalContent = lesson.content;
                        let cleanedContent = originalContent;

                        // Remove first two lines
                        const lines = cleanedContent.split('\n');
                        if (lines.length > 2) {
                            cleanedContent = lines.slice(2).join('\n');
                        }

                        // Remove quality review checklist text
                        cleanedContent = cleanedContent.replace(/QUALITY REVIEW CHECKLIST:[\s\S]*?(?=\n\n|\n#|$)/gi, '');
                        cleanedContent = cleanedContent.replace(/QUALITY REVIEW[\s\S]*?(?=\n\n|\n#|$)/gi, '');
                        cleanedContent = cleanedContent.replace(/Review and improve this day trading lesson content[\s\S]*?Return the reviewed and improved content:/gi, '');
                        
                        // Remove meta-commentary text
                        cleanedContent = cleanedContent.replace(/Thoroughness and Comprehensiveness:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Clear Structure and Formatting:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Well-organized.*$/gmi, '');
                        // Remove all quality review bullet points
                        cleanedContent = cleanedContent.replace(/\*\*Thoroughness and Comprehensiveness:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Structure and Formatting:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Clarity and Completeness:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Organization and Flow:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Emphasis on Important Terms:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Examples and Practical Applications:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Logical Flow:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/The content has been reviewed and improved.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/The content covers all necessary aspects.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/The lesson is well-structured.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Concepts are explained clearly.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/The content flows logically.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Key terms are emphasized.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Relevant examples and practical applications.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/The lesson progresses logically.*$/gmi, '');
                        // Remove meta-commentary about lesson alignment
                        cleanedContent = cleanedContent.replace(/This revised lesson content[\s\S]*?day trading\./gi, '');
                        cleanedContent = cleanedContent.replace(/This lesson content is now aligned[\s\S]*?day trading\./gi, '');
                        cleanedContent = cleanedContent.replace(/This revised lesson[\s\S]*?provides a comprehensive guide[\s\S]*?day trading\./gi, '');
                        // Remove sentences starting with "This revised content..."
                        cleanedContent = cleanedContent.replace(/This revised content[\s\S]*?\./gi, '');
                        // Remove "This revised lesson content is now more focused..." sentences
                        cleanedContent = cleanedContent.replace(/This revised lesson content is now more focused[\s\S]*?day traders\./gi, '');
                        // Remove quality review checkpoint questions and answers
                        cleanedContent = cleanedContent.replace(/Is the content thorough and comprehensive\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Is the structure clear with proper headings and formatting\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Are all concepts explained clearly and completely\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Are important terms emphasized with bold\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Are examples and practical applications included where appropriate\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Does the content flow logically from one section to the next\?[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Is the content[\s\S]*?Yes,.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Yes, the content is well-structured.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Yes, each concept is explained in detail.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Yes, key terms are highlighted.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Yes, practical examples and applications.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/Yes, the lesson is logically organized.*$/gmi, '');
                        // Remove quality review checklist items (Thoroughness:, Structure:, Clarity:, etc.)
                        cleanedContent = cleanedContent.replace(/\*\*Thoroughness:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Structure:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Clarity:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Organization:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Emphasis:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Practical Application:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/\*\*Logical Flow:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Thoroughness:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Structure:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Clarity:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Organization:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Emphasis:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Practical Application:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^Logical Flow:.*$/gmi, '');
                        // Remove any line starting with these checklist items (with or without dashes/bullets)
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Thoroughness:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Structure:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Clarity:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Organization:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Emphasis:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Practical Application:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*\*\*Logical Flow:\*\*.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Thoroughness:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Structure:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Clarity:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Organization:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Emphasis:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Practical Application:.*$/gmi, '');
                        cleanedContent = cleanedContent.replace(/^[-*]\s*Logical Flow:.*$/gmi, '');
                        // Remove numbered bullet points that appear after conclusion (empty or incomplete numbered items)
                        cleanedContent = cleanedContent.replace(/^\d+\.\s*$/gm, ''); // Empty numbered items like "2."
                        cleanedContent = cleanedContent.replace(/^\d+\.\s*\*\*$/gm, ''); // Numbered items with just "**" like "2. **"
                        cleanedContent = cleanedContent.replace(/^\d+\.\s*\*\*\s*$/gm, ''); // Numbered items with just "** " like "2. ** "
                        // Remove everything after conclusion that contains bullet points, numbered lists, or section headers
                        const conclusionIndex = cleanedContent.toLowerCase().indexOf('conclusion');
                        if (conclusionIndex !== -1) {
                            // Find the conclusion section
                            const beforeConclusion = cleanedContent.substring(0, conclusionIndex);
                            let afterConclusion = cleanedContent.substring(conclusionIndex);
                            
                            // Find where the actual conclusion content ends (after disclaimer if present, or after conclusion paragraph)
                            // Look for patterns that indicate end of legitimate content: "Disclaimer", end of paragraph, etc.
                            const disclaimerMatch = afterConclusion.match(/disclaimer:[\s\S]*?(?=\n\n|$)/i);
                            let conclusionEndIndex = afterConclusion.length;
                            
                            if (disclaimerMatch) {
                                // Conclusion ends after disclaimer
                                conclusionEndIndex = disclaimerMatch.index + disclaimerMatch[0].length;
                                // Find the end of the disclaimer paragraph
                                const afterDisclaimer = afterConclusion.substring(conclusionEndIndex);
                                const paragraphEnd = afterDisclaimer.search(/\n\n/);
                                if (paragraphEnd !== -1) {
                                    conclusionEndIndex = conclusionEndIndex + paragraphEnd + 2;
                                }
                            } else {
                                // Find the end of the conclusion paragraph (look for double newlines or section headers)
                                const paragraphEnd = afterConclusion.search(/\n\n(?=#{1,6}\s|Related|Checklist|Quality|Review|[-*]\s|^\d+\.)/i);
                                if (paragraphEnd !== -1) {
                                    conclusionEndIndex = paragraphEnd + 2; // Include the double newline
                                }
                            }
                            
                            // Keep only the conclusion content (up to disclaimer or end of paragraph)
                            const legitimateConclusion = afterConclusion.substring(0, conclusionEndIndex);
                            
                            // Remove everything after that contains bullet points, numbered lists, or section headers
                            let remainingContent = afterConclusion.substring(conclusionEndIndex);
                            
                            // Remove section headers that come after conclusion (Related Articles, Related Pages, etc.)
                            remainingContent = remainingContent.replace(/^#{1,6}\s+(Related|Checklist|Quality|Review).*$/gmi, '');
                            
                            // Remove all bullet points and numbered lists after conclusion
                            remainingContent = remainingContent.replace(/^[-*]\s+.*$/gm, '');
                            remainingContent = remainingContent.replace(/^\d+\.\s+.*$/gm, '');
                            
                            // Remove any remaining content that looks like quality review (questions with checkmarks, etc.)
                            remainingContent = remainingContent.replace(/Is the content.*$/gmi, '');
                            remainingContent = remainingContent.replace(/Are.*\?.*$/gmi, '');
                            remainingContent = remainingContent.replace(/Does.*\?.*$/gmi, '');
                            remainingContent = remainingContent.replace(/This revised lesson.*$/gmi, '');
                            
                            // Combine: conclusion + cleaned remaining (which should be mostly empty now)
                            afterConclusion = legitimateConclusion + remainingContent.replace(/\n{3,}/g, '\n\n').trim();
                            
                            cleanedContent = beforeConclusion + afterConclusion;
                        }
                        
                        // Remove standalone heading markers without text (like "###" alone)
                        cleanedContent = cleanedContent.replace(/^###\s*$/gm, '');
                        cleanedContent = cleanedContent.replace(/^##\s*$/gm, '');
                        cleanedContent = cleanedContent.replace(/^#\s*$/gm, '');
                        
                        // Clean up any double newlines
                        cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();

                        if (cleanedContent !== originalContent) {
                            course.lessons[i].content = cleanedContent;
                            courseUpdated = true;
                            totalLessonsCleaned++;
                            console.log(`  ✅ Cleaned lesson ${i + 1}: "${lesson.name || 'Untitled'}"`);
                        }
                    }
                }

                if (courseUpdated) {
                    await coursesCollection.updateOne(
                        { _id: course._id },
                        { $set: { lessons: course.lessons, updatedAt: new Date() } }
                    );
                    console.log(`  ✅ Updated course in database`);
                } else {
                    console.log(`  ℹ️  No changes needed`);
                }
            }
        }

        console.log(`\n\n✅ Cleanup complete!`);
        console.log(`   Total lessons cleaned: ${totalLessonsCleaned}`);
        console.log(`   Total courses processed: ${courses.length}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    cleanupCourses();
}

module.exports = { cleanupCourses };

