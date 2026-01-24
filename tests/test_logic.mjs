import { Orchestrator } from '../src/core/Orchestrator.js';
import { ApiAdapter } from '../src/adapters/ApiAdapter.js';

// Mock localStorage
let store = {};
const localStorageMock = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
        store[key] = value.toString();
    },
    clear: () => {
        store = {};
    }
};
global.localStorage = localStorageMock;

// Mock AnalyticsManager
const analyticsManagerMock = {
    recordRequest: () => {},
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

    localStorageMock.setItem('openai_key', 'test_key');
    localStorageMock.setItem('gemini_key', 'test_key');

    const openaiAdapter = new ApiAdapter({
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'http://localhost:3000/api/openai',
        model: 'gpt-4',
        getApiKey: () => localStorageMock.getItem('openai_key')
    }, analyticsManagerMock);

    const geminiAdapter = new ApiAdapter({
        id: 'gemini',
        name: 'Gemini',
        type: 'gemini',
        endpoint: 'http://localhost:3000/api/google',
        model: 'gemini-pro',
        getApiKey: () => localStorageMock.getItem('gemini_key')
    }, analyticsManagerMock);

    orchestrator.registerProvider(openaiAdapter);
    orchestrator.registerProvider(geminiAdapter);

    // Test 1: Add participant
    orchestrator.addParticipant('openai');
    if (orchestrator.hangarParticipantIds[0] !== 'openai') {
        console.error('Test 1 Failed: Add participant');
    } else {
        console.log('Test 1 Passed: Add participant');
    }

    // Test 2: Set participants
    orchestrator.setHangarParticipants(['gemini']);
    if (orchestrator.hangarParticipantIds[0] !== 'gemini') {
         console.error('Test 2 Failed: Set participants');
    } else {
        console.log('Test 2 Passed: Set participants');
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

    // Test 5: Passive by Default
    orchestrator.setHangarParticipants(['openai', 'gemini']);
    try {
        let dispatchCalled = false;
        await orchestrator.dispatch('Hello All', [], (result) => {
            dispatchCalled = true;
        });

        if (!dispatchCalled) {
            console.log('Test 5 Passed: Passive by Default');
        } else {
            console.error('Test 5 Failed: Dispatch was called');
        }
    } catch (e) {
        console.error('Test 5 Failed: Passive by Default exception', e);
    }

    // Test 6: Broadcast to both providers
    orchestrator.setHangarParticipants(['openai', 'gemini']);
    try {
        const results = new Map();
        await orchestrator.dispatch('Hello @all', ['openai', 'gemini'], (result) => {
            results.set(result.providerId, result);
        });

        const openaiResult = results.get('openai');
        const geminiResult = results.get('gemini');

        if (openaiResult.response === 'OpenAI Response' && geminiResult.response === 'Gemini Response') {
            console.log('Test 6 Passed: Broadcast response');
        } else {
            console.error('Test 6 Failed: Unexpected broadcast response', results);
        }
    } catch (e) {
        console.error('Test 6 Failed: Broadcast exception', e);
    }
}

runTests();
