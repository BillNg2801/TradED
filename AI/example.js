// Example: How to use OpenAI API in your project
// 
// 1. Make sure AI/config.js and AI/openai.js are included in your HTML:
//    <script src="AI/config.js"></script>
//    <script src="AI/openai.js"></script>
//
// 2. Use the callOpenAI function:
//
// Example usage:
//
// async function getFinanceNews() {
//     try {
//         const prompt = "Give me 5 recent finance news headlines with brief descriptions";
//         const response = await callOpenAI(prompt, {
//             model: 'gpt-3.5-turbo',
//             temperature: 0.7,
//             max_tokens: 500
//         });
//         console.log(response);
//         return response;
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }
//
// Example 2: Generate finance-related content
//
// async function generateFinanceContent(topic) {
//     try {
//         const prompt = `Write a brief article about ${topic} in finance`;
//         const response = await callOpenAI(prompt, {
//             model: 'gpt-3.5-turbo',
//             max_tokens: 1000
//         });
//         return response;
//     } catch (error) {
//         console.error('Error:', error);
//         return null;
//     }
// }
//
// Example 3: Ask questions about finance
//
// async function askFinanceQuestion(question) {
//     try {
//         const prompt = `Answer this finance-related question: ${question}`;
//         const response = await callOpenAI(prompt);
//         return response;
//     } catch (error) {
//         console.error('Error:', error);
//         return null;
//     }
// }

// The API key is stored in AI/config.js
// The callOpenAI function is defined in AI/openai.js
// Both are automatically loaded when you include them in your HTML

