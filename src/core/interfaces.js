/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 */

/**
 * @typedef {Object} AIProvider
 * @property {string} id - Unique identifier for the provider (e.g., 'gpt-4', 'gemini-ultra')
 * @property {string} name - Display name
 * @property {'API'|'WEB'} mode - Connection mode
 * @property {function(string, Message[]): Promise<string>} sendPrompt - Sends a prompt to the provider
 * @property {function(): Promise<'READY'|'ERROR'|'MISSING_KEY'>} getStatus - Checks provider status
 */
