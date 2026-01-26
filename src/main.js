import { Orchestrator } from './core/Orchestrator.js';
import { ApiAdapter } from './adapters/ApiAdapter.js';
import { ExternalAdapter } from './adapters/ExternalAdapter.js';
import { SettingsUI } from './ui/SettingsUI.js';
import { UIManager } from './ui/UIManager.js';
import { AnalyticsManager } from './core/AnalyticsManager.js';

// Initialize Components
const settingsUI = new SettingsUI();
const orchestrator = new Orchestrator();
const analyticsManager = new AnalyticsManager();
const uiManager = new UIManager(orchestrator, analyticsManager);

// Register Providers
// Note: We use the local proxy address for endpoints.

// OpenAI Models (2026)
const gpt5Pro = new ApiAdapter({
    id: 'openai-gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    type: 'openai',
    endpoint: 'http://localhost:3000/api/openai',
    model: 'gpt-5.2-pro',
    pricing: { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
    getApiKey: () => settingsUI.getOpenAIKey()
}, analyticsManager);

const gpt5Mini = new ApiAdapter({
    id: 'openai-gpt-5-mini',
    name: 'GPT-5 Mini',
    type: 'openai',
    endpoint: 'http://localhost:3000/api/openai',
    model: 'gpt-5-mini',
    pricing: { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 },
    getApiKey: () => settingsUI.getOpenAIKey()
}, analyticsManager);

// Gemini Models (2026)
const gemini3Pro = new ApiAdapter({
    id: 'google-gemini-3-pro',
    name: 'Gemini 3 Pro',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-3-pro',
    pricing: { input: 4.00 / 1_000_000, output: 12.00 / 1_000_000 },
    getApiKey: () => settingsUI.getGeminiKey()
}, analyticsManager);

const gemini3Flash = new ApiAdapter({
    id: 'google-gemini-3-flash',
    name: 'Gemini 3 Flash',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-3-flash-preview', // Using preview endpoint
    pricing: { input: 0.40 / 1_000_000, output: 1.20 / 1_000_000 },
    getApiKey: () => settingsUI.getGeminiKey()
}, analyticsManager);

const gemini25Flash = new ApiAdapter({
    id: 'google-gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemini-2.5-flash', // Current production flash
    pricing: { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000 },
    getApiKey: () => settingsUI.getGeminiKey()
}, analyticsManager);

const gemma3 = new ApiAdapter({
    id: 'google-gemma-3-27b',
    name: 'Gemma 3 27B',
    type: 'gemini',
    endpoint: 'http://localhost:3000/api/google',
    model: 'gemma-3-27b-it',
    pricing: { input: 0.30 / 1_000_000, output: 0.90 / 1_000_000 },
    getApiKey: () => settingsUI.getGeminiKey()
}, analyticsManager);

// Anthropic Models (2026)
const claude45Sonnet = new ApiAdapter({
    id: 'anthropic-claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    type: 'anthropic',
    endpoint: 'http://localhost:3000/api/anthropic',
    model: 'claude-sonnet-4-5',
    pricing: { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
    getApiKey: () => settingsUI.getAnthropicKey()
}, analyticsManager);

const claude45Haiku = new ApiAdapter({
    id: 'anthropic-claude-4.5-haiku',
    name: 'Claude 4.5 Haiku',
    type: 'anthropic',
    endpoint: 'http://localhost:3000/api/anthropic',
    model: 'claude-haiku-4-5',
    pricing: { input: 1.00 / 1_000_000, output: 5.00 / 1_000_000 },
    getApiKey: () => settingsUI.getAnthropicKey()
}, analyticsManager);

const claude45Opus = new ApiAdapter({
    id: 'anthropic-claude-4.5-opus',
    name: 'Claude 4.5 Opus',
    type: 'anthropic',
    endpoint: 'http://localhost:3000/api/anthropic',
    model: 'claude-opus-4-5',
    pricing: { input: 5.00 / 1_000_000, output: 25.00 / 1_000_000 },
    getApiKey: () => settingsUI.getAnthropicKey()
}, analyticsManager);

orchestrator.registerProvider(gpt5Pro);
orchestrator.registerProvider(gpt5Mini);
orchestrator.registerProvider(gemini3Pro);
orchestrator.registerProvider(gemini3Flash);
orchestrator.registerProvider(gemini25Flash);
orchestrator.registerProvider(gemma3);
orchestrator.registerProvider(claude45Sonnet);
orchestrator.registerProvider(claude45Haiku);
orchestrator.registerProvider(claude45Opus);

const claudeWeb = new ExternalAdapter({
    id: 'claude-web',
    name: 'External AI',
});
orchestrator.registerProvider(claudeWeb);

// Load hangar state from localStorage
const savedHangarIds = localStorage.getItem('hangarParticipantIds');
if (savedHangarIds) {
    orchestrator.setHangarParticipants(JSON.parse(savedHangarIds));
}

// Initialize UI
uiManager.init();

console.log('[Main] Application Initialized');