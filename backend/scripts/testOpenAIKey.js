require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    fetch = require('node-fetch');
}

async function testOpenAIKey() {
    console.log('🔍 Testing OpenAI API Key...\n');

    // Check if key exists
    if (!OPENAI_API_KEY) {
        console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables');
        console.log('   Make sure you have OPENAI_API_KEY in your .env file');
        return;
    }

    // Show first and last few characters of key (for verification, not full key)
    const keyPreview = OPENAI_API_KEY.length > 20 
        ? `${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`
        : '***';
    console.log(`✅ API Key found: ${keyPreview}`);
    console.log(`   Key length: ${OPENAI_API_KEY.length} characters\n`);

    // Test the key with a simple API call
    console.log('🧪 Testing API key with a simple request...\n');
    
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: 'Say "API key test successful" if you can read this.'
                    }
                ],
                max_tokens: 10
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ API Request Failed:');
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${errorData.error?.message || 'Unknown error'}`);
            
            if (response.status === 401) {
                console.error('\n   ⚠️  This usually means the API key is invalid or expired');
            } else if (response.status === 429) {
                console.error('\n   ⚠️  Rate limit exceeded or quota exceeded');
            }
            return;
        }

        const data = await response.json();
        const message = data.choices[0]?.message?.content || 'No response';
        
        console.log('✅ API Key is working!');
        console.log(`   Response: ${message}\n`);
        console.log('✅ Your OpenAI API key is valid and ready to use!');

    } catch (error) {
        console.error('❌ Error testing API key:');
        console.error(`   ${error.message}`);
    }
}

testOpenAIKey();

