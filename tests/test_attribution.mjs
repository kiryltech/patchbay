
import { ApiAdapter } from '../src/adapters/ApiAdapter.js';

// Mock Config
const config = {
    id: 'openai-gpt-4o',
    name: 'GPT-4o',
    type: 'openai',
    endpoint: 'http://localhost',
    model: 'gpt-4o',
    getApiKey: () => 'test-key'
};

function runTests() {
    console.log("Running Attribution Logic Tests...\n");

    const adapter = new ApiAdapter(config);
    
    // Check Handle Generation
    if (adapter.handle === '@GPT-4o') {
        console.log("✅ PASS: Handle generation (@GPT-4o)");
    } else {
        console.error(`❌ FAIL: Handle generation. Got ${adapter.handle}`);
    }

    // Mock History
    const history = [
        { role: 'user', content: 'Hello everyone', providerId: 'user' },
        { role: 'assistant', content: 'Hi user!', providerId: 'openai-gpt-4o', providerHandle: '@GPT-4o' }, // Self
        { role: 'assistant', content: 'Hello!', providerId: 'google-gemma-3-27b', providerHandle: '@Gemma327B' } // Other
    ];

    // Format History
    const formatted = adapter._formatHistoryForContext(history);

    // Test 1: User message stays user
    if (formatted[0].role === 'user' && formatted[0].content === 'Hello everyone') {
        console.log("✅ PASS: User message preserved");
    } else {
        console.error("❌ FAIL: User message", formatted[0]);
    }

    // Test 2: Self message stays assistant
    if (formatted[1].role === 'assistant' && formatted[1].content === 'Hi user!') {
        console.log("✅ PASS: Self message preserved as assistant");
    } else {
        console.error("❌ FAIL: Self message", formatted[1]);
    }

    // Test 3: Other agent message becomes user with attribution
    if (formatted[2].role === 'user' && formatted[2].content.includes('@Gemma327B wrote:')) {
        console.log("✅ PASS: Other agent message attributed correctly");
    } else {
        console.error("❌ FAIL: Other agent message", formatted[2]);
    }
}

runTests();
