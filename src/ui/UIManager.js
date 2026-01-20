export class UIManager {
    /**
     * @param {import('../core/Orchestrator').Orchestrator} orchestrator
     */
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.messageContainer = null;
        this.inputElement = null;
        this.sendButton = null;
        this.broadcastToggle = null;
    }

    init() {
        this.messageContainer = document.getElementById('message-container');
        this.inputElement = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.broadcastToggle = document.getElementById('broadcast-toggle');
        this.scratchpad = document.getElementById('scratchpad');
        this.pipeActionsContainer = document.getElementById('pipe-actions-container');

        this.bindEvents();
        this.renderAgentList();
        this.renderPipeActions();
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

        this.appendMessage('user', text);
        this.inputElement.value = '';

        const isBroadcast = this.broadcastToggle.checked;

        if (isBroadcast) {
            this.handleBroadcast(text);
        } else {
            const activeProvider = this.orchestrator.getActiveProviders()[0];
            if (activeProvider) {
                this.handleSingleDispatch(activeProvider.id, text);
            } else {
                this.appendMessage('system', 'No active provider selected.');
            }
        }
    }

    async handleSingleDispatch(providerId, text) {
        try {
            const { response } = await this.orchestrator.dispatch(providerId, text);
            this.appendMessage('assistant', response, providerId);
        } catch (error) {
            console.error(error);
            this.appendMessage('system', `Error from ${providerId}: ${error.message}`);
        }
    }

    async handleBroadcast(text) {
        const results = await this.orchestrator.broadcast(text);
        results.forEach(({ response, error }, providerId) => {
            if (error) {
                this.appendMessage('system', `Error from ${providerId}: ${error.message}`);
            } else {
                this.appendMessage('assistant', response, providerId);
            }
        });
    }

    appendMessage(role, text, providerId = null) {
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
            const provider = this.orchestrator.providers.get(providerId);
            const providerName = provider ? provider.name.toUpperCase() : 'AI';

            contentHtml = `
                <div class="size-8 rounded bg-green-900/30 border border-green-500/30 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-green-500 text-sm">smart_toy</span>
                </div>
                <div class="flex-1 space-y-2">
                    <div class="text-xs text-status-green font-mono mb-1 flex justify-between items-center">
                        <span>${providerName}</span>
                        <span class="material-symbols-outlined text-gray-600 hover:text-primary cursor-pointer pipe-icon" style="font-size: 16px;">shortcut</span>
                    </div>
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

        const pipeIcon = div.querySelector('.pipe-icon');
        if (pipeIcon) {
            pipeIcon.addEventListener('click', () => {
                this.scratchpad.value = text;
            });
        }
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
            const isActive = this.orchestrator.activeProviderIds.includes(p.id);
            // Basic card
            div.className = `group flex flex-col gap-2 p-3 rounded bg-surface-darker border ${isActive ? 'border-primary' : 'border-border-dark'} hover:border-primary/40 transition-colors cursor-pointer`;
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="size-2 rounded-full ${p.mode === 'API' ? 'bg-status-green' : 'bg-status-orange'}"></span>
                        <span class="font-bold text-sm">${p.name}</span>
                    </div>
                    ${isActive ?
                        '<span class="material-symbols-outlined text-primary" style="font-size: 24px;">toggle_on</span>' :
                        '<span class="material-symbols-outlined text-gray-600" style="font-size: 24px;">toggle_off</span>'}
                </div>
                <div class="flex justify-between items-center text-[10px] font-mono text-gray-500">
                    <span class="bg-[#1e293b] px-1.5 py-0.5 rounded text-gray-300">${p.mode} MODE</span>
                </div>
            `;

            div.addEventListener('click', () => {
                const currentActive = this.orchestrator.activeProviderIds;
                if (currentActive.includes(p.id)) {
                    this.orchestrator.setActiveProviders(currentActive.filter(id => id !== p.id));
                } else {
                    this.orchestrator.setActiveProviders([...currentActive, p.id]);
                }
                this.renderAgentList();
            });

            listContainer.appendChild(div);
        });
    }

    renderPipeActions() {
        this.pipeActionsContainer.innerHTML = '';
        const providers = this.orchestrator.getProviders();
        providers.forEach(p => {
            const button = document.createElement('button');
            button.className = 'flex items-center justify-between p-2 rounded bg-surface-dark border border-border-dark hover:border-gray-500 hover:bg-[#2e2e33] transition-all group text-left';
            button.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-gray-200">Pipe to ${p.name}</span>
                    <span class="text-[10px] text-gray-500">Sends scratchpad as User Msg</span>
                </div>
                <span class="material-symbols-outlined text-gray-600 group-hover:text-primary" style="font-size: 18px;">arrow_forward</span>
            `;
            button.addEventListener('click', () => {
                const text = this.scratchpad.value.trim();
                if (text) {
                    this.handleSingleDispatch(p.id, text);
                }
            });
            this.pipeActionsContainer.appendChild(button);
        });
    }
}
