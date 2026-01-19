export class UIManager {
    /**
     * @param {import('../core/Orchestrator').Orchestrator} orchestrator
     */
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.messageContainer = null;
        this.inputElement = null;
        this.sendButton = null;

        this.history = []; // Simple local history for now
    }

    init() {
        this.messageContainer = document.getElementById('message-container');
        this.inputElement = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');

        this.bindEvents();
        this.renderAgentList();
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
    }

    async handleSend() {
        const text = this.inputElement.value.trim();
        if (!text) return;

        // Add user message
        this.appendMessage('user', text);
        this.inputElement.value = '';
        this.history.push({ role: 'user', content: text });

        // Show loading state?
        // For now just wait
        try {
            const response = await this.orchestrator.dispatch(text, this.history);
            this.appendMessage('assistant', response);
            this.history.push({ role: 'assistant', content: response });
        } catch (error) {
            console.error(error);
            this.appendMessage('system', `Error: ${error.message}`);
        }
    }

    appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `flex gap-3 ${role === 'user' ? 'justify-end' : ''}`;

        let contentHtml = '';

        if (role === 'user') {
            contentHtml = `
                <div class="bg-surface-dark border border-border-dark rounded-lg rounded-tr-none px-4 py-3 max-w-[85%]">
                    <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">${this.escapeHtml(text)}</p>
                </div>
                <div class="size-8 rounded bg-gradient-to-br from-primary to-blue-700 shrink-0"></div>
            `;
        } else if (role === 'assistant') {
            const provider = this.orchestrator.getActiveProvider();
            const providerName = provider ? provider.name.toUpperCase() : 'AI';

            contentHtml = `
                <div class="size-8 rounded bg-green-900/30 border border-green-500/30 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-green-500 text-sm">smart_toy</span>
                </div>
                <div class="flex-1 space-y-2">
                    <div class="text-xs text-status-green font-mono mb-1">${providerName}</div>
                    <div class="bg-[#121212] border border-border-dark rounded-lg rounded-tl-none p-4 w-full">
                        <p class="text-sm text-gray-300 whitespace-pre-wrap">${this.escapeHtml(text)}</p>
                    </div>
                </div>
            `;
        } else { // System error
             contentHtml = `
                <div class="flex-1 space-y-2">
                    <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 w-full">
                        <p class="text-sm text-red-400 font-mono">${this.escapeHtml(text)}</p>
                    </div>
                </div>
            `;
        }

        div.innerHTML = contentHtml;
        this.messageContainer.appendChild(div);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    renderAgentList() {
        const listContainer = document.getElementById('agent-list');
        listContainer.innerHTML = ''; // Clear mock

        const providers = this.orchestrator.getProviders();
        providers.forEach(p => {
            const div = document.createElement('div');
            // Basic card
            div.className = `group flex flex-col gap-2 p-3 rounded bg-surface-darker border border-border-dark hover:border-primary/40 transition-colors cursor-pointer`;
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="size-2 rounded-full ${p.mode === 'API' ? 'bg-status-green' : 'bg-status-orange'}"></span>
                        <span class="font-bold text-sm">${p.name}</span>
                    </div>
                    ${this.orchestrator.activeProviderId === p.id ?
                        '<span class="material-symbols-outlined text-primary" style="font-size: 24px;">toggle_on</span>' :
                        '<span class="material-symbols-outlined text-gray-600" style="font-size: 24px;">toggle_off</span>'}
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono text-gray-500">
                    <span class="bg-[#1e293b] px-1.5 py-0.5 rounded text-gray-300">${p.mode} MODE</span>
                </div>
            `;

            div.addEventListener('click', () => {
                this.orchestrator.setActiveProvider(p.id);
                this.renderAgentList(); // Re-render to update toggle state
            });

            listContainer.appendChild(div);
        });
    }
}
