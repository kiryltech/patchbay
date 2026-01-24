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
                        <div class="flex justify-between items-center">
                            <h4 class="font-semibold text-gray-200">${agentId}</h4>
                            <span class="text-xs font-mono text-gray-400">${agentData.requests} reqs</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-3 text-xs">
                            <div>
                                <p class="text-gray-400 font-mono">TOKENS</p>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-gray-500">Input</span>
                                    <span class="font-mono text-gray-300">${agentData.inputTokens.toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-gray-500">Output</span>
                                    <span class="font-mono text-gray-300">${agentData.outputTokens.toLocaleString()}</span>
                                </div>
                                 <div class="border-t border-border-dark my-1"></div>
                                <div class="flex justify-between items-center font-bold">
                                    <span class="text-gray-400">Total</span>
                                    <span class="font-mono text-gray-200">${agentData.totalTokens.toLocaleString()}</span>
                                </div>
                            </div>
                            <div>
                                <p class="text-gray-400 font-mono">EST. COST</p>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-gray-500">Input</span>
                                    <span class="font-mono text-gray-300">$${(agentData.inputCost || 0).toFixed(4)}</span>
                                </div>
                                <div class="flex justify-between items-center mt-1">
                                    <span class="text-gray-500">Output</span>
                                    <span class="font-mono text-gray-300">$${(agentData.outputCost || 0).toFixed(4)}</span>
                                </div>
                                <div class="border-t border-border-dark my-1"></div>
                                <div class="flex justify-between items-center font-bold">
                                    <span class="text-gray-400">Total</span>
                                    <span class="font-mono text-gray-200">$${agentData.estimatedCost.toFixed(4)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
