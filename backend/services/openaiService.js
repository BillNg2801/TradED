require('dotenv').config();

let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    fetch = require('node-fetch');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
}

async function callOpenAI(prompt, options = {}) {
    const {
        model = 'gpt-4o', // Use better model for quality
        temperature = 0.1,
        max_tokens = 3500
    } = options;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert course content creator specializing in day trading education. You create well-structured, comprehensive educational content.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: temperature,
                max_tokens: max_tokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error.message);
        throw error;
    }
}

// Condense lessons from 21 to target count, ensuring even distribution
async function condenseLessons(lessons, targetCount) {
    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
        throw new Error('No lessons provided for condensation');
    }

    if (targetCount >= lessons.length) {
        return lessons.map(l => ({
            topic: l.topic || l.title || l.subtopic || 'Untitled Lesson',
            content: l.content || '',
            images: l.images || []
        }));
    }

    // Calculate how many original lessons per condensed lesson
    const lessonsPerCondensed = lessons.length / targetCount;
    
    const condensedLessons = [];
    
    for (let i = 0; i < targetCount; i++) {
        const startIdx = Math.floor(i * lessonsPerCondensed);
        const endIdx = Math.floor((i + 1) * lessonsPerCondensed);
        const originalLessons = lessons.slice(startIdx, endIdx);
        
        // Combine content from multiple lessons
        const combinedContent = originalLessons
            .map(l => l.content || '')
            .filter(c => c.trim().length > 0)
            .join('\n\n---\n\n');
        
        // Combine images
        const combinedImages = originalLessons
            .flatMap(l => l.images || [])
            .filter((img, idx, arr) => arr.findIndex(i => i.url === img.url) === idx); // Remove duplicates
        
        if (combinedContent.trim().length === 0) {
            continue; // Skip if no content
        }
        
        // Use AI to condense and merge the content
        const prompt = `You are condensing ${originalLessons.length} day trading lessons into ONE comprehensive, thorough lesson.

Original lessons to combine:
${originalLessons.map((l, idx) => `Lesson ${idx + 1}: ${l.topic || l.title || l.subtopic || 'Untitled'}`).join('\n')}

CRITICAL INSTRUCTIONS - BE VERY THOROUGH:
1. Combine ALL content from these ${originalLessons.length} lessons into ONE cohesive, comprehensive lesson
2. Ensure NO information is lost - include ALL important concepts, examples, strategies, and details
3. Create a natural flow that connects all topics seamlessly
4. Maintain educational quality - be thorough, detailed, and comprehensive
5. The combined lesson must be complete and cover everything from all ${originalLessons.length} original lessons
6. Preserve all key concepts, definitions, examples, and practical applications
7. Make sure the lesson is substantial and educational - do not skip or summarize too much
8. Each concept should be explained clearly and thoroughly

Original content to combine:
${combinedContent.substring(0, 50000)}${combinedContent.length > 50000 ? '\n\n[... content truncated for length ...]' : ''}

Generate a VERY THOROUGH and comprehensive condensed lesson that combines ALL content from all ${originalLessons.length} lessons. Be detailed, complete, and educational:`;

        try {
            const condensedContent = await callOpenAI(prompt, {
                temperature: 0.1,
                max_tokens: 3500
            });
            
            condensedLessons.push({
                content: condensedContent,
                images: combinedImages.slice(0, 2) // Keep max 2 images per lesson
            });
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`Error condensing lesson ${i + 1}:`, error.message);
            // Fallback: use combined content as-is
            condensedLessons.push({
                content: combinedContent,
                images: combinedImages.slice(0, 2)
            });
        }
    }
    
    return condensedLessons;
}

