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

// OpenAI Models (2026)
const gpt5Pro = new ApiAdapter({
    id: 'openai-gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    type: 'openai',
    endpoint: 'http://localhost:3000/api/openai',
    model: 'gpt-5.2-pro',
    getApiKey: () => settingsUI.getOpenAIKey()
});

const gpt5Mini = new ApiAdapter({
    id: 'openai-gpt-5-mini',
    name: 'GPT-5 Mini',
    type: 'openai',
    endpoint: 'http://localhost:3000/api/openai',
    model: 'gpt-5-mini',
    getApiKey: () => settingsUI.getOpenAIKey()
});

// Gemini Models (2026)
const gemini3Pro = new ApiAdapter({
    id: 'google-gemini-3-pro',
    name: 'Gemini 3 Pro',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-3-pro',
    getApiKey: () => settingsUI.getGeminiKey()
});

const gemini3Flash = new ApiAdapter({
    id: 'google-gemini-3-flash',
    name: 'Gemini 3 Flash',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-3-flash-preview', // Using preview endpoint
    getApiKey: () => settingsUI.getGeminiKey()
});

const gemma3 = new ApiAdapter({
    id: 'google-gemma-3-27b',
    name: 'Gemma 3 27B',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemma-3-27b-it',
    getApiKey: () => settingsUI.getGeminiKey()
});

orchestrator.registerProvider(gpt5Pro);
orchestrator.registerProvider(gpt5Mini);
orchestrator.registerProvider(gemini3Pro);
orchestrator.registerProvider(gemini3Flash);
orchestrator.registerProvider(gemma3);

// Load hangar state from localStorage
const savedHangarIds = localStorage.getItem('hangarParticipantIds');
if (savedHangarIds) {
    orchestrator.setHangarParticipants(JSON.parse(savedHangarIds));
}

// Initialize UI
uiManager.init();

console.log('[Main] Application Initialized');
