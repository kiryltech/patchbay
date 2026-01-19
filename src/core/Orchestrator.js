/**
 * @typedef {import('./interfaces').AIProvider} AIProvider
 * @typedef {import('./interfaces').Message} Message
 */

export class Orchestrator {
    constructor() {
        /** @type {Map<string, AIProvider>} */
        this.providers = new Map();
        /** @type {string|null} */
        this.activeProviderId = null;
    }

    /**
     * Registers a new provider
     * @param {AIProvider} provider
     */
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
        if (!this.activeProviderId) {
            this.activeProviderId = provider.id;
        }
        console.log(`[Orchestrator] Registered provider: ${provider.id} (${provider.mode})`);
    }

    /**
     * Sets the active provider
     * @param {string} providerId
     */
    setActiveProvider(providerId) {
        if (this.providers.has(providerId)) {
            this.activeProviderId = providerId;
            console.log(`[Orchestrator] Active provider set to: ${providerId}`);
        } else {
            console.warn(`[Orchestrator] Provider not found: ${providerId}`);
        }
    }

    /**
     * Gets the active provider
     * @returns {AIProvider|null}
     */
    getActiveProvider() {
        return this.providers.get(this.activeProviderId) || null;
    }

    /**
     * Sends a message to the active provider
     * @param {string} text
     * @param {Message[]} history
     * @returns {Promise<string>}
     */
    async dispatch(text, history = []) {
        const provider = this.getActiveProvider();
        if (!provider) {
            throw new Error('No active provider selected');
        }

        console.log(`[Orchestrator] Dispatching to ${provider.id}...`);
        try {
            const response = await provider.sendPrompt(text, history);
            return response;
        } catch (error) {
            console.error(`[Orchestrator] Error from ${provider.id}:`, error);
            throw error;
        }
    }

    /**
     * Get all registered providers
     * @returns {AIProvider[]}
     */
    getProviders() {
        return Array.from(this.providers.values());
    }
}
