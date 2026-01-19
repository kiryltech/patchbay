import { Orchestrator } from './core/Orchestrator.js';
import { ApiAdapter } from './adapters/ApiAdapter.js';
import { SettingsUI } from './ui/SettingsUI.js';
import { UIManager } from './ui/UIManager.js';

// Initialize Components
const settingsUI = new SettingsUI();
const orchestrator = new Orchestrator();
const uiManager = new UIManager(orchestrator);

// Register Providers
// Note: We use the local proxy address for endpoints.
const openaiAdapter = new ApiAdapter({
    id: 'openai-gpt-4',
    name: 'GPT-4 Turbo',
    type: 'openai',
    endpoint: 'http://localhost:3000/api/openai',
    model: 'gpt-4-turbo-preview',
    getApiKey: () => settingsUI.getOpenAIKey()
});

const geminiAdapter = new ApiAdapter({
    id: 'google-gemini-pro',
    name: 'Gemini Pro',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-pro',
    getApiKey: () => settingsUI.getGeminiKey()
});

orchestrator.registerProvider(openaiAdapter);
orchestrator.registerProvider(geminiAdapter);

// Set default if not set
orchestrator.setActiveProvider('openai-gpt-4');

// Initialize UI
uiManager.init();

console.log('[Main] Application Initialized');
