export class AnalyticsUI {
    /**
     * @param {import('../core/AnalyticsManager').AnalyticsManager} analyticsManager
     */
    constructor(analyticsManager) {
        this.analyticsManager = analyticsManager;
        this.modal = document.getElementById('analytics-modal');
        this.closeButton = document.getElementById('close-analytics-button');
        this.clearButton = document.getElementById('clear-analytics-button');
        this.analyticsContainer = document.getElementById('analytics-container');

        this.bindEvents();
    }

    bindEvents() {
        this.closeButton.addEventListener('click', () => this.close());
        this.clearButton.addEventListener('click', () => this.clear());
    }

    open() {
        this.render();
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
    }

    clear() {
        this.analyticsManager.clearAnalytics();
        this.render();
    }

    render() {
        const analytics = this.analyticsManager.getAnalytics();
        this.analyticsContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-4 mb-6 text-center">
                <div>
                    <h3 class="text-sm text-gray-400 font-mono">TOTAL REQUESTS</h3>
                    <p class="text-2xl font-semibold text-primary">${analytics.requests}</p>
                </div>
                <div>
                    <h3 class="text-sm text-gray-400 font-mono">ESTIMATED COST</h3>
                    <p class="text-2xl font-semibold text-primary">$${analytics.totalCost.toFixed(4)}</p>
                </div>
            </div>
            <div class="space-y-4">
                ${Object.entries(analytics.agents).map(([agentId, agentData]) => `
                    <div class="bg-surface-darker p-3 rounded-lg border border-border-dark">
                        <h4 class="font-semibold text-gray-200">${agentId}</h4>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                            <div>
                                <span class="text-gray-500">Requests</span>
                                <p class="font-mono text-gray-300">${agentData.requests}</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Tokens</span>
                                <p class="font-mono text-gray-300">${agentData.totalTokens.toLocaleString()}</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Avg Latency</span>
                                <p class="font-mono text-gray-300">${agentData.averageLatency.toFixed(0)} ms</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Cost</span>
                                <p class="font-mono text-gray-300">$${agentData.estimatedCost.toFixed(4)}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
