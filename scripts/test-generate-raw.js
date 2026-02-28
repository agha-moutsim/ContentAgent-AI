const fs = require('fs');
const path = require('path');

// Read env file manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyLine = envContent.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].trim() : '';

async function runTest() {
  console.log('Testing raw fetch with API Key:', apiKey.substring(0, 10) + '...');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: "Hello, tell me a very short joke." }] }]
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Status code:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      console.log('SUCCESS:', data.candidates[0].content.parts[0].text);
    } else {
      console.error('API ERROR:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Network Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    console.error(error);
  }
}

runTest();
