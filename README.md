# CyberGuard AI: Digital Rights & Cyber-Legal Assistant

CyberGuard AI is a specialized Domain Expert designed to assist users in navigating cyber-related social problems such as financial fraud, cyberbullying, and data privacy breaches according to Indian Cyber Law (IT Act 2000) and Global Data Privacy standards (GDPR/DPDP).

## 💻 Tech Stack

- **Frontend Framework:** React 18 with Vite
- **Styling:** Vanilla CSS with custom Glassmorphism and "Cyber World" Aesthetics
- **Icons & Markdown:** `lucide-react` for SVG icons and `react-markdown` for rendering formatted AI responses
- **AI Integration:** `@google/generative-ai` (Google Gemini SDK)
- **Local Database:** Custom Vite Backend Plugin using Node.js `fs` to persist chat history in `chat_history.json`

## 🔄 Flow of Operation

1. **User Input:** The user types a query into the secure Chat Interface.
2. **Context Assembly:** The application bundles the current message with the previous chat history.
3. **Master System Prompt:** Before reaching the AI, the query is prepended with a rigid System Prompt that locks the AI into the "CyberGuard Domain Expert" persona, forcing it to provide multi-step triage, cite legal frameworks, and refuse non-cyber queries.
4. **API Transmission:** The packaged payload is securely transmitted to the Google Gemini API. If the API fails or quota is exceeded, an offline mock-fallback engine engages to answer critical predefined prompts.
5. **Data Persistence:** Simultaneously, the React frontend makes a `POST` request to our custom Vite `/api/history` endpoint, writing the session securely to a local file (`chat_history.json`) to bypass browser `localStorage` restrictions.
6. **Rendering:** The generated markdown response is rendered back to the user with a typing animation.

## 📈 Social Impact Statement (Evaluation Criteria 1)

> "CyberGuard AI addresses the growing social crisis of digital illiteracy and cyber-victimization. By providing instant, 24/7 access to legal information and emergency procedures, it reduces the trauma of cybercrime and empowers B.Tech CSE students and the general public to protect their digital identity."

## ⚙️ Model Configuration

This application is built reflecting the following manual guidelines:

| Parameter | Value | Justification |
| :--- | :--- | :--- |
| **Temperature** | `0.15` | Low value ensures responses are deterministic and factual. In legal/safety domains, "creativity" can lead to dangerous misinformation. |
| **Top-p** | `0.85` | Balanced sampling limits the AI to high-probability, "safe" responses while maintaining a natural, helpful flow. |
| **Role Assigned** | `Domain Expert` | Establishes the chatbot as an authority in Cyber Law, fulfilling the "Domain Control" requirement. |
| **Thinking Level** | `Advanced` | Enables multi-step reasoning to analyze complex user scenarios and provide structured solutions. |

## 🚀 How to Run the Project Locally

Follow these steps to run the web application on your machine:

### Prerequisites
1. **Node.js**: Make sure you have [Node.js](https://nodejs.org/) installed on your computer.
2. **Gemini API Key**: This application is powered by Google's Gemini AI. You will need a free API key to use it.
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Sign in with your Google account.
   - Click on **"Create API key"** and copy the generated key.
   - Create a file named `.env` in the root of the `cyberguard-app` folder.
   - Add this line to the file: `VITE_GEMINI_API_KEY=your_api_key_here`

### 1. Install Dependencies
Open your terminal in the `cyberguard-app` directory and install the required Node modules:
```bash
npm install
```

### 2. Start the Development Server
Run the following command to start the Vite development server:
```bash
npm run dev
```

### 3. View the Application
Once the server starts, it will provide a local URL. Open your web browser and navigate to:
```
http://localhost:5174/
```

## 🛠️ Project Structure
- `src/components/Sidebar.jsx`: Contains the project info, configuration details, and social impact statement.
- `src/components/ChatInterface.jsx`: The main chat UI with markdown support and typing animations.
- `src/services/mockAI.js`: The simulated AI logic layer that implements the multi-step triage routing based on your "Master" System Prompt.
- `src/index.css` & `src/App.css`: Contains the bespoke dark-mode, glassmorphism styling parameters.
