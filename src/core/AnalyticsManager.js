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

    recordRequest(providerId, inputTokens, outputTokens, latency, pricing) {
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

        const cost = this.calculateCost(inputTokens, outputTokens, pricing);
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

    calculateCost(inputTokens, outputTokens, pricing) {
        if (!pricing) {
            return 0;
        }
        return (inputTokens * pricing.input) + (outputTokens * pricing.output);
    }
}