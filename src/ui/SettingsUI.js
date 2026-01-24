export class SettingsUI {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-[#18181b] border border-border-dark rounded-lg p-6 w-96 shadow-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold text-white">Settings</h2>
                    <button id="close-settings" class="text-gray-400 hover:text-white">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-mono text-gray-400 mb-1">OPENAI API KEY</label>
                        <input type="password" id="openai-key" class="w-full bg-[#121212] border border-border-dark rounded p-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="sk-...">
                    </div>
                    <div>
                        <label class="block text-xs font-mono text-gray-400 mb-1">GEMINI API KEY</label>
                        <input type="password" id="gemini-key" class="w-full bg-[#121212] border border-border-dark rounded p-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="AIza...">
                    </div>
                    <div>
                        <label class="block text-xs font-mono text-gray-400 mb-1">ANTHROPIC API KEY</label>
                        <input type="password" id="anthropic-key" class="w-full bg-[#121212] border border-border-dark rounded p-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="sk-ant-...">
                    </div>
                    <button id="save-settings" class="w-full bg-primary hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors">
                        Save Keys
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;

        // Load saved keys
        const openAIKey = localStorage.getItem('openai_key');
        const geminiKey = localStorage.getItem('gemini_key');
        const anthropicKey = localStorage.getItem('anthropic_key');
        if (openAIKey) document.getElementById('openai-key').value = openAIKey;
        if (geminiKey) document.getElementById('gemini-key').value = geminiKey;
        if (anthropicKey) document.getElementById('anthropic-key').value = anthropicKey;
    }

    bindEvents() {
        const openBtn = document.getElementById('settings-button');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.toggle());
        }

        document.getElementById('close-settings').addEventListener('click', () => this.toggle());
        document.getElementById('save-settings').addEventListener('click', () => this.save());

        // Close on click outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.toggle();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.modal.classList.remove('hidden');
        } else {
            this.modal.classList.add('hidden');
        }
    }

    save() {
        const openAIKey = document.getElementById('openai-key').value;
        const geminiKey = document.getElementById('gemini-key').value;
        const anthropicKey = document.getElementById('anthropic-key').value;

        localStorage.setItem('openai_key', openAIKey);
        localStorage.setItem('gemini_key', geminiKey);
        localStorage.setItem('anthropic_key', anthropicKey);

        alert('Settings saved!');
        this.toggle();
    }

    getOpenAIKey() {
        return localStorage.getItem('openai_key');
    }

    getGeminiKey() {
        return localStorage.getItem('gemini_key');
    }

    getAnthropicKey() {
        return localStorage.getItem('anthropic_key');
    }
}
