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
        this.hangarParticipantIds = [];
    }

    /**
     * Registers a new provider.
     * @param {AIProvider} provider
     */
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
        console.log(`[Orchestrator] Registered provider: ${provider.id}`);
    }

    /**
     * Sets the hangar participants.
     * @param {string[]} providerIds
     */
    setHangarParticipants(providerIds) {
        this.hangarParticipantIds = providerIds.filter(id => this.providers.has(id));
        console.log(`[Orchestrator] Hangar participants set to: ${this.hangarParticipantIds.join(', ')}`);
        this._saveHangarState();
    }

    /**
     * Adds a participant to the hangar.
     * @param {string} providerId
     */
    addParticipant(providerId) {
        if (this.providers.has(providerId) && !this.hangarParticipantIds.includes(providerId)) {
            this.hangarParticipantIds.push(providerId);
            console.log(`[Orchestrator] Added participant: ${providerId}`);
            this._saveHangarState();
        }
    }

    /**
     * Removes a participant from the hangar.
     * @param {string} providerId
     */
    removeParticipant(providerId) {
        const index = this.hangarParticipantIds.indexOf(providerId);
        if (index > -1) {
            this.hangarParticipantIds.splice(index, 1);
            console.log(`[Orchestrator] Removed participant: ${providerId}`);
            this._saveHangarState();
        }
    }

    /**
     * Gets the active providers.
     * @returns {AIProvider[]}
     */
    getActiveProviders() {
        return this.hangarParticipantIds.map(id => this.providers.get(id));
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
            .filter(p => p && p.mode !== 'EXTERNAL');

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

    /**
     * Saves the current hangar participant IDs to localStorage.
     * @private
     */
    _saveHangarState() {
        localStorage.setItem('hangarParticipantIds', JSON.stringify(this.hangarParticipantIds));
    }
}
