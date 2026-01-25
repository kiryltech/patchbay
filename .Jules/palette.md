## 2024-05-23 - Interactive Icons Pattern
**Learning:** The app frequently uses `span.material-symbols-outlined` with click listeners for actions. This lacks keyboard accessibility (tab focus, enter key) and screen reader support.
**Action:** Always wrap interactive icons in `<button>` elements with `aria-label` and move event listeners to the button.
