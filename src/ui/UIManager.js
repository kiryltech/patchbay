import { AnalyticsUI } from './AnalyticsUI.js';

export class UIManager {
    /**
     * @param {import('../core/Orchestrator').Orchestrator} orchestrator
     * @param {import('../core/AnalyticsManager').AnalyticsManager} analyticsManager
     */
    constructor(orchestrator, analyticsManager) {
        this.orchestrator = orchestrator;
        this.analyticsManager = analyticsManager;
        this.analyticsUI = new AnalyticsUI(analyticsManager);
        this.messageContainer = document.getElementById('message-container');
        this.inputElement = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.pipeActionsContainer = document.getElementById('pipe-actions-container');
        this.addAgentButton = document.getElementById('add-agent-button');
        this.agentCatalogModal = document.getElementById('agent-catalog-modal');
        this.closeCatalogButton = document.getElementById('close-catalog-button');
        this.agentCatalogList = document.getElementById('agent-catalog-list');
        this.settingsButton = document.getElementById('settings-button');
        this.analyticsButton = document.getElementById('open-analytics-button');
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
        this.renderExternalAgents();
        this.updateCostEstimate();
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleSend());
        
        // Keydown for navigation and sending
        this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.inputElement.addEventListener('input', () => {
            this.handleAutocomplete();
            this.updateCostEstimate();
        });

        this.addAgentButton.addEventListener('click', () => this.openCatalog());
        this.closeCatalogButton.addEventListener('click', () => this.closeCatalog());
        
