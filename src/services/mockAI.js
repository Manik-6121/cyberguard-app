/**
 * mockAI.js - Client-Side AI Service Proxy
 *
 * Sends chat prompts and conversation history to the server-side `/api/chat`
 * endpoint so that Gemini API credentials stay exclusively on the server.
 */

/**
 * generateCyberGuardResponse
 *
 * Calls the backend `/api/chat` endpoint with the user prompt and prior history.
 * Safely handles non-JSON responses so proxy/network errors display cleanly.
 *
 * @param {string} userMessage - The raw text input from the user
 * @param {Array} chatHistory - Previous messages for context window
 * @returns {Promise<string>} - The AI's markdown-formatted response
 */
export async function generateCyberGuardResponse(userMessage, chatHistory = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory,
      }),
    });

    const rawText = await response.text();
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const fallbackMsg =
        response.status === 403
          ? 'Access denied or invalid Gemini API key. Please check your GEMINI_API_KEY in the Settings > Secrets panel.'
          : `Request failed with status ${response.status}. Please try again.`;
      return `### ⚠️ Unable to Generate Response\n${data?.error || fallbackMsg}`;
    }

    if (!data || typeof data.text !== 'string') {
      return `### ⚠️ Unable to Generate Response\nThe server returned an unexpected response while warming up. Please try again in a moment.`;
    }

    return data.text;
  } catch (error) {
    console.warn('CyberGuard API request error:', error);
    return `### ⚠️ Unable to Generate Response\n${error.message || 'An unexpected error occurred while contacting CyberGuard AI.'}`;
  }
}
