// OpenAI API Helper Functions
// Load config
let AI_CONFIG;
if (typeof window !== 'undefined') {
    // Browser environment - will load from config.js
    window.AI_CONFIG_LOADED = false;
}

// Function to call OpenAI API
async function callOpenAI(prompt, options = {}) {
    // Load config if in browser
    if (typeof window !== 'undefined' && !window.AI_CONFIG) {
        // Try to get from global config loaded from config.js
        if (window.AI_CONFIG_LOADED && window.AI_CONFIG) {
            AI_CONFIG = window.AI_CONFIG;
        } else {
            throw new Error('AI Config not loaded. Make sure AI/config.js is included in your HTML.');
        }
    }

    const config = AI_CONFIG || window.AI_CONFIG;
    
    const {
        model = config.model || 'gpt-3.5-turbo',
        temperature = 0.7,
        max_tokens = 500
    } = options;

    try {
        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
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
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}

// Make callOpenAI globally available in browser
if (typeof window !== 'undefined') {
    window.callOpenAI = callOpenAI;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { callOpenAI };
}