        if (this.analyticsButton) {
            this.analyticsButton.addEventListener('click', () => this.analyticsUI.open());
        }
    }

    estimateTokens(text) {
        return Math.ceil((text || '').length / 4);
    }

    updateCostEstimate() {
        const rawText = this.inputElement.value;
        const { targets } = this.parseInput(rawText);
        
        let targetProviders = [];
        if (targets.includes('@all') || targets.includes('@everyone')) {
            targetProviders = this.orchestrator.getActiveProviders();
        } else if (targets.length > 0) {
            targetProviders = this.orchestrator.getProviders().filter(p => {
                const pNameNormalized = p.name.toLowerCase().replace(/\s+/g, '');
                return targets.some(t => {
                    const targetNameNormalized = t.substring(1).toLowerCase().replace(/\s+/g, '');
                    return pNameNormalized.includes(targetNameNormalized) || targetNameNormalized.includes(pNameNormalized);
                });
            });
        }
        
        // Filter out external agents for cost calculation as they don't have API pricing
        targetProviders = targetProviders.filter(p => p.mode !== 'EXTERNAL');

        if (targetProviders.length === 0) {
            const countEl = document.getElementById('token-count');
            if (countEl) {
                countEl.textContent = 'Est. Cost: $0.0000';
                countEl.title = 'No active agents targeted';
                countEl.className = 'text-[11px] font-medium text-slate-400';
            }
            return;
        }

        const history = this.orchestrator.getConversationHistory();
        const historyText = history.map(m => m.content).join(' ');
        const totalInputText = historyText + ' ' + rawText;
        const inputTokens = this.estimateTokens(totalInputText);
        const estimatedOutputTokens = 500; // Guestimate

        let totalCost = 0;
        let breakdown = [];

        targetProviders.forEach(p => {
            if (!p.pricing) return;
            const inputCost = (inputTokens / 1_000_000) * p.pricing.input;
            const outputCost = (estimatedOutputTokens / 1_000_000) * p.pricing.output;
            const agentTotal = inputCost + outputCost;
            totalCost += agentTotal;
            
            breakdown.push(`${p.name}: $${agentTotal.toFixed(4)} (In: ${inputTokens}, Out: ~${estimatedOutputTokens})`);
        });

        const countEl = document.getElementById('token-count');
        if (countEl) {
            countEl.textContent = `Est. Cost: $${totalCost.toFixed(4)}`;
            countEl.title = breakdown.join('\n');
            countEl.className = 'text-[11px] font-medium text-emerald-600 dark:text-emerald-400 cursor-help';
        }
    }

    exportSession() {
        const history = this.orchestrator.getConversationHistory();
        if (!history || history.length === 0) {
            alert("No conversation history to export.");
            return;
        }

        const data = JSON.stringify(history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `patchbay-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    getTargetProviders(text) {
        const { targets } = this.parseInput(text);
        if (targets.includes('@all') || targets.includes('@everyone')) {
            return this.orchestrator.getActiveProviders();
        }
        if (targets.length === 0) return [];
        
        const allProviders = this.orchestrator.getProviders();
        return allProviders.filter(p => {
            const pNameNormalized = p.name.toLowerCase().replace(/\s+/g, '');
            return targets.some(t => {
                const targetNameNormalized = t.substring(1).toLowerCase().replace(/\s+/g, '');
                // Use startsWith for safer matching
                return targetNameNormalized.length > 0 && pNameNormalized.startsWith(targetNameNormalized);
            });
        });
    }

    async handleSend() {
        const rawText = this.inputElement.value;
        if (!rawText.trim()) return;

        this.appendMessage({ role: 'user', content: rawText, providerId: 'user' });
        this.inputElement.value = '';

        const { cleanText } = this.parseInput(rawText);
        const targetProviders = this.getTargetProviders(rawText);
        const targetIds = targetProviders.map(p => p.id);
        
        // Show typing indicators only for non-external agents
        targetProviders
            .filter(p => p.mode !== 'EXTERNAL')
            .forEach(p => this.showTypingIndicator(p.id));

        // Dispatch the prompt
        const dispatchPromise = this.orchestrator.dispatch(cleanText, targetIds, (result) => {
            this.removeTypingIndicator(result.providerId);
            if (result.error) {
                this.appendMessage({ role: 'system', content: `Error from ${result.providerId}: ${result.error.message}` });
            } else {
                this.appendMessage({ role: 'assistant', content: result.response, providerId: result.providerId });
            }
            this.updateCostEstimate();
        }, rawText); // Pass raw text for history
        
        this.updateCostEstimate();
        await dispatchPromise;
    }

    parseInput(text) {
        // Regex to capture @Agent Name (handling spaces if needed, though simple syntax preferred)
        // Added parentheses to allow handles like @Claude(WebUI)
        const mentionRegex = /@([a-zA-Z0-9.\-_()]+|"[^"]+")/g; 
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
            const participants = this.orchestrator.getActiveProviders();
            const suggestions = [
                { name: 'all', type: 'alias' },
                { name: 'everyone', type: 'alias' },
                ...participants.map(p => ({ name: p.name.replace(/\s+/g, ''), type: 'agent', id: p.id, displayName: p.name }))
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
            item.className = `px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'}`;
            
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

        const provider = this.orchestrator.providers.get(providerId);
        const typingDiv = document.createElement('div');
        typingDiv.className = 'flex gap-4 group';
        typingDiv.innerHTML = `
            <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <span class="material-symbols-outlined">${this.agentVisuals.get(providerId)?.icon || 'smart_toy'}</span>
            </div>
            <div class="flex flex-col gap-1.5 max-w-[85%]">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${provider.name}</span>
                    <span class="text-[10px] text-slate-400 font-medium">Thinking...</span>
                </div>
                <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl rounded-tl-none custom-shadow">
                     <div class="flex gap-1 h-6 items-center px-2">
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            </div>
        `;
        
        this.messageContainer.appendChild(typingDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        this.typingIndicators.set(providerId, typingDiv);
    }

    removeTypingIndicator(providerId) {
        const indicator = this.typingIndicators.get(providerId);
        if (indicator) {
            indicator.remove();
            this.typingIndicators.delete(providerId);
        }
    }

    appendMessage(message) {
        const { role, content, providerId } = message;
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        if (role === 'system') {
            const systemMessageDiv = document.createElement('div');
            systemMessageDiv.className = 'flex justify-center';
            systemMessageDiv.innerHTML = `<span class="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-semibold text-slate-500 uppercase tracking-wider">${content}</span>`;
            this.messageContainer.appendChild(systemMessageDiv);
        } else if (role === 'user') {
            const userMessageDiv = document.createElement('div');
            userMessageDiv.className = 'flex gap-4 flex-row-reverse group';
            userMessageDiv.innerHTML = `
                <div class="size-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0 bg-cover bg-center" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAwTAPx41g5E_vGYVGa1o-1_isrJ6sY0JbqKsfftIWxbaTJ-eyI-Jp6tV45XNh0hiHCHgtl20O2Eg-nARmFiNUcZlzgURxvlrmMzcD_EndCoc7Uiz5b87SX4WUcca9Jf_5JtcEm-OchOOyA18IuTbDt5_kWi_NJX4WurlKtjR9C29UgLkfIDz66m7Imvj5sA2jlqMB5XhuccPBMRtEf4IQ2_UUup08t6nU9VygdNTswgCjYX6YuMiRLANVKI7XgGZxLR0OrVYj7HWyK')"></div>
                <div class="flex flex-col gap-1.5 items-end max-w-[85%]">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-400 font-medium">${timeString}</span>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200">You</span>
                    </div>
                    <div class="bg-primary text-white p-4 rounded-xl rounded-tr-none shadow-sm shadow-primary/20">
                        <p class="text-[15px] leading-relaxed">${this.escapeHtml(content)}</p>
                    </div>
                </div>
            `;
            this.messageContainer.appendChild(userMessageDiv);
        } else if (role === 'assistant') {
            const provider = this.orchestrator.providers.get(providerId);
            const agentMessageDiv = document.createElement('div');
            agentMessageDiv.className = 'flex gap-4 group';
            const renderedContent = this.mdConverter.makeHtml(content);
            agentMessageDiv.innerHTML = `
                <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                    <span class="material-symbols-outlined">${this.agentVisuals.get(providerId)?.icon || 'smart_toy'}</span>
                </div>
                <div class="flex flex-col gap-1.5 max-w-[85%]">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${provider.name}</span>
                        <span class="text-[10px] text-slate-400 font-medium">${timeString}</span>
                    </div>
                    <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl rounded-tl-none custom-shadow">
                        <div class="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed message-content">${renderedContent}</div>
                    </div>
                </div>
            `;
            this.messageContainer.appendChild(agentMessageDiv);
        }

        // Spacer for scrolling
        const spacer = document.createElement('div');
        spacer.className = 'h-24';
        this.messageContainer.appendChild(spacer);

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

        const participants = this.orchestrator.getActiveProviders();
        if (participants.length === 0) {
            listContainer.innerHTML = `<p class="px-3 py-2 text-xs text-slate-400">No active agents.</p>`;
            return;
        }

        participants.forEach((p, index) => {
            const link = document.createElement('a');
            link.href = '#';
            const isActive = index === 0; // Assuming the first agent is active for now
            link.className = `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`;
            link.dataset.id = p.id;

            const visuals = this.agentVisuals.get(p.id);
            const icon = p.mode === 'EXTERNAL' ? 'sync_alt' : (visuals?.icon || 'smart_toy');

            link.innerHTML = `
                <span class="material-symbols-outlined text-xl">${icon}</span>
                <span class="text-sm font-semibold">${p.name}</span>
                ${isActive ? '<span class="ml-auto size-2 rounded-full bg-primary animate-pulse"></span>' : ''}
            `;

            // Add a remove button (optional, can be added to a context menu or settings)
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-agent-button invisible group-hover:visible text-slate-400 hover:text-red-500 ml-auto';
            removeButton.dataset.id = p.id;
            removeButton.innerHTML = `<span class="material-symbols-outlined text-base">close</span>`;
            removeButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.orchestrator.removeParticipant(p.id);
                this.renderAgentList();
                this.renderExternalAgents();
            };

            if (!isActive) {
                link.appendChild(removeButton);
            }

            listContainer.appendChild(link);
        });
    }

    openCatalog() {
        this.renderAgentCatalog();
        this.agentCatalogModal.classList.remove('hidden');
    }

    closeCatalog() {
        this.agentCatalogModal.classList.add('hidden');
    }

    renderAgentCatalog() {
        this.agentCatalogList.innerHTML = '';
        const allProviders = this.orchestrator.getProviders();
        const hangarIds = this.orchestrator.hangarParticipantIds;

        allProviders.forEach(p => {
            const isParticipant = hangarIds.includes(p.id);
            const visuals = this.agentVisuals.get(p.id);
            const button = document.createElement('button');
            button.className = `w-full flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
            button.disabled = isParticipant;
            button.innerHTML = `
                <div class="flex items-center gap-4 text-left">
                    <div class="size-10 rounded-lg border flex items-center justify-center shrink-0" style="border-color: ${visuals.color}60; background-color: ${visuals.color}10;">
                        <span class="material-symbols-outlined" style="color: ${visuals.color};">${visuals.icon}</span>
                    </div>
                    <div>
                        <div class="font-bold text-slate-700 dark:text-slate-200">${p.name}</div>
                        <div class="text-xs text-slate-500 font-mono">${p.id}</div>
                    </div>
                </div>
                ${isParticipant ?
                    '<span class="material-symbols-outlined text-emerald-500">check_circle</span>' :
                    '<span class="material-symbols-outlined text-slate-400">add_circle</span>'}
            `;

            if (!isParticipant) {
                button.addEventListener('click', () => {
                    this.orchestrator.addParticipant(p.id);
                    this.renderAgentList();
                    this.renderExternalAgents();
                    this.closeCatalog();
                });
            }
            this.agentCatalogList.appendChild(button);
        });
    }

    renderExternalAgents() {
        this.pipeActionsContainer.innerHTML = ''; // Clear content

        // 1. External Agents Section
        const externalAgents = this.orchestrator.getProviders().filter(p => p.mode === 'EXTERNAL');
        
        if (externalAgents.length > 0) {
            const agentsContainer = document.createElement('div');
            agentsContainer.className = 'space-y-4 mb-8';
            agentsContainer.innerHTML = `<p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">External Agents</p>`;
            
            externalAgents.forEach(agent => {
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm';
                
                // Header
                const header = document.createElement('div');
                header.className = 'flex items-center justify-between';
                header.innerHTML = `
                     <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">link</span>
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${agent.name}</span>
                     </div>
                     <span class="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">READY</span>
                `;
                card.appendChild(header);

                // Sync Button
                const syncBtn = document.createElement('button');
                syncBtn.className = 'w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors';
                syncBtn.innerHTML = `<span class="material-symbols-outlined text-sm">content_copy</span> Copy Context (Sync)`;
                syncBtn.onclick = () => {
                    const delta = agent.getDeltaContext(this.orchestrator.getConversationHistory());
                    navigator.clipboard.writeText(delta).then(() => {
                        const originalText = syncBtn.innerHTML;
                        syncBtn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span> Copied!`;
                        syncBtn.classList.add('text-emerald-500');
                        setTimeout(() => {
                            syncBtn.innerHTML = originalText;
                            syncBtn.classList.remove('text-emerald-500');
                        }, 2000);
                    });
                };
                card.appendChild(syncBtn);

                // Paste Area
                const pasteContainer = document.createElement('div');
                pasteContainer.className = 'space-y-2';
                
                const textarea = document.createElement('textarea');
                textarea.className = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-slate-400';
                textarea.rows = 2;
                textarea.placeholder = 'Paste response here...';
                
                const injectBtn = document.createElement('button');
                injectBtn.className = 'w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors';
                injectBtn.innerHTML = `<span class="material-symbols-outlined text-sm">input</span> Inject Response`;
                injectBtn.onclick = () => {
                    const text = textarea.value;
                    if (text.trim()) {
                        agent.pasteResponse(text, this.orchestrator);
                        textarea.value = '';
                        // Refresh UI to show new message
                        this.appendMessage({
                            role: 'assistant',
                            content: text,
                            providerId: agent.id
                        });
                        this.updateCostEstimate();
                    }
                };

                pasteContainer.appendChild(textarea);
                pasteContainer.appendChild(injectBtn);
                card.appendChild(pasteContainer);

                agentsContainer.appendChild(card);
            });
            
            this.pipeActionsContainer.appendChild(agentsContainer);
        }

        // 2. Static Content (Manage Session & Network Health)
        const staticContent = document.createElement('div');
        staticContent.innerHTML = `
            <div class="space-y-8">
                <!-- Export Options -->
                <div class="space-y-4">
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Manage Session</p>
                    <button id="export-session-button" class="w-full flex items-center gap-3 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-lg">download</span>
                        Export Session
                    </button>
                    <button class="w-full flex items-center gap-3 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-lg">share</span>
                        Share Bridge
                    </button>
                    <button class="w-full flex items-center gap-3 px-4 py-2 border border-rose-100 dark:border-rose-900 text-rose-500 rounded-lg text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <span class="material-symbols-outlined text-lg">stop_circle</span>
                        Terminate Bridge
                    </button>
                </div>

                <!-- Performance Mini-Graph -->
                <div class="space-y-4">
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Network Health</p>
                    <div class="h-16 w-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden flex items-end p-1 gap-1 border border-slate-100 dark:border-slate-800">
                        <div class="flex-1 bg-primary/20 rounded-sm h-[40%]"></div>
                        <div class="flex-1 bg-primary/20 rounded-sm h-[60%]"></div>
                        <div class="flex-1 bg-primary/30 rounded-sm h-[55%]"></div>
                        <div class="flex-1 bg-primary/40 rounded-sm h-[80%]"></div>
                        <div class="flex-1 bg-primary rounded-sm h-[95%]"></div>
                        <div class="flex-1 bg-primary/50 rounded-sm h-[70%]"></div>
                        <div class="flex-1 bg-primary/20 rounded-sm h-[30%]"></div>
                    </div>
                </div>
            </div>
        `;
        this.pipeActionsContainer.appendChild(staticContent);

        // Re-bind the export session button event
        const exportButton = document.getElementById('export-session-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSession());
        }
    }
}