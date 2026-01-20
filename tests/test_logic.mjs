import { Orchestrator } from '../src/core/Orchestrator.js';
import { ApiAdapter } from '../src/adapters/ApiAdapter.js';

// Mock localStorage
const localStorageMock = {
    getItem: (key) => 'test-key',
};

// Mock global fetch
global.fetch = async (url, options) => {
    if (url.includes('openai')) {
        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'OpenAI Response' } }]
            })
        };
    }
    if (url.includes('google')) {
        return {
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'Gemini Response' }] } }]
            })
        };
    }
    return { ok: false, status: 404 };
};

async function runTests() {
    console.log('Running Tests...');

    const orchestrator = new Orchestrator();

    const openaiAdapter = new ApiAdapter({
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'http://localhost:3000/api/openai',
        model: 'gpt-4',
        getApiKey: () => localStorageMock.getItem('openai_key')
    });

    const geminiAdapter = new ApiAdapter({
        id: 'gemini',
        name: 'Gemini',
        type: 'gemini',
        endpoint: 'http://localhost:3000/api/google',
        model: 'gemini-pro',
        getApiKey: () => localStorageMock.getItem('gemini_key')
    });

    orchestrator.registerProvider(openaiAdapter);
    orchestrator.registerProvider(geminiAdapter);

    // Test 1: Default provider selection
    if (orchestrator.activeProviderIds[0] !== 'openai') {
        console.error('Test 1 Failed: Default provider should be openai');
    } else {
        console.log('Test 1 Passed: Default provider');
    }

    // Test 2: Switch provider
    orchestrator.setActiveProviders(['gemini']);
    if (orchestrator.activeProviderIds[0] !== 'gemini') {
         console.error('Test 2 Failed: Provider switch');
    } else {
        console.log('Test 2 Passed: Provider switch');
    }

    // Test 3: Send message to Gemini
    try {
        await orchestrator.dispatch('Hello Gemini', ['gemini'], (result) => {
            if (result.response === 'Gemini Response') {
                console.log('Test 3 Passed: Gemini response');
            } else {
                console.error('Test 3 Failed: Unexpected response', result);
            }
        });
    } catch (e) {
        console.error('Test 3 Failed: Exception', e);
    }

    // Test 4: Send message to OpenAI
    try {
        await orchestrator.dispatch('Hello OpenAI', ['openai'], (result) => {
            if (result.response === 'OpenAI Response') {
                console.log('Test 4 Passed: OpenAI response');
            } else {
                console.error('Test 4 Failed: Unexpected response', result);
            }
        });
    } catch (e) {
        console.error('Test 4 Failed: Exception', e);
    }

    // Test 5: Broadcast to both providers
    orchestrator.setActiveProviders(['openai', 'gemini']);
    try {
        const results = new Map();
        await orchestrator.dispatch('Hello All', [], (result) => {
            results.set(result.providerId, result);
        });

        const openaiResult = results.get('openai');
        const geminiResult = results.get('gemini');

        if (openaiResult.response === 'OpenAI Response' && geminiResult.response === 'Gemini Response') {
            console.log('Test 5 Passed: Broadcast response');
        } else {
            console.error('Test 5 Failed: Unexpected broadcast response', results);
        }
    } catch (e) {
        console.error('Test 5 Failed: Broadcast exception', e);
    }
}

runTests();
