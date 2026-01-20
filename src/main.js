import { Orchestrator } from './core/Orchestrator.js';
import { ApiAdapter } from './adapters/ApiAdapter.js';
import { WebAdapter } from './adapters/WebAdapter.js'; // Import WebAdapter
import { SettingsUI } from './ui/SettingsUI.js';
import { UIManager } from './ui/UIManager.js';

// --- Configuration ---
// This allows switching between the local proxy (API) and the Chrome Extension (WEB).
// In a real application, this would be a user-configurable setting.
const GEMINI_FLASH_MODE = 'WEB'; // Can be 'API' or 'WEB'
// ---------------------


// Initialize Components
const settingsUI = new SettingsUI();
const orchestrator = new Orchestrator();
const uiManager = new UIManager(orchestrator);

// Register Providers

// OpenAI Models (using local proxy)
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

// Gemini Models (one via proxy, one via extension)
const gemini3Pro = new ApiAdapter({
    id: 'google-gemini-3-pro',
    name: 'Gemini 3 Pro',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-3-pro',
    getApiKey: () => settingsUI.getGeminiKey()
});

// --- Dynamic Provider based on Mode ---
let gemini3Flash;

if (GEMINI_FLASH_MODE === 'WEB') {
    console.log('[Main] Using WebAdapter for Gemini 3 Flash');
    gemini3Flash = new WebAdapter({
        id: 'google-gemini-3-flash',
        name: 'Gemini 3 Flash (Web)', // Change name for clarity in UI
        type: 'gemini',
        // The WebAdapter uses the real API endpoint, as the extension handles CORS
        endpoint: 'https://generativelanguage.googleapis.com',
        model: 'gemini-3-flash-preview',
        getApiKey: () => settingsUI.getGeminiKey()
    });
} else {
    console.log('[Main] Using ApiAdapter for Gemini 3 Flash');
    gemini3Flash = new ApiAdapter({
        id: 'google-gemini-3-flash',
        name: 'Gemini 3 Flash',
        type: 'gemini',
        endpoint: 'http://localhost:3000/api/google',
        model: 'gemini-3-flash-preview',
        getApiKey: () => settingsUI.getGeminiKey()
    });
}


orchestrator.registerProvider(gpt5Pro);
orchestrator.registerProvider(gpt5Mini);
orchestrator.registerProvider(gemini3Pro);
orchestrator.registerProvider(gemini3Flash);

// Set default if not set
orchestrator.setActiveProviders(['google-gemini-3-flash']);

// Initialize UI
uiManager.init();

console.log('[Main] Application Initialized');
