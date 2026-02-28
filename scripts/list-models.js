const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

function getApiKey() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    return match ? match[1].trim() : null;
  } catch (err) {
    return null;
  }
}

async function listModels() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const models = await genAI.listModels();
    console.log("Available Models:");
    // models is an async iterable? No, listModels returns an object with models array in older SDKs or similar
    // Actually in the latest SDK it might be different.
    // Let's just try to log the whole object if it fails
    console.log(JSON.stringify(models, null, 2));
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
