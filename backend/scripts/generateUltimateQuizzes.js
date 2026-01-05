require('dotenv').config();
const { getDatabase, connectToDatabase, closeDatabase } = require('../config/database');
const { callOpenAI } = require('../services/openaiService');

// Quiz rules based on course pace (STRICT - DO NOT MODIFY)
const QUIZ_RULES = {
    20: { quizzes: 20, questionsPerQuiz: 5, choicesPerQuestion: 5 },
    15: { quizzes: 15, questionsPerQuiz: 7, choicesPerQuestion: 5 },
    10: { quizzes: 10, questionsPerQuiz: 9, choicesPerQuestion: 5 },
    5: { quizzes: 5, questionsPerQuiz: 11, choicesPerQuestion: 5 }
};

/**
 * Get quiz rules for a given pace
 */
function getQuizRules(pace) {
    const rules = QUIZ_RULES[pace];
    if (!rules) {
        throw new Error(`Invalid pace: ${pace}. Must be 5, 10, 15, or 20.`);
    }
    return rules;
}

/**
 * Validate quiz JSON structure
 */
function validateQuizJSON(quizData, quizNumber, lessonNumber, expectedQuestions) {
    if (!quizData || typeof quizData !== 'object') {
        throw new Error(`Quiz ${quizNumber}: Invalid JSON structure`);
    }

    if (quizData.quizNumber !== quizNumber) {
        throw new Error(`Quiz ${quizNumber}: quizNumber mismatch (expected ${quizNumber}, got ${quizData.quizNumber})`);
    }

    if (quizData.lessonNumber !== lessonNumber) {
        throw new Error(`Quiz ${quizNumber}: lessonNumber mismatch (expected ${lessonNumber}, got ${quizData.lessonNumber})`);
    }

    if (!Array.isArray(quizData.questions)) {
        throw new Error(`Quiz ${quizNumber}: questions must be an array`);
    }

    if (quizData.questions.length !== expectedQuestions) {
        throw new Error(`Quiz ${quizNumber}: Expected ${expectedQuestions} questions, got ${quizData.questions.length}`);
    }

    // Validate no extra fields (strict structure)
    const allowedKeys = ['quizNumber', 'lessonNumber', 'questions'];
    const extraKeys = Object.keys(quizData).filter(k => !allowedKeys.includes(k));
    if (extraKeys.length > 0) {
        throw new Error(`Quiz ${quizNumber}: Unexpected fields found: ${extraKeys.join(', ')}`);
    }

    quizData.questions.forEach((q, idx) => {
        // Validate question structure
        const questionAllowedKeys = ['question', 'choices', 'correctIndex'];
        const questionExtraKeys = Object.keys(q).filter(k => !questionAllowedKeys.includes(k));
        if (questionExtraKeys.length > 0) {
            throw new Error(`Quiz ${quizNumber}, Question ${idx + 1}: Unexpected fields: ${questionExtraKeys.join(', ')}`);
        }

        if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
            throw new Error(`Quiz ${quizNumber}, Question ${idx + 1}: Missing or invalid question text`);
        }

        if (!Array.isArray(q.choices) || q.choices.length !== 5) {
            throw new Error(`Quiz ${quizNumber}, Question ${idx + 1}: Must have exactly 5 choices`);
        }

        if (q.choices.some(c => typeof c !== 'string' || !c.trim())) {
            throw new Error(`Quiz ${quizNumber}, Question ${idx + 1}: All choices must be non-empty strings`);
        }

        if (typeof q.correctIndex !== 'number' || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 4) {
            throw new Error(`Quiz ${quizNumber}, Question ${idx + 1}: correctIndex must be an integer 0-4`);
        }
    });

    return true;
}

/**
 * Clean OpenAI response - only handle known markdown cases
 */
function cleanOpenAIResponse(response) {
    let cleaned = response.trim();
    
    // Only handle explicit markdown code block cases
    // Case 1: ```json ... ```
    if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
        cleaned = cleaned.slice(7); // Remove ```json
        cleaned = cleaned.slice(0, -3); // Remove ```
        cleaned = cleaned.trim();
    }
    // Case 2: ``` ... ``` (generic code block)
    else if (cleaned.startsWith('```') && cleaned.endsWith('```') && !cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(3); // Remove ```
        cleaned = cleaned.slice(0, -3); // Remove ```
        cleaned = cleaned.trim();
    }
    // Otherwise, leave response untouched
    
    return cleaned;
}

