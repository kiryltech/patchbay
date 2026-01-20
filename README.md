# Patchbay

Patchbay is a local, privacy-first control plane for manually routing and patching context between AI web sessions and official APIs. It enables hybrid workflows that combine UI-only capabilities (e.g., Deep Research, Canvas) with fast, stable API-based execution—without running a centralized backend.

## 🚀 Key Features

- **Hybrid Provider Model:** Choose between **Web Mode** (Browser Automation) and **API Mode** (Direct REST) for each AI model independently.
- **Context Piping:** Easily move data between models. Use Gemini Web for research and pipe the result directly to GPT-4 API for code generation.
- **Privacy-First:** All API keys are stored locally in your browser (`localStorage`). No data ever leaves your machine to an intermediate server.
- **Zero-Backend (Production):** The final application is a static web client that communicates directly with AI providers through a Chrome Extension bridge.
- **Orchestra View:** Compare responses from multiple AI models simultaneously.

## 🛠 Project Structure

- `index.html`: The main "Mission Control" dashboard.
- `src/`: Core application logic, including the Orchestration Engine and UI managers.
- `docs/`: Detailed design and architecture documentation.
- `proxy.server.js`: A temporary development proxy to handle CORS before the Chrome Extension is fully implemented.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- NPM

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kiryltech/patchbay.git
   cd patchbay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Environment

During the initial development phases (Phase 1 & 2), a local proxy is required to handle CORS requests to AI providers.

Start the dashboard and proxy simultaneously:
```bash
npm start
```
The dashboard will be available at `http://localhost:5173` (or the port specified by Vite).

## 🗺 Implementation Roadmap



- **Phase 1 (Completed):** API-First Core. Basic dashboard, API adapters, and secure key storage.

- **Phase 2 (In Progress):** Advanced Orchestration. Message history, multi-model broadcasting, and the "Pipe" workflow.

- **Phase 3:** Browser Integration. Chrome Extension setup, CORS transport layer, and Web Mode (DOM automation).
