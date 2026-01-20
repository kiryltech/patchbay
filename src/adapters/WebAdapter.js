/**
 * @typedef {import('../core/interfaces').AIProvider} AIProvider
 * @typedef {import('../core/interfaces').Message} Message
 */

// This ID is static for a given extension. For development, you can load
// the extension unpacked and get its ID from the chrome://extensions page.
// It's recommended to make this configurable for production.
const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'; // TODO: Replace with actual ID after loading the extension.

export class WebAdapter {
    /**
     * @param {Object} config
     * @param {string} config.id
     * @param {string} config.name
     * @param {'openai'|'gemini'} config.type
     * @param {string} config.endpoint
     * @param {string} config.model
     * @param {function(): string|null} config.getApiKey
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.mode = 'WEB'; // This adapter is specifically for the 'WEB' (Extension) mode
        this.type = config.type;
        this.endpoint = config.endpoint;
        this.model = config.model;
        this.getApiKey = config.getApiKey;
    }

    /**
     * @returns {Promise<'READY'|'ERROR'|'MISSING_KEY'>}
     */
    async getStatus() {
        const key = this.getApiKey();
        if (!key) return 'MISSING_KEY';
        // For the web adapter, 'READY' means the extension is installed and connectable.
        // We can add a more robust check here later, e.g., a ping/pong message.
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            return 'ERROR';
        }
        return 'READY';
    }

    /**
     * @param {string} text
     * @param {Message[]} history
     * @returns {Promise<string>}
     */
    async sendPrompt(text, history = []) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error(`Missing API Key for ${this.name}`);
        }

        if (this.type === 'openai') {
            return this._sendOpenAI(text, history, apiKey);
        } else if (this.type === 'gemini') {
            return this._sendGemini(text, history, apiKey);
        } else {
            throw new Error(`Unknown provider type: ${this.type}`);
        }
    }

    /**
     * A helper to promisify chrome.runtime.sendMessage.
     * @param {any} message
     * @returns {Promise<any>}
     */
    _sendMessageToExtension(message) {
        return new Promise((resolve, reject) => {
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                return reject(new Error("Chrome runtime is not available. Is the extension installed?"));
            }
            chrome.runtime.sendMessage(EXTENSION_ID, message, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    const errorMessage = response && response.error ? response.error.message : 'Unknown error in extension.';
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    async _sendOpenAI(text, history, apiKey) {
        const messages = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        messages.push({ role: 'user', content: text });

        const requestPayload = {
            type: 'API_REQUEST',
            payload: {
                url: `${this.endpoint}/v1/chat/completions`,
                options: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: messages
                    })
                }
            }
        };

        const response = await this._sendMessageToExtension(requestPayload);

        if (!response.ok) {
            const errText = JSON.stringify(response.body);
            throw new Error(`OpenAI Error: ${response.status} - ${errText}`);
        }

        return response.body.choices[0].message.content;
    }

    async _sendGemini(text, history, apiKey) {
        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        contents.push({ role: 'user', parts: [{ text: text }] });

        const url = `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${apiKey}`;

        const requestPayload = {
            type: 'API_REQUEST',
            payload: {
                url: url,
                options: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: contents
                    })
                }
            }
        };

        const response = await this._sendMessageToExtension(requestPayload);
         if (!response.ok) {
            const errText = JSON.stringify(response.body);
            throw new Error(`Gemini Error: ${response.status} - ${errText}`);
        }

        if (response.body.candidates && response.body.candidates.length > 0) {
            return response.body.candidates[0].content.parts[0].text;
        }
        return "No response from Gemini.";
    }
}