/**
 * Generate a quiz from lesson content using OpenAI
 */
async function generateQuizFromLesson(lessonContent, quizNumber, lessonNumber, questionsPerQuiz) {
    const prompt = `Generate a multiple-choice quiz based EXCLUSIVELY on the following lesson content.

CRITICAL REQUIREMENTS:
- Generate exactly ${questionsPerQuiz} multiple-choice questions
- Each question must have exactly 5 answer choices
- Each question must have exactly 1 correct answer (indicated by correctIndex: 0-4)
- Questions must be based ONLY on the provided lesson content
- Do NOT include explanations, markdown formatting, summaries, or extra text
- Do NOT add any fields beyond: quizNumber, lessonNumber, questions (with question, choices, correctIndex)
- Return ONLY valid JSON matching this exact structure:

{
  "quizNumber": ${quizNumber},
  "lessonNumber": ${lessonNumber},
  "questions": [
    {
      "question": "Question text here",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E"],
      "correctIndex": 2
    }
  ]
}

Lesson Content:
${lessonContent}

Return ONLY the JSON object, no markdown, no explanations, no additional text.`;

    try {
        const response = await callOpenAI(prompt, {
            temperature: 0.3,
            max_tokens: 2000
        });

        // Clean response - only handle known markdown cases
        const cleanedResponse = cleanOpenAIResponse(response);

        // Parse JSON
        let quizData;
        try {
            quizData = JSON.parse(cleanedResponse);
        } catch (parseError) {
            throw new Error(`Quiz ${quizNumber}: Invalid JSON response from OpenAI - ${parseError.message}. Raw response: ${response.substring(0, 200)}`);
        }

        // Validate structure
        validateQuizJSON(quizData, quizNumber, lessonNumber, questionsPerQuiz);

        return quizData;
    } catch (error) {
        if (error.message.includes('Quiz')) {
            throw error; // Re-throw validation errors as-is
        }
        throw new Error(`Quiz ${quizNumber}: Generation failed - ${error.message}`);
    }
}

/**
 * Generate all quizzes for a course
 * 
 * IMPORTANT: This function assumes lessons are already ordered and index-aligned.
 * Lesson at index 0 → Quiz 1, Lesson at index 1 → Quiz 2, etc.
 * The lessons array must not be reordered before calling this function.
 */