// Generate unique lesson names for the condensed course
async function generateLessonNames(lessonCount, lessons) {
    const prompt = `Generate ${lessonCount} UNIQUE, descriptive, professional lesson titles for a comprehensive day trading fundamentals course.

CRITICAL REQUIREMENTS:
- Each title MUST be completely UNIQUE (no duplicates, no similar titles)
- Titles should be descriptive, specific, and reflect comprehensive content
- Format: Short, clear, professional titles (5-8 words max)
- Each title should be on a separate line, numbered 1-${lessonCount}
- Titles should cover different aspects of day trading (market structure, technical analysis, risk management, etc.)
- Avoid generic titles - be specific and descriptive

Example format:
1. Market Structure and Trading Basics
2. Order Types and Execution Strategies
3. Technical Analysis Fundamentals
4. Risk Management and Capital Preservation

Generate ${lessonCount} completely unique lesson titles for a comprehensive day trading course. Ensure NO duplicates:`;

    try {
        const response = await callOpenAI(prompt, {
            temperature: 0.7,
            max_tokens: 1000
        });
        
        // Parse the response to extract lesson names
        const lines = response.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^\d+[\.\)]\s*/, '')) // Remove numbering
            .filter(line => line.length > 0);
        
        // Ensure we have exactly lessonCount names
        while (lines.length < lessonCount) {
            lines.push(`Day Trading Lesson ${lines.length + 1}`);
        }
        
        return lines.slice(0, lessonCount);
    } catch (error) {
        console.error('Error generating lesson names:', error.message);
        // Fallback: generate generic names
        return Array.from({ length: lessonCount }, (_, i) => `Day Trading Fundamentals - Lesson ${i + 1}`);
    }
}

// Structure lesson content with headings, bullet points, etc.
async function structureLessonContent(content) {
    if (!content || content.trim().length === 0) {
        return content;
    }
    
    // If content is very long, process in chunks
    const maxChunkSize = 10000;
    if (content.length > maxChunkSize) {
        // Split by paragraphs and process chunks
        const paragraphs = content.split(/\n\n+/);
        const chunks = [];
        let currentChunk = '';
        
        for (const para of paragraphs) {
            if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = para;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + para;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        
        const structuredChunks = [];
        for (const chunk of chunks) {
            const structured = await structureContentChunk(chunk);
            structuredChunks.push(structured);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return structuredChunks.join('\n\n');
    }
    
    return await structureContentChunk(content);
}

async function structureContentChunk(chunk) {
    const prompt = `Structure this day trading lesson content in a clear, professional, and well-organized format.

CRITICAL REQUIREMENTS - BE THOROUGH:
- Use clear headings (## for main sections, ### for subsections)
- Use bullet points (-) for lists and key points
- Use numbered lists (1.) for step-by-step instructions
- Break long paragraphs into shorter, readable sections (max 4-5 sentences per paragraph)
- Add emphasis with **bold** for important terms, concepts, and key definitions
- Ensure the content flows logically from one topic to the next
- Make it easy to read and learn from - use clear transitions
- Structure should be consistent throughout
- Include examples where appropriate
- Use proper formatting for better readability

Content to structure:
${chunk}

Return the thoroughly structured content with proper formatting, headings, and organization:`;

    try {
        const structured = await callOpenAI(prompt, {
            temperature: 0.1,
            max_tokens: 3500
        });
        return structured;
    } catch (error) {
        console.error('Error structuring content:', error.message);
        return chunk; // Return original if structuring fails
    }
}

// Quality review: Recheck and improve structured content
async function qualityReviewContent(content, lessonName) {
    if (!content || content.trim().length === 0) {
        return content;
    }
    
    const prompt = `Review and improve this day trading lesson content for quality, thoroughness, and structure.

Lesson Title: ${lessonName}

Current Content:
${content.substring(0, 15000)}${content.length > 15000 ? '\n\n[... content truncated ...]' : ''}

QUALITY REVIEW CHECKLIST:
1. Is the content thorough and comprehensive? (If not, expand where needed)
2. Is the structure clear with proper headings and formatting?
3. Are all concepts explained clearly and completely?
4. Is the content well-organized and easy to follow?
5. Are important terms emphasized with **bold**?
6. Are examples and practical applications included where appropriate?
7. Does the content flow logically from one section to the next?

If the content needs improvement, enhance it. If it's already excellent, return it as-is with minor refinements.

Return the reviewed and improved content:`;

    try {
        const reviewed = await callOpenAI(prompt, {
            temperature: 0.1,
            max_tokens: 3500
        });
        return reviewed;
    } catch (error) {
        console.error('Error in quality review:', error.message);
        return content; // Return original if review fails
    }
}

// Chatbot function - accepts messages array directly
async function callOpenAIChatbot(messages, options = {}) {
    const {
        model = 'gpt-4o',
        temperature = 0.7,
        max_tokens = 1000
    } = options;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: max_tokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error.message);
        throw error;
    }
}

module.exports = {
    callOpenAI,
    callOpenAIChatbot,
    condenseLessons,
    generateLessonNames,
    structureLessonContent,
    qualityReviewContent
};

