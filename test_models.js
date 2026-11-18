import { GoogleGenAI } from "@google/genai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment.");
    process.exit(1);
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: "Hello, confirm CyberGuard model connectivity.",
  });
  console.log(response.text);
}

run();
