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

  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  
  try {
    console.log(`Fetching models from: https://generativelanguage.googleapis.com/v1/models`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("API Error:", JSON.stringify(data.error, null, 2));
      return;
    }

    console.log("=== Available Models ===");
    if (data.models) {
      data.models.forEach(m => {
        console.log(`- ${m.name} (${m.displayName})`);
      });
    } else {
      console.log("No models returned. Full response:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

listModels();
