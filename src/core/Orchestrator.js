/**
 * @typedef {import('./interfaces').AIProvider} AIProvider
 * @typedef {import('./interfaces').Message} Message
 */

export class Orchestrator {
    constructor() {
        /** @type {Map<string, AIProvider>} */
        this.providers = new Map();
        /** @type {Map<string, Message[]>} */
        this.conversations = new Map();
        /** @type {string[]} */
        this.activeProviderIds = [];
    }

    /**
     * Registers a new provider.
     * @param {AIProvider} provider
     */
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
        this.conversations.set(provider.id, []); // Initialize empty conversation history
        if (this.activeProviderIds.length === 0) {
            this.activeProviderIds.push(provider.id);
        }
        console.log(`[Orchestrator] Registered provider: ${provider.id}`);
    }

    /**
     * Sets the active providers.
     * @param {string[]} providerIds
     */
    setActiveProviders(providerIds) {
        this.activeProviderIds = providerIds.filter(id => this.providers.has(id));
        console.log(`[Orchestrator] Active providers set to: ${this.activeProviderIds.join(', ')}`);
    }

    /**
     * Gets the active providers.
     * @returns {AIProvider[]}
     */
    getActiveProviders() {
        return this.activeProviderIds.map(id => this.providers.get(id));
    }

    /**
     * Sends a message to a specific provider, managing its context.
     * @param {string} providerId
     * @param {string} text
     * @returns {Promise<{response: string, providerId: string}>}
     */
    async dispatch(providerId, text) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${providerId}`);
        }

        const history = this.conversations.get(providerId) || [];
        history.push({ role: 'user', content: text });

        console.log(`[Orchestrator] Dispatching to ${provider.id}...`);
        try {
            const response = await provider.sendPrompt(text, history);
            history.push({ role: 'assistant', content: response });
            this.conversations.set(providerId, history);
            return { response, providerId };
        } catch (error) {
            console.error(`[Orchestrator] Error from ${provider.id}:`, error);
            history.pop(); // Remove user message on failure
            throw error;
        }
    }

    /**
     * Sends a message to all active providers.
     * @param {string} text
     * @returns {Promise<Map<string, {response?: string, error?: Error}>>}
     */
    async broadcast(text) {
        const results = new Map();
        const promises = this.activeProviderIds.map(async (providerId) => {
            try {
                const { response } = await this.dispatch(providerId, text);
                results.set(providerId, { response });
            } catch (error) {
                results.set(providerId, { error });
            }
        });

        await Promise.all(promises);
        return results;
    }

    /**
     * Get all registered providers.
     * @returns {AIProvider[]}
     */
    getProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Gets the conversation history for a specific provider.
     * @param {string} providerId
     * @returns {Message[] | undefined}
     */
    getConversation(providerId) {
        return this.conversations.get(providerId);
    }

    /**
     * Clears the conversation history for a specific provider.
     * @param {string} providerId
     */
    clearConversation(providerId) {
        if (this.conversations.has(providerId)) {
            this.conversations.set(providerId, []);
            console.log(`[Orchestrator] Cleared conversation for: ${providerId}`);
        }
    }
}
