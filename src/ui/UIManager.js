export class UIManager {
    /**
     * @param {import('../core/Orchestrator').Orchestrator} orchestrator
     */
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.messageContainer = document.getElementById('message-container');
        this.inputElement = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.scratchpad = document.getElementById('scratchpad');
        this.pipeActionsContainer = document.getElementById('pipe-actions-container');
        this.autocompletePopup = document.getElementById('autocomplete-popup');

        this.agentVisuals = new Map();
        this.typingIndicators = new Map();
        this.selectedIndex = -1;
        this.currentSuggestions = [];

        // Initialize Markdown converter
        this.mdConverter = new showdown.Converter({
            tables: true,
            strikethrough: true,
            tasklists: true,
            codeSpans: true
        });
    }

    init() {
        this.initializeAgentVisuals();
        this.bindEvents();
        this.renderAgentList();
        this.renderPipeActions();
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleSend());
        
        // Keydown for navigation and sending
        this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.inputElement.addEventListener('input', () => this.handleAutocomplete());

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.inputElement.contains(e.target) && !this.autocompletePopup.contains(e.target)) {
                this.closeAutocomplete();
            }
        });
    }

    handleKeydown(e) {
        if (!this.autocompletePopup.classList.contains('hidden')) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.currentSuggestions.length;
                this.renderAutocomplete(this.currentSuggestions, this.currentMatchText);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.currentSuggestions.length) % this.currentSuggestions.length;
                this.renderAutocomplete(this.currentSuggestions, this.currentMatchText);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < this.currentSuggestions.length) {
                    this.selectSuggestion(this.currentSuggestions[this.selectedIndex].name, this.currentMatchText);
                }
            } else if (e.key === 'Escape') {
                this.closeAutocomplete();
            }
        } else {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        }
    }

    initializeAgentVisuals() {
        const colors = ['#00aeff', '#ff6b6b', '#48dbfb', '#ff9f43', '#1dd1a1'];
        const icons = ['smart_toy', 'psychology', 'neurology', 'model_training', 'hub'];
        const providers = this.orchestrator.getProviders();
        providers.forEach((provider, index) => {
            this.agentVisuals.set(provider.id, {
                color: colors[index % colors.length],
                icon: icons[index % icons.length]
            });
        });
    }

    async handleSend() {
        const rawText = this.inputElement.value;
        if (!rawText.trim()) return;

        this.appendMessage({ role: 'user', content: rawText, providerId: 'user' });
        this.inputElement.value = '';

        const { targets, cleanText } = this.parseInput(rawText);
        let targetIds = [];

        if (targets.includes('@all') || targets.includes('@everyone')) {
            targetIds = this.orchestrator.getActiveProviders().map(p => p.id);
        } else if (targets.length > 0) {
            // Robust matching: Check if normalized provider name contains the normalized target
            targetIds = this.orchestrator.getProviders()
                .filter(p => {
                    const pNameNormalized = p.name.toLowerCase().replace(/\s+/g, '');
                    return targets.some(t => {
                        const targetNameNormalized = t.substring(1).toLowerCase().replace(/\s+/g, ''); // remove @ and spaces
                        return pNameNormalized.includes(targetNameNormalized) || targetNameNormalized.includes(pNameNormalized);
                    });
                })
                .map(p => p.id);
        }
        
        // "Passive by Default" - if targetIds is empty, dispatch will just save to history.
        
        // Show typing indicators for all targeted agents
        targetIds.forEach(id => this.showTypingIndicator(id));

        // Dispatch the prompt
        await this.orchestrator.dispatch(cleanText, targetIds, (result) => {
            this.removeTypingIndicator(result.providerId);
            if (result.error) {
                this.appendMessage({ role: 'system', content: `Error from ${result.providerId}: ${result.error.message}` });
            } else {
                this.appendMessage({ role: 'assistant', content: result.response, providerId: result.providerId });
            }
        }, rawText); // Pass raw text for history
    }

    parseInput(text) {
        // Regex to capture @Agent Name (handling spaces if needed, though simple syntax preferred)
        const mentionRegex = /@([a-zA-Z0-9.\-_]+|"[^"]+")/g; 
        const matches = text.match(mentionRegex) || [];
        const targets = matches.map(m => m.replace(/"/g, '').toLowerCase());
        const cleanText = text.replace(mentionRegex, '').trim();
        return { targets, cleanText };
    }

    handleAutocomplete() {
        const cursorPosition = this.inputElement.selectionStart;
        const textBeforeCursor = this.inputElement.value.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            const query = match[1].toLowerCase();
            const providers = this.orchestrator.getProviders();
            const suggestions = [
                { name: 'all', type: 'alias' },
                { name: 'everyone', type: 'alias' },
                ...providers.map(p => ({ name: p.name.replace(/\s+/g, ''), type: 'agent', id: p.id, displayName: p.name }))
            ];

            const filtered = suggestions.filter(s => s.name.toLowerCase().startsWith(query));

            if (filtered.length > 0) {
                this.currentSuggestions = filtered;
                this.currentMatchText = match[0];
                if (this.selectedIndex === -1) this.selectedIndex = 0;
                this.renderAutocomplete(filtered, match[0]);
                this.autocompletePopup.classList.remove('hidden');
            } else {
                this.closeAutocomplete();
            }
        } else {
            this.closeAutocomplete();
        }
    }

    closeAutocomplete() {
        this.autocompletePopup.classList.add('hidden');
        this.selectedIndex = -1;
        this.currentSuggestions = [];
    }

    renderAutocomplete(suggestions, matchText) {
        this.autocompletePopup.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'py-1';

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            const isSelected = index === this.selectedIndex;
            item.className = `px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary/20 text-white' : 'hover:bg-[#27272a] text-gray-200'}`;
            
            let icon = 'alternate_email';
            let color = '#9ca3af'; // gray-400

            if (suggestion.type === 'agent') {
                const visuals = this.agentVisuals.get(suggestion.id);
                if (visuals) {
                    icon = visuals.icon;
                    color = visuals.color;
                }
            }

            item.innerHTML = `
                <span class="material-symbols-outlined text-sm" style="color: ${color};">${icon}</span>
                <span class="text-sm">${suggestion.displayName || suggestion.name}</span>
                ${suggestion.type === 'alias' ? '<span class="text-[10px] text-gray-500 ml-auto font-mono">BROADCAST</span>' : ''}
            `;

            item.addEventListener('click', () => {
                this.selectSuggestion(suggestion.name, matchText);
            });

            list.appendChild(item);
        });

        this.autocompletePopup.appendChild(list);
    }

    selectSuggestion(name, matchText) {
        const cursorPosition = this.inputElement.selectionStart;
        const text = this.inputElement.value;
        const newText = text.substring(0, cursorPosition - matchText.length) + 
                       `@${name} ` + 
                       text.substring(cursorPosition);
        
        this.inputElement.value = newText;
        this.closeAutocomplete();
        this.inputElement.focus();
    }

    showTypingIndicator(providerId) {
        if (this.typingIndicators.has(providerId)) return;

        const visuals = this.agentVisuals.get(providerId);
        const provider = this.orchestrator.providers.get(providerId);

        const indicator = document.createElement('div');
        indicator.className = 'flex gap-3';
        indicator.innerHTML = `
            <div class="size-8 rounded border flex items-center justify-center shrink-0" style="border-color: ${visuals.color}60; background-color: ${visuals.color}10;">
                <span class="material-symbols-outlined text-sm" style="color: ${visuals.color};">${visuals.icon}</span>
            </div>
            <div class="flex-1 space-y-2">
                <div class="text-xs font-mono mb-1" style="color: ${visuals.color};">${provider.name.toUpperCase()}</div>
                <div class="bg-[#121212] border border-border-dark rounded-lg rounded-tl-none p-4 w-full">
                    <div class="flex items-center gap-2">
                        <div class="size-2 bg-primary rounded-full animate-pulse"></div>
                        <div class="size-2 bg-primary rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
                        <div class="size-2 bg-primary rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
                    </div>
                </div>
            </div>`;

        this.messageContainer.appendChild(indicator);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        this.typingIndicators.set(providerId, indicator);
    }

    removeTypingIndicator(providerId) {
        if (this.typingIndicators.has(providerId)) {
            this.typingIndicators.get(providerId).remove();
            this.typingIndicators.delete(providerId);
        }
    }

    appendMessage(message) {
        // Clear initial message
        if (this.messageContainer.querySelector('.opacity-50')) {
            this.messageContainer.innerHTML = '';
        }

        const { role, content, providerId } = message;
        const div = document.createElement('div');
        div.className = `flex gap-3 ${role === 'user' ? 'justify-end' : ''}`;

        let contentHtml = '';

        if (role === 'user') {
            contentHtml = `
                <div class="bg-surface-dark border border-border-dark rounded-lg rounded-tr-none px-4 py-3 max-w-[85%]">
                    <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">${this.escapeHtml(content)}</p>
                </div>
                <div class="size-8 rounded bg-gradient-to-br from-primary to-blue-700 shrink-0"></div>
            `;
        } else if (role === 'assistant') {
            const provider = this.orchestrator.providers.get(providerId);
            const visuals = this.agentVisuals.get(providerId);
            const renderedContent = this.mdConverter.makeHtml(content);
            
            contentHtml = `
                <div class="size-8 rounded border flex items-center justify-center shrink-0" style="border-color: ${visuals.color}60; background-color: ${visuals.color}10;">
                    <span class="material-symbols-outlined text-sm" style="color: ${visuals.color};">${visuals.icon}</span>
                </div>
                <div class="flex-1 space-y-2">
                    <div class="text-xs font-mono mb-1 flex justify-between items-center" style="color: ${visuals.color};">
                        <span>${provider.name.toUpperCase()}</span>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-gray-600 hover:text-primary cursor-pointer copy-icon" style="font-size: 16px;">content_copy</span>
                            <span class="material-symbols-outlined text-gray-600 hover:text-primary cursor-pointer pipe-icon" style="font-size: 16px;">shortcut</span>
                        </div>
                    </div>
                    <div class="bg-[#121212] border border-border-dark rounded-lg rounded-tl-none p-4 w-full message-content prose prose-invert prose-sm max-w-none">
                        ${renderedContent}
                    </div>
                </div>
            `;
        } else { // System error
             contentHtml = `
                <div class="flex-1 space-y-2">
                    <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 w-full">
                        <p class="text-sm text-red-400 font-mono">${this.escapeHtml(content)}</p>
                    </div>
                </div>
            `;
        }

        div.innerHTML = contentHtml;
        this.messageContainer.appendChild(div);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;

        div.querySelector('.copy-icon')?.addEventListener('click', () => {
            navigator.clipboard.writeText(content);
        });
        div.querySelector('.pipe-icon')?.addEventListener('click', () => {
            this.scratchpad.value = content;
        });
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
            const visuals = this.agentVisuals.get(p.id);
            button.className = 'flex items-center justify-between p-2 rounded bg-surface-dark border border-border-dark hover:border-gray-500 hover:bg-[#2e2e33] transition-all group text-left';
            button.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-gray-200">Pipe to ${p.name}</span>
                    <span class="text-[10px] text-gray-500">Sends scratchpad as User Msg</span>
                </div>
                <span class="material-symbols-outlined text-gray-600 group-hover:text-primary" style="font-size: 18px; color: ${visuals.color};">arrow_forward</span>
            `;
            button.addEventListener('click', () => {
                const text = this.scratchpad.value.trim();
                if (text) {
                    this.inputElement.value = `@${p.name} ${text}`;
                    this.handleSend();
                }
            });
            this.pipeActionsContainer.appendChild(button);
        });
    }
}
