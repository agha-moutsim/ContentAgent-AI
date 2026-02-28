const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('Testing generation with API Key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('Sending request...');
    const result = await model.generateContent('Hello, tell me a short joke about programming.');
    const response = await result.response;
    console.log('\n--- SUCCESS ---');
    console.log(response.text());
  } catch (error) {
    console.error('\n--- ERROR ---');
    console.error(error.message);
    if (error.status) console.error('Status:', error.status);
    console.error('\nFull error:', error);
  }
}

runTest();
