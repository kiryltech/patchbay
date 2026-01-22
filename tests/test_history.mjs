
import { Orchestrator } from '../src/core/Orchestrator.js';

// Mock Provider
class MockProvider {
    constructor(id) {
        this.id = id;
        this.name = id;
    }
    async sendPrompt(text, history) {
        return `Response from ${this.id}. History len: ${history.length}`;
    }
}

async function runTests() {
    console.log("Running History Persistence Tests...\n");

    const orchestrator = new Orchestrator();
    const mockGemini = new MockProvider('gemini');
    orchestrator.registerProvider(mockGemini);

    // Step 1: Passive message (No target)
    console.log("1. Sending passive message (should be saved)...");
    await orchestrator.dispatch("My name is Kiryl", [], () => {});
    
    let history = orchestrator.getConversationHistory();
    if (history.length === 1 && history[0].content === "My name is Kiryl") {
        console.log("✅ PASS: Passive message saved.");
    } else {
        console.error("❌ FAIL: Passive message NOT saved.", history);
    }

    // Step 2: Active message (Target Gemini)
    console.log("2. Sending active message (Target Gemini)...");
    await orchestrator.dispatch("What is my name?", ['gemini'], (result) => {
        console.log("   Received:", result.response);
    });

    history = orchestrator.getConversationHistory();
    // History should be: [User: My name..., User: What is my name?, Assistant: Response...]
    if (history.length === 3) {
        console.log("✅ PASS: History length is 3 (Passive + Active + Response).");
    } else {
        console.error(`❌ FAIL: History length is ${history.length} (Expected 3).`);
    }
}

runTests();
