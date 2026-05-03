import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBuy7Pii-IRVS5qSPX5bzAPDavXddEY0f4");

async function run() {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBuy7Pii-IRVS5qSPX5bzAPDavXddEY0f4");
  const data = await response.json();
  console.log(data.models.map(m => m.name));
}

run();
