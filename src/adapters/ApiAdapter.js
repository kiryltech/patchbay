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

        if (this.type === 'openai') {
            return this._sendOpenAI(text, history, apiKey);
        } else if (this.type === 'gemini') {
            return this._sendGemini(text, history, apiKey);
        } else {
            throw new Error(`Unknown provider type: ${this.type}`);
        }
    }

    async _sendOpenAI(text, history, apiKey) {
        const systemMessage = {
            role: 'system',
            content: `You are '${this.name}'. Keep your responses concise and to the point.`
        };
        const messages = [systemMessage, ...history.map(msg => ({
            role: msg.role,
            content: msg.content
        }))];

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

    async _sendGemini(text, history, apiKey) {
        const systemMessage = `You are '${this.name}'. Keep your responses concise and to the point.`;
        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Prepend system message to the first user message
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
        // Parse response
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        return "No response from Gemini.";
    }
}