async function generateUltimateQuizzes(courseId, lessons) {
    // Derive pace strictly from lessons.length (source of truth)
    const pace = lessons.length;
    
    console.log(`\n🎯 Generating Ultimate Quizzes for Course ID: ${courseId}`);
    console.log(`   Pace: ${pace} lessons (derived from lessons.length)`);
    console.log(`   Lessons provided: ${lessons.length}\n`);

    // Validate pace is valid
    if (![5, 10, 15, 20].includes(pace)) {
        throw new Error(`Invalid pace: ${pace}. Must be 5, 10, 15, or 20.`);
    }

    // Get quiz rules
    const rules = getQuizRules(pace);
    console.log(`📋 Quiz Rules:`);
    console.log(`   Number of quizzes: ${rules.quizzes}`);
    console.log(`   Questions per quiz: ${rules.questionsPerQuiz}`);
    console.log(`   Choices per question: ${rules.choicesPerQuestion}\n`);

    // Validate lesson count matches expected quizzes
    if (lessons.length !== rules.quizzes) {
        throw new Error(`Lesson count mismatch: Expected ${rules.quizzes} lessons for pace ${pace}, got ${lessons.length}`);
    }

    // Assert lesson ordering assumption
    console.log(`⚠️  ASSUMPTION: Lessons are ordered and index-aligned (Lesson[0] → Quiz 1, Lesson[1] → Quiz 2, etc.)\n`);

    // Generate all quizzes first (NO database writes in this loop)
    const quizzes = [];
    
    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const lessonNumber = i + 1;
        const quizNumber = i + 1;

        console.log(`📝 Generating Quiz ${quizNumber}/${rules.quizzes} for Lesson ${lessonNumber}...`);

        // Extract lesson content
        const lessonContent = lesson.content || lesson.text || '';
        if (!lessonContent || lessonContent.trim().length === 0) {
            throw new Error(`Lesson ${lessonNumber} (index ${i}) has no content`);
        }

        // Generate quiz (no database write here)
        const quiz = await generateQuizFromLesson(
            lessonContent,
            quizNumber,
            lessonNumber,
            rules.questionsPerQuiz
        );

        quizzes.push(quiz);
        console.log(`   ✅ Quiz ${quizNumber} generated successfully (${quiz.questions.length} questions)\n`);

        // Delay to avoid rate limits
        if (i < lessons.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Validate all quizzes generated
    if (quizzes.length !== rules.quizzes) {
        throw new Error(`Quiz generation incomplete: Expected ${rules.quizzes} quizzes, generated ${quizzes.length}`);
    }

    // Create quiz pack document (only after ALL quizzes are generated)
    const quizPack = {
        courseId: courseId,
        pace: pace,
        quizzes: quizzes,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    return quizPack;
}

/**
 * Save quiz pack to MongoDB
 * This is the ONLY place where database writes occur for quiz packs.
 */
async function saveQuizPack(quizPack) {
    const db = await getDatabase();
    const quizzesCollection = db.collection('UltimateQuizzes');

    // Validate quiz pack is complete before saving
    const expectedQuizzes = QUIZ_RULES[quizPack.pace]?.quizzes;
    if (quizPack.quizzes.length !== expectedQuizzes) {
        throw new Error(`Cannot save incomplete quiz pack: Expected ${expectedQuizzes} quizzes, got ${quizPack.quizzes.length}`);
    }

    // Check if quiz pack already exists for this course and pace
    const existing = await quizzesCollection.findOne({
        courseId: quizPack.courseId,
        pace: quizPack.pace
    });

    if (existing) {
        console.log(`⚠️  Quiz pack already exists for course ${quizPack.courseId} (pace: ${quizPack.pace})`);
        console.log(`   Updating existing quiz pack...`);
        
        const result = await quizzesCollection.updateOne(
            { courseId: quizPack.courseId, pace: quizPack.pace },
            { 
                $set: {
                    quizzes: quizPack.quizzes,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log(`   ✅ Updated existing quiz pack (${result.modifiedCount} document modified)\n`);
        return existing._id;
    } else {
        const result = await quizzesCollection.insertOne(quizPack);
        console.log(`   ✅ Saved new quiz pack with ID: ${result.insertedId}\n`);
        return result.insertedId;
    }
}

/**
 * Main function: Generate quizzes for all ultimate courses
 */
async function generateAllUltimateQuizzes() {
    try {
        await connectToDatabase();
        console.log('✅ Connected to database\n');

        const db = await getDatabase();
        const coursesCollection = db.collection('courses');

        // Find all ultimate courses
        const ultimateCourses = await coursesCollection.find({ type: 'ultimate' }).toArray();
        
        if (ultimateCourses.length === 0) {
            console.log('❌ No ultimate courses found. Please generate ultimate courses first.');
            return;
        }

        console.log(`📚 Found ${ultimateCourses.length} ultimate course(s)\n`);

        // Process each course
        for (const course of ultimateCourses) {
            const courseId = course._id;
            const lessons = course.lessons || [];

            if (lessons.length === 0) {
                console.log(`⚠️  Skipping course ${courseId}: No lessons found`);
                continue;
            }

            // Derive pace from lessons.length (source of truth)
            const pace = lessons.length;

            console.log(`\n${'='.repeat(60)}`);
            console.log(`Processing: ${course.name || 'Untitled Course'}`);
            console.log(`Course ID: ${courseId}`);
            console.log(`Pace: ${pace} (from lessons.length)`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Generate quizzes (all quizzes generated before any database write)
                const quizPack = await generateUltimateQuizzes(courseId, lessons);

                // Save to MongoDB (only after ALL quizzes are generated)
                await saveQuizPack(quizPack);

                console.log(`✅ Successfully generated and saved quizzes for pace ${pace}\n`);
            } catch (error) {
                console.error(`❌ Error processing course ${courseId}:`, error.message);
                console.error(`   Continuing with next course...\n`);
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ Quiz generation complete!');
        console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
        console.error('❌ Error during quiz generation:', error);
        throw error;
    } finally {
        await closeDatabase();
    }
}

// Run if called directly
if (require.main === module) {
    generateAllUltimateQuizzes()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = {
    generateUltimateQuizzes,
    saveQuizPack,
    generateAllUltimateQuizzes,
    getQuizRules,
    validateQuizJSON
};

