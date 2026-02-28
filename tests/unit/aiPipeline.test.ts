/**
 * Unit tests for AI Pipeline Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPipelineService } from '../../lib/services/aiPipeline';
import * as openaiModule from '../../lib/services/openai';

// Mock the OpenAI service
vi.mock('../../lib/services/openai', () => ({
  createChatCompletion: vi.fn(),
}));

describe('AIPipelineService', () => {
  let service: AIPipelineService;
  let mockCreateChatCompletion: any;

  beforeEach(() => {
    service = new AIPipelineService();
    mockCreateChatCompletion = vi.mocked(openaiModule.createChatCompletion);
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should execute all pipeline steps in sequence', async () => {
      // Mock responses for each step
      // 3 sequential calls: expandIdea, analyzeAudience, createStructure
      // 8 parallel calls in generateAllContent
      mockCreateChatCompletion
        .mockResolvedValueOnce('Expanded idea with key angles and hooks') // 1. expandIdea
        .mockResolvedValueOnce('Target audience: content creators aged 25-40') // 2. analyzeAudience
        .mockResolvedValueOnce('Content outline with structure') // 3. createStructure
        .mockResolvedValueOnce('1. Title One\n2. Title Two\n3. Title Three\n4. Title Four\n5. Title Five') // 4. YouTube titles
        .mockResolvedValueOnce('1. Hook One\n2. Hook Two\n3. Hook Three') // 5. Hooks
        .mockResolvedValueOnce('Full script with timestamps') // 6. Full script
        .mockResolvedValueOnce('Script 1\nContent\n\n\n\nScript 2\nContent\n\n\n\nScript 3\nContent') // 7. Short-form scripts
        .mockResolvedValueOnce('Twitter thread content') // 8. Twitter thread
        .mockResolvedValueOnce('LinkedIn post content') // 9. LinkedIn post
        .mockResolvedValueOnce('1. Thumbnail One\n2. Thumbnail Two\n3. Thumbnail Three\n4. Thumbnail Four\n5. Thumbnail Five') // 10. Thumbnails
        .mockResolvedValueOnce('1. CTA One\n2. CTA Two\n3. CTA Three\n4. CTA Four\n5. CTA Five'); // 11. CTAs

      const progressSteps: string[] = [];
      const onProgress = (step: string) => progressSteps.push(step);

      const result = await service.generate('Test content idea', onProgress);

      // Verify progress callbacks were called in order
      expect(progressSteps).toEqual([
        'Expanding your idea...',
        'Analyzing target audience...',
        'Structuring content framework...',
        'Generating platform-specific content...',
      ]);

      // Verify all OpenAI calls were made (3 sequential + 8 parallel = 11 total)
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(11);

      // Verify the result structure
      expect(result).toHaveProperty('youtubeTitles');
      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('fullScript');
      expect(result).toHaveProperty('shortFormScripts');
      expect(result).toHaveProperty('twitterThread');
      expect(result).toHaveProperty('linkedinPost');
      expect(result).toHaveProperty('thumbnailIdeas');
      expect(result).toHaveProperty('ctaVariations');

      // Verify arrays have correct lengths
      expect(result.youtubeTitles).toHaveLength(5);
      expect(result.hooks).toHaveLength(3);
      expect(result.shortFormScripts).toHaveLength(3);
      expect(result.thumbnailIdeas).toHaveLength(5);
      expect(result.ctaVariations).toHaveLength(5);

      // Verify string fields are populated
      expect(result.fullScript).toBe('Full script with timestamps');
      expect(result.twitterThread).toBe('Twitter thread content');
      expect(result.linkedinPost).toBe('LinkedIn post content');
    });

    it('should work without progress callback', async () => {
      // Mock minimal responses
      mockCreateChatCompletion
        .mockResolvedValueOnce('Expanded idea')
        .mockResolvedValueOnce('Audience analysis')
        .mockResolvedValueOnce('Content outline')
        .mockResolvedValueOnce('1. Title\n2. Title\n3. Title\n4. Title\n5. Title')
        .mockResolvedValueOnce('1. Hook\n2. Hook\n3. Hook')
        .mockResolvedValueOnce('Script')
        .mockResolvedValueOnce('Script 1\n\n\n\nScript 2\n\n\n\nScript 3')
        .mockResolvedValueOnce('Thread')
        .mockResolvedValueOnce('Post')
        .mockResolvedValueOnce('1. Thumb\n2. Thumb\n3. Thumb\n4. Thumb\n5. Thumb')
        .mockResolvedValueOnce('1. CTA\n2. CTA\n3. CTA\n4. CTA\n5. CTA');

      // Should not throw when no callback provided
      const result = await service.generate('Test idea');

      expect(result).toBeDefined();
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(11);
    });

    it('should propagate errors from OpenAI service', async () => {
      mockCreateChatCompletion.mockRejectedValueOnce(
        new Error('AI service temporarily unavailable')
      );

      await expect(service.generate('Test idea')).rejects.toThrow(
        'AI service temporarily unavailable'
      );
    });
  });

  describe('parseListResponse', () => {
    it('should parse numbered lists correctly', () => {
      const service = new AIPipelineService();
      const response = '1. First item\n2. Second item\n3. Third item';
      
      // Access private method through any cast for testing
      const result = (service as any).parseListResponse(response);
      
      expect(result).toEqual(['First item', 'Second item', 'Third item']);
    });

    it('should handle different numbering formats', () => {
      const service = new AIPipelineService();
      const response = '1) First\n2) Second\n3- Third\n4: Fourth';
      
      const result = (service as any).parseListResponse(response);
      
      expect(result).toEqual(['First', 'Second', 'Third', 'Fourth']);
    });

    it('should filter out empty lines', () => {
      const service = new AIPipelineService();
      const response = '1. First\n\n2. Second\n\n\n3. Third';
      
      const result = (service as any).parseListResponse(response);
      
      expect(result).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('parseScriptResponse', () => {
    it('should parse scripts with clear separators', () => {
      const service = new AIPipelineService();
      const response = 'Script 1\nContent one\n\nScript 2\nContent two\n\nScript 3\nContent three';
      
      const result = (service as any).parseScriptResponse(response);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('Content one');
      expect(result[1]).toContain('Content two');
      expect(result[2]).toContain('Content three');
    });

    it('should split by double newlines when no separators', () => {
      const service = new AIPipelineService();
      // Use exactly 3 newlines as separator (minimum for the regex)
      const response = 'First script content\n\n\nSecond script content\n\n\nThird script content';
      
      const result = (service as any).parseScriptResponse(response);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('First script content');
      expect(result[1]).toBe('Second script content');
      expect(result[2]).toBe('Third script content');
    });
  });
});
