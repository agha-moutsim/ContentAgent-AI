/**
 * OpenAI Client Wrapper
 * 
 * Provides a configured OpenAI client with error handling and timeout support.
 * Requirements: 2.1, 7.3
 */

import OpenAI from 'openai';
import { config } from '../config';

// Initialize OpenAI client with API key from environment
export const openaiClient = new OpenAI({
  apiKey: config.openai.apiKey,
  timeout: 60000, // 60 seconds timeout
  maxRetries: 2, // Retry failed requests up to 2 times
});

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Helper function for chat completions with error handling
 * 
 * @param systemPrompt - The system prompt to guide the AI
 * @param userMessage - The user's message/input
 * @param options - Optional configuration for the completion
 * @returns The AI's response text
 * @throws Error with user-friendly message on failure
 */
export async function createChatCompletion(
  systemPrompt: string,
  userMessage: string,
  options: ChatCompletionOptions = {}
): Promise<string> {
  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 2000,
    timeout = 60000,
  } = options;

  try {
    const completion = await openaiClient.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      {
        timeout,
      }
    );

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    return content;
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again in a moment.');
      }
      if (error.status === 401) {
        throw new Error('AI service authentication failed. Please contact support.');
      }
      if (error.status === 500 || error.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again.');
      }
      // Generic API error
      throw new Error('Content generation failed. Please try again.');
    }

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Generation took too long. Please try again with a simpler idea.');
    }

    // Handle network errors
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
      throw new Error('Unable to connect to AI service. Please check your connection.');
    }

    // Generic error fallback
    console.error('OpenAI API error:', error);
    throw new Error('Content generation failed. Please try again.');
  }
}

/**
 * Helper function for streaming chat completions with error handling
 * 
 * @param systemPrompt - The system prompt to guide the AI
 * @param userMessage - The user's message/input
 * @param onChunk - Callback function called for each chunk of the response
 * @param options - Optional configuration for the completion
 * @returns The complete AI response text
 * @throws Error with user-friendly message on failure
 */
export async function createStreamingChatCompletion(
  systemPrompt: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
  options: ChatCompletionOptions = {}
): Promise<string> {
  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 2000,
    timeout = 60000,
  } = options;

  try {
    const stream = await openaiClient.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      },
      {
        timeout,
      }
    );

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    if (!fullContent) {
      throw new Error('No content returned from OpenAI');
    }

    return fullContent;
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again in a moment.');
      }
      if (error.status === 401) {
        throw new Error('AI service authentication failed. Please contact support.');
      }
      if (error.status === 500 || error.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again.');
      }
      // Generic API error
      throw new Error('Content generation failed. Please try again.');
    }

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Generation took too long. Please try again with a simpler idea.');
    }

    // Handle network errors
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
      throw new Error('Unable to connect to AI service. Please check your connection.');
    }

    // Generic error fallback
    console.error('OpenAI API error:', error);
    throw new Error('Content generation failed. Please try again.');
  }
}
