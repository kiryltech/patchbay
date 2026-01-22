/**
 * @typedef {import('../core/interfaces').AIProvider} AIProvider
 * @typedef {import('../core/interfaces').Message} Message
 */

export class ApiAdapter {
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
        this.handle = '@' + this.name.replace(/\s+/g, '');
        this.mode = 'API';
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
        // Ideally we would ping the API, but for now just check key existence
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

        // Format history with attribution
        const formattedHistory = this._formatHistoryForContext(history);

        if (this.type === 'openai') {
            return this._sendOpenAI(text, formattedHistory, apiKey);
        } else if (this.type === 'gemini') {
            return this._sendGemini(text, formattedHistory, apiKey);
        } else {
            throw new Error(`Unknown provider type: ${this.type}`);
        }
    }

    /**
     * Formats history to attribute messages from other agents correctly.
     * Messages from *this* agent stay as 'assistant'.
     * Messages from *other* agents become 'user' messages with attribution.
     * @param {Message[]} history
     * @returns {Array<{role: string, content: string}>}
     */
    _formatHistoryForContext(history) {
        return history.map(msg => {
            if (msg.role === 'user') {
                return { role: 'user', content: msg.content };
            }
            
            // It's an assistant message
            if (msg.providerId === this.id) {
                // It was me
                return { role: 'assistant', content: msg.content };
            } else {
                // It was someone else (e.g., 'openai-gpt-4')
                // We present this as a user message to avoid confusing the model
                // about its own identity.
                const attribution = msg.providerHandle ? `${msg.providerHandle} wrote:` : `[${msg.providerId}] wrote:`;
                return { role: 'user', content: `${attribution}\n${msg.content}` };
            }
        });
    }

    async _sendOpenAI(text, formattedHistory, apiKey) {
        const systemMessage = {
            role: 'system',
            content: `You are ${this.handle} (${this.name}). You are participating in a group chat with a user and other AI agents. When responding, speak directly to the group. Keep your responses concise.`
        };
        
        const messages = [systemMessage, ...formattedHistory];

        const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async _sendGemini(text, formattedHistory, apiKey) {
        const systemMessage = `You are ${this.handle} (${this.name}). You are participating in a group chat with a user and other AI agents. When responding, speak directly to the group. Keep your responses concise.`;
        
        const contents = formattedHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const firstUserMessage = contents.find(c => c.role === 'user');
        if (firstUserMessage) {
            firstUserMessage.parts[0].text = `${systemMessage}\n\n${firstUserMessage.parts[0].text}`;
        } else {
            contents.unshift({ role: 'user', parts: [{ text: systemMessage }] });
        }

        const url = `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        return "No response from Gemini.";
    }
}
