export class AnalyticsManager {
    constructor() {
        this.analytics = this.loadAnalytics();
    }

    loadAnalytics() {
        const data = localStorage.getItem('patchbay-analytics');
        return data ? JSON.parse(data) : {
            totalCost: 0,
            requests: 0,
            agents: {}
        };
    }

    saveAnalytics() {
        localStorage.setItem('patchbay-analytics', JSON.stringify(this.analytics));
    }

    recordRequest(providerId, inputTokens, outputTokens, latency) {
        if (!this.analytics.agents[providerId]) {
            this.analytics.agents[providerId] = {
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                totalLatency: 0,
                averageLatency: 0,
                estimatedCost: 0
            };
        }

        const agent = this.analytics.agents[providerId];
        agent.requests++;
        agent.inputTokens += inputTokens;
        agent.outputTokens += outputTokens;
        agent.totalTokens += inputTokens + outputTokens;
        agent.totalLatency += latency;
        agent.averageLatency = agent.totalLatency / agent.requests;

        const cost = this.calculateCost(providerId, inputTokens, outputTokens);
        agent.estimatedCost += cost;
        this.analytics.totalCost += cost;

        this.analytics.requests++;
        this.saveAnalytics();
    }

    getAnalytics() {
        return this.analytics;
    }

    clearAnalytics() {
        this.analytics = {
            totalCost: 0,
            requests: 0,
            agents: {}
        };
        this.saveAnalytics();
    }

    calculateCost(providerId, inputTokens, outputTokens) {
        // Pricing based on 2026 estimates
        const pricing = {
            'openai-gpt-5.2-pro': { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
            'openai-gpt-5-mini': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 },
            'google-gemini-3-pro': { input: 4.00 / 1_000_000, output: 12.00 / 1_000_000 },
            'google-gemini-3-flash': { input: 0.40 / 1_000_000, output: 1.20 / 1_000_000 },
            'google-gemini-2.5-flash': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000 },
            'google-gemma-3-27b': { input: 0.30 / 1_000_000, output: 0.90 / 1_000_000 }
        };

        const modelPricing = pricing[providerId];
        if (!modelPricing) {
            return 0;
        }

        return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
    }
}
