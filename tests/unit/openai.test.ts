/**
 * Unit tests for OpenAI client wrapper
 * Tests the chat completion helper with error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAI from 'openai';

// Mock the OpenAI module
vi.mock('../../lib/services/openai', async () => {
  const actual = await vi.importActual<typeof import('../../lib/services/openai')>('../../lib/services/openai');
  return {
    ...actual,
    openaiClient: {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    },
  };
});

import { createChatCompletion, createStreamingChatCompletion, openaiClient } from '../../lib/services/openai';

describe('OpenAI Client Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createChatCompletion', () => {
    it('should successfully create a chat completion', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from OpenAI',
            },
          },
        ],
      };

      // Mock the create method
      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockResponse as any);

      const result = await createChatCompletion(
        'You are a helpful assistant',
        'Hello, how are you?'
      );

      expect(result).toBe('This is a test response from OpenAI');
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello, how are you?' },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should use custom options when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Custom response',
            },
          },
        ],
      };

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockResponse as any);

      const result = await createChatCompletion(
        'System prompt',
        'User message',
        {
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          maxTokens: 1000,
          timeout: 30000,
        }
      );

      expect(result).toBe('Custom response');
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          max_tokens: 1000,
        }),
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should throw user-friendly error on 429 rate limit', async () => {
      const error = new OpenAI.APIError(
        429,
        { error: { message: 'Rate limit exceeded' } },
        'Rate limit exceeded',
        {}
      );

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('AI service rate limit exceeded. Please try again in a moment.');
    });

    it('should throw user-friendly error on 401 authentication failure', async () => {
      const error = new OpenAI.APIError(
        401,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('AI service authentication failed. Please contact support.');
    });

    it('should throw user-friendly error on 500 server error', async () => {
      const error = new OpenAI.APIError(
        500,
        { error: { message: 'Internal server error' } },
        'Internal server error',
        {}
      );

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('AI service temporarily unavailable. Please try again.');
    });

    it('should throw user-friendly error on 503 service unavailable', async () => {
      const error = new OpenAI.APIError(
        503,
        { error: { message: 'Service unavailable' } },
        'Service unavailable',
        {}
      );

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('AI service temporarily unavailable. Please try again.');
    });

    it('should throw user-friendly error on timeout', async () => {
      const error = new Error('Request timeout after 60000ms');

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('Generation took too long. Please try again with a simpler idea.');
    });

    it('should throw user-friendly error on network error', async () => {
      const error = new Error('connect ECONNREFUSED');

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('Unable to connect to AI service. Please check your connection.');
    });

    it('should throw generic error for unknown API errors', async () => {
      const error = new OpenAI.APIError(
        400,
        { error: { message: 'Bad request' } },
        'Bad request',
        {}
      );

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('Content generation failed. Please try again.');
    });

    it('should throw error when no content is returned', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockResponse as any);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('No content returned from OpenAI');
    });

    it('should throw error when choices array is empty', async () => {
      const mockResponse = {
        choices: [],
      };

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockResponse as any);

      await expect(
        createChatCompletion('System', 'User')
      ).rejects.toThrow('No content returned from OpenAI');
    });
  });

  describe('createStreamingChatCompletion', () => {
    it('should successfully stream a chat completion', async () => {
      const chunks = [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ' world' } }] },
        { choices: [{ delta: { content: '!' } }] },
      ];

      // Create an async generator to simulate streaming
      async function* mockStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockStream() as any);

      const receivedChunks: string[] = [];
      const result = await createStreamingChatCompletion(
        'You are a helpful assistant',
        'Say hello',
        (chunk) => receivedChunks.push(chunk)
      );

      expect(result).toBe('Hello world!');
      expect(receivedChunks).toEqual(['Hello', ' world', '!']);
    });

    it('should use custom options for streaming', async () => {
      const chunks = [
        { choices: [{ delta: { content: 'Test' } }] },
      ];

      async function* mockStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockStream() as any);

      await createStreamingChatCompletion(
        'System',
        'User',
        () => {},
        {
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          maxTokens: 500,
          timeout: 45000,
        }
      );

      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          max_tokens: 500,
          stream: true,
        }),
        expect.objectContaining({
          timeout: 45000,
        })
      );
    });

    it('should handle empty chunks gracefully', async () => {
      const chunks = [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: {} }] }, // Empty delta
        { choices: [{ delta: { content: '' } }] }, // Empty content
        { choices: [{ delta: { content: ' world' } }] },
      ];

      async function* mockStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockStream() as any);

      const result = await createStreamingChatCompletion(
        'System',
        'User',
        () => {}
      );

      expect(result).toBe('Hello world');
    });

    it('should throw error when streaming returns no content', async () => {
      async function* mockStream() {
        yield { choices: [{ delta: {} }] };
      }

      vi.spyOn(openaiClient.chat.completions, 'create').mockResolvedValue(mockStream() as any);

      await expect(
        createStreamingChatCompletion('System', 'User', () => {})
      ).rejects.toThrow('No content returned from OpenAI');
    });

    it('should throw user-friendly error on streaming timeout', async () => {
      const error = new Error('Request timeout after 60000ms');

      vi.spyOn(openaiClient.chat.completions, 'create').mockRejectedValue(error);

      await expect(
        createStreamingChatCompletion('System', 'User', () => {})
      ).rejects.toThrow('Generation took too long. Please try again with a simpler idea.');
    });
  });
});
