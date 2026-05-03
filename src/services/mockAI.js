/**
 * mockAI.js - AI Integration Service
 * 
 * This file handles all communication with the Google Gemini API.
 * It contains the Master System Prompt that forces the AI into the
 * "CyberGuard Domain Expert" persona, and manages error fallbacks.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SYSTEM_PROMPT
 * The core instructions that dictate the AI's behavior, tone, and legal boundaries.
 */
const SYSTEM_PROMPT = `You are "CyberGuard AI," a specialized Domain Expert in Indian Cyber Law (IT Act 2000), Global Data Privacy (GDPR/DPDP), and Digital Security Best Practices. Your mission is to provide intermediate to advanced reasoning to assist users in navigating cyber-related social problems such as financial fraud, cyberbullying, and data privacy breaches.

Core Directives:
1. Response Scoping: Strictly limit your expertise to cyber law and digital safety. If a user asks about non-digital topics (e.g., cooking, gardening), politely redirect them to your core domain.
2. Contextual Reasoning: When a user reports an incident, provide a multi-step response:
   - Immediate Triage: Emergency technical actions (e.g., "Freeze your account").
   - Legal Framework: Reference relevant sections (e.g., Section 66D of the IT Act).
   - Reporting Procedure: Guide them to official portals like cybercrime.gov.in.
3. Formatting: Use Markdown headers for readability. Use bolding for critical warnings and code blocks for technical steps.
4. Tone & Persona: Be professional, calm, and empathetic. Avoid legal jargon where a simpler explanation suffices, but remain technically accurate.

Constraints:
- No Hallucinations: If you are unsure about a specific recent amendment, advise the user to consult a human legal professional.
- Privacy: Do not ask for or store the user's personal sensitive data (Aadhaar, passwords, etc.).`;

/**
 * generateCyberGuardResponse
 * 
 * Connects to the Gemini API with the given user prompt.
 * If the API fails (e.g., Quota Exceeded), it gracefully falls back
 * to pre-programmed responses for presentation reliability.
 * 
 * @param {string} userMessage - The raw text input from the user
 * @param {Array} chatHistory - Previous messages for context window
 * @returns {Promise<string>} - The AI's markdown-formatted response
 */
export async function generateCyberGuardResponse(userMessage, chatHistory = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const lowerMsg = userMessage.toLowerCase();
  
  if (!apiKey) {
    return `### ⚠️ API Key Required\nPlease check your .env file.`;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-flash-latest as it was listed in the supported models
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: SYSTEM_PROMPT
    });

    const generationConfig = {
      temperature: 0.15,
      topP: 0.85,
      maxOutputTokens: 8192,
    };

    const chat = model.startChat({
      generationConfig,
      history: chatHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // --- FALLBACK MOCK FOR PRESENTATION IF API FAILS (E.G. QUOTA / REGION LOCK) ---
    if (lowerMsg.includes('phishing')) {
      return `### What is Phishing?
Phishing is a type of social engineering attack where cybercriminals deceive individuals into revealing sensitive information—such as passwords, credit card numbers, or OTPs—by masquerading as a trustworthy entity in an electronic communication.

### Common Tactics
- **Deceptive Emails:** Messages claiming your account will be suspended unless you click a link.
- **Smishing (SMS Phishing):** Text messages offering fake jobs or lottery winnings.
- **Vishing (Voice Phishing):** Fraudulent phone calls from someone claiming to be bank staff.

### Legal Framework
- **Section 66D of the IT Act 2000:** Punishes cheating by personation by using a computer resource.
- **Section 43 of the IT Act:** Deals with penalty and compensation for damage to computers and computer systems.

### Preventative Action
Never click on unverified links or download attachments from unknown sources. Always verify the sender's email address and look out for spelling mistakes in the domain.`;
    }

    if (lowerMsg.includes('recent') || lowerMsg.includes('scams')) {
      return `### Most Recent Cyber Scams in India
Cybercriminals are constantly evolving their tactics. Here are the most prevalent scams currently circulating:

1. **The "Digital Arrest" Scam:** Fraudsters pose as CBI or Customs officers on a video call, claiming your Aadhaar is linked to illegal activities, and demand money to "clear" your name.
2. **Work-From-Home Task Scams:** Victims are offered money to simply "like" YouTube videos or leave Google reviews. Initially, they are paid small amounts, but are later tricked into "investing" large sums for higher returns.
3. **Parcel/Customs Scam:** You receive a message that a parcel in your name containing illegal goods (like drugs) has been intercepted by customs.

### Immediate Triage: If Targeted
- **Do Not Panic:** Government officials will **never** interrogate you over WhatsApp video or demand money to clear your name.
- **Block and Report:** Block the number immediately and report the incident at **cybercrime.gov.in** or call **1930**.`;
    }

    // Default mock behavior for other keywords
    if (lowerMsg.includes('upi') || lowerMsg.includes('bank')) {
      return `### Immediate Triage: Emergency Actions
1. **Freeze Your Account Immediately:** Contact your bank or use your banking app to block all outward transactions.
2. **Block UPI ID:** Use your UPI app (GPay, PhonePe, etc.) settings to block the associated UPI ID.

### Legal Framework
- **Section 66D of the IT Act 2000:** Covers punishment for cheating by personation by using a computer resource.

### Reporting Procedure
- Immediately report the incident at [cybercrime.gov.in](https://cybercrime.gov.in) or call the **1930** helpline.`;
    }
    
    // If it's a completely unhandled prompt and the API failed
    return `### ⚠️ API Quota Error
The Gemini API key provided has exceeded its quota or is restricted in your region (Error: 429 Quota Exceeded). 

However, as **CyberGuard AI**, I am still functioning in Offline Fallback Mode. Try asking me about:
- "What is phishing?"
- "Tell me about recent scams"
- "I lost money on UPI"`;
  }
}
