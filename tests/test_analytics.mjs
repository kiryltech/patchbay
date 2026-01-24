
import { AnalyticsManager } from '../src/core/AnalyticsManager.js';

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

async function runTests() {
    console.log('Running AnalyticsManager Tests...');

    // Test 1: Initial state
    const analyticsManager = new AnalyticsManager();
    analyticsManager.clearAnalytics(); // Clear before tests
    let analytics = analyticsManager.getAnalytics();
    if (analytics.totalCost === 0 && analytics.requests === 0 && Object.keys(analytics.agents).length === 0) {
        console.log('Test 1 Passed: Initial state is correct');
    } else {
        console.error('Test 1 Failed: Initial state is incorrect', analytics);
    }

    // Test 2: Record request
    const pricing = { input: 0.001, output: 0.002 };
    analyticsManager.recordRequest('openai-gpt-5.2-pro', 1000, 2000, 500, pricing);
    analytics = analyticsManager.getAnalytics();
    if (analytics.requests === 1 && analytics.agents['openai-gpt-5.2-pro'].requests === 1) {
        console.log('Test 2 Passed: Record request updates analytics');
    } else {
        console.error('Test 2 Failed: Record request did not update analytics correctly', analytics);
    }

    // Test 3: Cost calculation
    analytics = analyticsManager.getAnalytics();
    const agentData = analytics.agents['openai-gpt-5.2-pro'];
    if (agentData.inputCost > 0 && agentData.outputCost > 0 && agentData.estimatedCost > 0) {
        console.log('Test 3 Passed: Cost calculation is correct');
    } else {
        console.error('Test 3 Failed: Cost calculation is incorrect', agentData);
    }

    // Test 4: Data persistence
    const newAnalyticsManager = new AnalyticsManager();
    analytics = newAnalyticsManager.getAnalytics();
    if (analytics.requests === 1) {
        console.log('Test 4 Passed: Analytics data is persisted');
    } else {
        console.error('Test 4 Failed: Analytics data is not persisted', analytics);
    }

    // Test 5: Clear analytics
    analyticsManager.clearAnalytics();
    analytics = analyticsManager.getAnalytics();
    if (analytics.totalCost === 0 && analytics.requests === 0 && Object.keys(analytics.agents).length === 0) {
        console.log('Test 5 Passed: Clear analytics resets data');
    } else {
        console.error('Test 5 Failed: Clear analytics did not reset data', analytics);
    }
}

runTests();
