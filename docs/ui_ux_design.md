# UI/UX Design Document: Local AI Orchestrator

| Metadata   | Details                                 |
|:-----------|:----------------------------------------|
| **Status** | Draft v1.0                              |
| **Focus**  | Local Control Center (Web Client)       |
| **Theme**  | "Mission Control" / Developer Dashboard |

## 1. Design Philosophy

* **Privacy-First Aesthetic:** The UI should feel local and secure. No cloud sync icons, no "login" screens.
* **High Density, Low Noise:** Designed for power users. maximize screen real estate for content (chat logs, code)
  rather than decorative elements.
* **Mode Clarity:** It must be instantly obvious whether a model is running in **API Mode** (Fast, Automated) or **Web
  Mode** (Browser Automation).

## 2. Visual System

* **Color Palette:**
    * **Background:** Deep Gunmetal (`#1E1E1E`) - Standard modern IDE feel.
    * **Primary Accent:** Cyber Blue (`#00B0FF`) - Used for active states and primary actions.
    * **Status Indicators:**
        * 🟢 **API Mode:** Green Dot (Stable, Direct).
        * 🟠 **Web Mode:** Orange Dot (Dependent on Browser Tab).
        * 🔴 **Error:** Red Dot (Disconnected/Missing Key).
* **Typography:** Monospace fonts (e.g., JetBrains Mono, Fira Code) for all input/output text. System sans-serif for UI
  labels.
* **Spacing:** Compact. Minimal padding to allow side-by-side model comparisons.

## 3. Core Layout: "The Cockpit"

The application is a single-screen dashboard divided into three vertical panes.

### 3.1 Left Pane: The Hangar (Model Selection)

* **List of Agents:** Vertical list of configured providers (e.g., "GPT-4 (API)", "Gemini (Web)", "Claude (Web)").
* **Status Badges:** Each item shows the connection status.
* **Quick Toggles:** Small switches next to each agent to enable/disable them for the current "Broadcast" (sending one
  prompt to multiple AIs).

### 3.2 Center Pane: The Stage (Interaction Area)

This is the main workspace. It supports two view modes:

1. **Focused View (Single Model):**
    * Standard chat interface.
    * **Header:** Model Name, Mode Switcher (Dropdown: [API | Web]), and "Connection Status".
    * **Body:** Message history.
    * **Controls:** "Clear Context", "Copy All".

2. **Orchestra View (Multi-Model):**
    * Split-screen grid (2x2 or side-by-side).
    * Allows comparing responses from different models simultaneously.

### 3.3 Right Pane: The Pipeline (Context Manager)

* **Context Staging:** A scratchpad area where users can drag-and-drop text snippets from the Center Pane.
* **Pipe Actions:** Buttons to "Send Staged Text to..." -> Select Target Model.
    * *Example:* "Summarize this" (from Gemini Web) -> **[Pipe]** -> "To ChatGPT API".

## 4. Key User Flows

### 4.1 First Run (Onboarding)

1. **Landing:** "Welcome to Patchbay. No data leaves this device."
2. **Setup:**
    * Prompt for OpenAI API Key (Stored in `localStorage`).
    * Prompt for Gemini API Key (Optional).
    * Grant Permissions (if Extension is installed).

### 4.2 The "Hybrid" Switch

* **Trigger:** User clicks the "Mode" dropdown in the chat header.
* **Action:** Changes "GPT-4" from **API** to **Web**.
* **Visual Feedback:**
    * The Green "API" indicator turns Orange "Web".
    * A toast message appears: "Connected to tab: https://chat.openai.com".
    * The input box may show a warning: "Web Mode: Automation may be slower."

### 4.3 The "Pipe" Workflow

1. **Source:** User receives a long research report from Gemini (Web Mode).
2. **Action:** User clicks a small "Pipe" icon next to the message.
3. **Target:** A modal/popover appears: "Pipe to...?" -> User selects "GPT-4 (API)".
4. **Execution:** The text is automatically pasted into the GPT-4 input field with a prefix: "Context from Gemini: ...".

## 5. Input Area Design (The Command Deck)

Located at the bottom of the Center Pane.

* **Multi-Line Input:** Auto-expanding text area.
* **Broadcast Toggle:** Checkbox "Send to All Active".
* **Attachment Icon:** For pasting images/files (API mode only initially).
* **Send Button:** Shows the cost estimate if in API mode (e.g., "Send (~$0.02)").

## 6. Mobile Responsiveness

* **Priority:** Low. This is a power-user desktop tool.
* **Strategy:** On mobile, collapse Left and Right panes into "Drawer" menus. Focus entirely on the active Chat Stream.
