const fs = require('fs');
const https = require('https');

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
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          console.error("API Error:", JSON.stringify(json.error, null, 2));
          return;
        }

        console.log("=== Available Models ===");
        if (json.models) {
          json.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
          });
        } else {
          console.log("No models returned. Full response:", JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.error("Parse Error:", e.message);
        console.log("Raw response:", data);
      }
    });
  }).on('error', (err) => {
    console.error("Request Error:", err.message);
  });
}

listModels();
