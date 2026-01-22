// Mock Provider
const providers = [
    { id: 'openai-gpt-4o', name: 'GPT-4o' },
    { id: 'google-gemma-3-27b', name: 'Gemma 3 27B' },
    { id: 'google-gemini-3-flash', name: 'Gemini 3 Flash' }
];

// Logic extracted from UIManager.js
function parseInput(text) {
    const mentionRegex = /@([a-zA-Z0-9.\-_]+|"[^"]+")/g;
    const matches = text.match(mentionRegex) || [];
    const targets = matches.map(m => m.replace(/"/g, '').toLowerCase());
    const cleanText = text.replace(mentionRegex, '').trim();
    return { targets, cleanText };
}

function getTargetIds(rawText) {
    const { targets } = parseInput(rawText);
    let targetIds = [];

    if (targets.includes('@all') || targets.includes('@everyone')) {
        targetIds = providers.map(p => p.id);
    } else if (targets.length > 0) {
        targetIds = providers
            .filter(p => {
                const pNameNormalized = p.name.toLowerCase().replace(/\s+/g, '');
                return targets.some(t => {
                    const targetNameNormalized = t.substring(1).toLowerCase().replace(/\s+/g, '');
                    // Log for debugging
                    // console.log(`Comparing: Provider(${pNameNormalized}) vs Target(${targetNameNormalized})`);
                    return pNameNormalized.includes(targetNameNormalized) || targetNameNormalized.includes(pNameNormalized);
                });
            })
            .map(p => p.id);
    }
    return targetIds;
}

// Test Runner
function runTests() {
    console.log("Running Routing Logic Tests...\n");

    const tests = [
        { input: "@Gemma327B hi", expected: ['google-gemma-3-27b'] },
        { input: "@GPT-4o hello", expected: ['openai-gpt-4o'] },
        { input: "@all hello", expected: ['openai-gpt-4o', 'google-gemma-3-27b', 'google-gemini-3-flash'] },
        { input: "@Gemini3Flash test", expected: ['google-gemini-3-flash'] },
        { input: "@Gemini test", expected: ['google-gemini-3-flash'] }, // "gemini" is in "gemini3flash"
        { input: "No mention", expected: [] }
    ];

    let passed = 0;
    tests.forEach(test => {
        const result = getTargetIds(test.input);
        const isMatch = JSON.stringify(result.sort()) === JSON.stringify(test.expected.sort());
        
        if (isMatch) {
            console.log(`✅ PASS: "${test.input}" -> [${result.join(', ')}]`);
            passed++;
        } else {
            console.error(`❌ FAIL: "${test.input}"`);
            console.error(`   Expected: [${test.expected.join(', ')}]`);
            console.error(`   Actual:   [${result.join(', ')}]`);
        }
    });

    console.log(`\nResults: ${passed}/${tests.length} Passed`);
}

runTests();
