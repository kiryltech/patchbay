/**
 * @typedef {import('./interfaces').AIProvider} AIProvider
 * @typedef {import('./interfaces').Message} Message
 */

export class Orchestrator {
    constructor() {
        /** @type {Map<string, AIProvider>} */
        this.providers = new Map();
        /** @type {Message[]} */
        this.conversationHistory = [];
        /** @type {string[]} */
        this.activeProviderIds = [];
    }

    /**
     * Registers a new provider.
     * @param {AIProvider} provider
     */
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
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
     * Sends a user message to one or more providers and adds it to the unified history.
     * @param {string} text The user's message.
     * @param {string[]} targetProviderIds The specific providers to target. If empty, uses active providers.
     * @param {(result: {response?: string, error?: Error, providerId: string}) => void} onProgress Callback for each result.
     * @returns {Promise<void>}
     */
    async dispatch(text, targetProviderIds, onProgress, rawText = null) {
        // If rawText is provided, use it for history, otherwise use 'text'.
        const userMessage = { role: 'user', content: rawText || text, providerId: 'user' };
        this.conversationHistory.push(userMessage);

        // "Passive by Default": Only dispatch if there are specific targets.
        if (!targetProviderIds || targetProviderIds.length === 0) {
            console.log('[Orchestrator] No targets. Message saved to history.');
            return;
        }

        const providersToQuery = targetProviderIds
            .map(id => this.providers.get(id))
            .filter(Boolean);

        const promises = providersToQuery.map(async (provider) => {
            console.log(`[Orchestrator] Dispatching to ${provider.id}...`);
            try {
                // Providers receive the potentially cleaned text.
                const response = await provider.sendPrompt(text, this.conversationHistory);
                const handle = '@' + provider.name.replace(/\s+/g, '');
                const assistantMessage = { role: 'assistant', content: response, providerId: provider.id, providerHandle: handle };
                this.conversationHistory.push(assistantMessage);
                onProgress({ response, providerId: provider.id });
            } catch (error) {
                console.error(`[Orchestrator] Error from ${provider.id}:`, error);
                onProgress({ error, providerId: provider.id });
            }
        });

        await Promise.all(promises);
    }

    /**
     * Get all registered providers.
     * @returns {AIProvider[]}
     */
    getProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Gets the entire conversation history.
     * @returns {Message[]}
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Clears the conversation history.
     */
    clearConversationHistory() {
        this.conversationHistory = [];
        console.log('[Orchestrator] Cleared conversation history.');
    }
}
