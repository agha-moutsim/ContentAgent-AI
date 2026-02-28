import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Chat completion options
 */
export interface GeminiOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Creates a chat completion using Gemini
 * 
 * @param systemPrompt - The system prompt/instructions
 * @param userMessage - The user input
 * @param options - Generation options
 * @returns Generated text
 */
export async function createGeminiCompletion(
  systemPrompt: string,
  userMessage: string,
  options: GeminiOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = options;
  
  try {
    // Optimized model list prioritizing 2.5 series available on the user's specific key
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-pro-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError: any = null;
    const MAX_RETRIES = 2; // Increased to 2 now that total pipeline calls are reduced to 2
    const INITIAL_RETRY_DELAY = 1500; // Slightly higher delay to allow quota resets

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < modelsToTry.length; i++) {
      const modelId = modelsToTry[i];
      console.log(`Attempting generation with model: ${modelId}`);
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2.5, attempt - 1); // Exponential backoff
            console.log(`Retry attempt ${attempt} for ${modelId} after ${Math.round(delay)}ms...`);
            await sleep(delay);
          }

          const isAdvancedModel = modelId.includes('1.5') || modelId.includes('2.0') || modelId.includes('2.5') || modelId.includes('pro');
          
          const model = genAI.getGenerativeModel({ 
            model: modelId,
            ...(isAdvancedModel ? { systemInstruction: systemPrompt } : {})
          });

          const prompt = isAdvancedModel
            ? userMessage 
            : `${systemPrompt}\n\nUser Message: ${userMessage}`;

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            }
          });

          const response = await result.response;
          const text = response.text();
          if (text) {
            console.log(`Successfully generated content using model: ${modelId}`);
            return text;
          }
        } catch (err: any) {
          lastError = err;
          const errorMessage = err.message?.toLowerCase() || '';
          console.warn(`Attempt ${attempt} for ${modelId} failed:`, err.message);
          
          const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate');
          
          // If it's a 404, don't retry this model, move to the next identifier
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            break; 
          }

          // If it's a quota error on the primary fast models, try next attempt
          if (isQuotaError) {
            continue; 
          }

          // For unknown errors, break retry loop and try next model
          break;
        }
      }
    }

    // If we get here, all models failed
    throw lastError || new Error('All Gemini models failed to generate content');
  } catch (error: any) {
    // Log the full error for debugging in the terminal
    console.error('=== GEMINI API ERROR START ===');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Response Data:', JSON.stringify(error.response, null, 2));
    }
    console.error('Full Error:', error);
    console.error('=== GEMINI API ERROR END ===');
    
    // Check for common errors
    if (error.message?.includes('API key')) {
      throw new Error('Gemini API key is invalid or missing.');
    }
    
    if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    }

    if (error.message?.includes('location') || error.message?.includes('region')) {
      throw new Error('Gemini is not available in your region. You may need to use a VPN or different provider.');
    }

    throw new Error(`Gemini AI Error: ${error.message || 'Unknown error'}`);
  }
}
