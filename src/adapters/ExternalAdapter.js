/**
 * @typedef {import('../core/interfaces').AIProvider} AIProvider
 * @typedef {import('../core/interfaces').Message} Message
 */

export class ExternalAdapter {
    /**
     * @param {Object} config
     * @param {string} config.id
     * @param {string} config.name
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.handle = '@' + this.name.replace(/\s+/g, '');
        this.mode = 'EXTERNAL';
        this.lastSyncedIndex = 0;
    }

    /**
     * @returns {Promise<'READY'|'ERROR'|'MISSING_KEY'>}
     */
    async getStatus() {
        return 'READY';
    }

    /**
     * This adapter does not send prompts directly.
     * @returns {Promise<string>}
     */
    async sendPrompt(text, history = []) {
        console.warn(`[ExternalAdapter] sendPrompt called on ${this.id}, which is a no-op.`);
        return Promise.resolve("This is an external agent. Use the 'Sync' button to copy the context.");
    }

    /**
     * Formats the conversation history since the last sync into a string.
     * @param {Message[]} history The entire conversation history.
     * @returns {string} The formatted context delta.
     */
    getDeltaContext(history) {
        const newMessages = history.slice(this.lastSyncedIndex);
        if (newMessages.length === 0) {
            return "No new messages to sync.";
        }

        const formatted = newMessages.map(msg => {
            const handle = msg.providerHandle || (msg.role === 'user' ? '@User' : `[@${msg.providerId}]`);
            return `${handle}:\n${msg.content}`;
        }).join('\n\n---\n\n');

        this.lastSyncedIndex = history.length;
        console.log(`[ExternalAdapter] Synced ${this.id}. New index: ${this.lastSyncedIndex}`);

        return `You are ${this.handle}. Continue the conversation based on the following history:\n\n---\n\n${formatted}`;
    }

    /**
     * Manually adds a response to the conversation history.
     * @param {string} text The response text from the external AI.
     * @param {import('../core/Orchestrator').Orchestrator} orchestrator
     */
    pasteResponse(text, orchestrator) {
        const assistantMessage = {
            role: 'assistant',
            content: text,
            providerId: this.id,
            providerHandle: this.handle
        };
        orchestrator.conversationHistory.push(assistantMessage);
    }
}
