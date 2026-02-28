/**
 * AI Pipeline Service
 * 
 * Orchestrates multi-step AI content generation workflow.
 * Requirements: 2.1, 2.2, 12.1
 */

import { ContentPackage } from '../types';
import { createGeminiCompletion } from './gemini';

/**
 * Progress callback function type
 */
export type ProgressCallback = (step: string) => void;

/**
 * Content structure used internally during generation
 */
interface ContentStructure {
  expandedIdea: string;
  audience: string;
  outline: string;
}

/**
 * AI Pipeline Service Class
 * 
 * Executes a structured multi-step workflow to generate comprehensive
 * multi-platform content from a single idea.
 */
export class AIPipelineService {
  /**
   * Main generation method that orchestrates the entire pipeline
   * 
   * @param idea - The user's content idea
   * @param onProgress - Optional callback for progress updates
   * @returns Complete content package with all platform-specific content
   */
  async generate(
    idea: string,
    onProgress?: ProgressCallback,
    sourceContent?: string, // Optional scraped content from a URL
    brandVoice?: string,    // Optional custom brand voice profile
    tone: string = 'balanced' // Optional content tone
  ): Promise<ContentPackage> {
    // Step 1: Conceptualization (Consolidated Expansion, Audience, and Structure)
    onProgress?.(sourceContent ? "Analyzing URL content..." : "Conceptualizing your content strategy...");
    const conceptualization = await this.conceptualize(idea, sourceContent, brandVoice, tone);

    // QUOTA PACING: Wait 5 seconds to let Gemini API quota "breathe"
    onProgress?.("Structuring multi-platform content (pacing AI)...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 2: Multi-Platform Generation (Consolidated)
    onProgress?.("Generating platform-specific content...");
    const content = await this.generateAllContent(conceptualization, brandVoice, tone);

    return content;
  }

  /**
   * Consolidated Step: Expand idea, analyze audience, and create structure in one call for speed.
   * When sourceContent is provided (from URL scraping), it uses the real content to ground the strategy.
   */
  private async conceptualize(idea: string, sourceContent?: string, brandVoice?: string, tone?: string): Promise<ContentStructure> {
    const voiceInstruction = brandVoice ? `\n\nCRITICAL BRAND VOICE INSTRUCTIONS:\nEnsure the content strategy perfectly aligns with the author's brand voice:\n${brandVoice}\n` : '';
    const toneInstruction = tone && tone !== 'balanced' ? `\nADOPT TONE: ${tone.toUpperCase()}. Adjust your conceptualization to fit this style (e.g., if professional, focus on authority; if witty, focus on humor).` : '';

    const systemPrompt = `You are an expert content strategist and audience researcher.
Your goal is to take a raw idea and turn it into a high-performing content strategy.${voiceInstruction}${toneInstruction}

PROCESS ALL OF THE FOLLOWING IN ONE RESPONSE:
1. EXPANDED CONCEPT: Identify the core value, 3 key angles, and attention hooks.
2. AUDIENCE ANALYSIS: Target demographics, pain points, and specific reasons they will engage.
3. CONTENT STRUCTURE: A detailed outline with an opening hook, 3-5 main points with supporting details, transitions, and closing CTA.

FORMAT YOUR RESPONSE CLEARLY WITH HEADERS: [CONCEPT], [AUDIENCE], [OUTLINE].`;

    const userMessage = sourceContent
      ? `User provided a URL about: "${idea}"\n\nHere is the actual content from that URL to base your strategy on:\n\n${sourceContent}`
      : `Raw Content Idea: ${idea}`;

    const response = await createGeminiCompletion(systemPrompt, userMessage, {
      temperature: 0.8,
      maxTokens: 3000,
    });

    // Simple parsing logic to separate the consolidated response
    const expandedIdea = response.split('[AUDIENCE]')[0].replace('[CONCEPT]', '').trim();
    const audiencePart = response.split('[AUDIENCE]')[1] || '';
    const audience = audiencePart.split('[OUTLINE]')[0].trim();
    const outline = audiencePart.split('[OUTLINE]')[1]?.trim() || response;

    return {
      expandedIdea,
      audience,
      outline,
    };
  }

  /**
   * Step 4: Generate all platform-specific content in ONE SINGLE CALL to save quota.
   * 
   * @param structure - The content structure from previous steps
   * @returns Complete content package with all outputs
   */
  private async generateAllContent(
    structure: ContentStructure,
    brandVoice?: string,
    tone: string = 'balanced'
  ): Promise<ContentPackage> {
    const voiceInstruction = brandVoice ? `\n\nCRITICAL BRAND VOICE INSTRUCTIONS:\nYou MUST write all content using this exact tone and style profile:\n${brandVoice}\n` : '';
    
    let tonePrompt = '';
    if (tone === 'professional') {
      tonePrompt = '\nTONE: Professional, authoritative, and corporate. Use sophisticated vocabulary and focus on ROI and industry standards.';
    } else if (tone === 'witty') {
      tonePrompt = '\nTONE: Witty, funny, and viral-focused. Use puns, clever analogies, and high energy. Be slightly informal and provocative.';
    } else if (tone === 'educational') {
      tonePrompt = '\nTONE: Educational and helpful. Focus on step-by-step clarity, definitions, and providing massive value. Be like a patient mentor.';
    } else if (tone === 'punchy') {
      tonePrompt = '\nTONE: Punchy and aggressive. Use short sentences. Focus on pain points and urgent CTAs. Be direct and bold.';
    }

    const systemPrompt = `You are an expert multi-platform content creator.
Your goal is to transform the provided content strategy into specific, high-quality deliverables for YouTube, Twitter, and LinkedIn.${voiceInstruction}${tonePrompt}

CRITICAL: You MUST generate ALL of the following sections. Do NOT stop early.
Return each section using EXACTLY these [HEADER_TAGS] (include the brackets):

1. [YT_TITLES]: 5-10 click-worthy YouTube titles.
2. [TWITTER_THREAD]: A 5-10 tweet thread (numbered 1/X). Include relevant hashtags.
3. [LINKEDIN_POST]: A professional, insight-driven LinkedIn post (3-5 paragraphs, include hashtags).
4. [HOOKS]: 3-5 pattern-interrupting video hooks.
5. [THUMBNAIL_IDEAS]: 5-7 bold thumbnail text concepts.
6. [CTA_VARIATIONS]: 5 natural call-to-action variations.
7. [FULL_SCRIPT]: A complete YouTube script with timestamps.
8. [SHORT_SCRIPTS]: 3 punchy 30-60s scripts for Reels/Shorts/TikTok.

Use EXACTLY the [TAG] format shown. Do not rename, skip, or reorder them.`;

    const userMessage = `CONTENT STRATEGY:
${structure.expandedIdea}

AUDIENCE:
${structure.audience}

DETAILED OUTLINE:
${structure.outline}`;

    const response = await createGeminiCompletion(systemPrompt, userMessage, {
      temperature: 0.85,
      maxTokens: 7000, // Increased: long scripts need more tokens
    });

    // Log the raw response for debugging (truncated)
    console.log('[Pipeline] Raw response length:', response.length);
    console.log('[Pipeline] Tags found:', ['YT_TITLES','TWITTER_THREAD','LINKEDIN_POST','HOOKS','THUMBNAIL_IDEAS','CTA_VARIATIONS','FULL_SCRIPT','SHORT_SCRIPTS'].map(tag => `${tag}:${response.includes('[' + tag + ']') ? '✓' : '✗'}`).join(', '));

    // Parsing logic for the consolidated response
    const youtubeTitles = this.parseListResponse(this.getSection(response, 'YT_TITLES'));
    const hooks = this.parseListResponse(this.getSection(response, 'HOOKS'));
    const fullScript = this.getSection(response, 'FULL_SCRIPT');
    const shortFormScripts = this.parseScriptResponse(this.getSection(response, 'SHORT_SCRIPTS'));
    const twitterThread = this.getSection(response, 'TWITTER_THREAD');
    const linkedinPost = this.getSection(response, 'LINKEDIN_POST');
    const thumbnailIdeas = this.parseListResponse(this.getSection(response, 'THUMBNAIL_IDEAS'));
    const ctaVariations = this.parseListResponse(this.getSection(response, 'CTA_VARIATIONS'));

    return {
      youtubeTitles,
      hooks,
      fullScript,
      shortFormScripts,
      twitterThread,
      linkedinPost,
      thumbnailIdeas,
      ctaVariations,
    };
  }

  /**
   * Helper to extract a section from the consolidated response.
   * Uses a flexible regex to handle Gemini adding **bold**, ## headings,
   * or extra whitespace/colons around tag names.
   */
  private getSection(response: string, tag: string): string {
    // Match the tag with optional surrounding markdown: **, ##, :, spaces
    const tagPattern = new RegExp(
      `(?:^|\\n)[\\s#*]*\\[${tag}\\][\\s*:#]*`,
      'im'
    );
    
    const match = tagPattern.exec(response);
    if (!match) return '';
    
    const afterTag = response.slice(match.index + match[0].length);
    
    // Find end of this section (start of any next tag with optional decoration)
    const nextTagPattern = /(?:^|\n)[\s#*]*\[[A-Z_]+\][\s*:#]*/m;
    const nextMatch = nextTagPattern.exec(afterTag);
    
    if (!nextMatch) {
      return afterTag.trim();
    }
    
    return afterTag.substring(0, nextMatch.index).trim();
  }

  /**
   * Parse a numbered list response into an array
   */
  private parseListResponse(response: string): string[] {
    // Split by lines and filter out empty lines
    const lines = response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Remove numbering (1., 2., etc.) and clean up
    return lines
      .map((line) => {
        // Remove various numbering formats: "1.", "1)", "1 -", etc.
        return line.replace(/^\d+[\.\)\-\:]\s*/, '').trim();
      })
      .filter((line) => line.length > 0);
  }

  /**
   * Parse script response into separate scripts
   */
  private parseScriptResponse(response: string): string[] {
    // First, try to split by script numbers or clear separators
    const lines = response.split('\n');
    const scripts: string[] = [];
    let currentScript = '';
    let foundSeparators = false;

    for (const line of lines) {
      // Check if this is a script separator (Script 1, Script 2, etc.)
      if (/^(Script|#)\s*\d+/i.test(line.trim())) {
        foundSeparators = true;
        if (currentScript.trim()) {
          scripts.push(currentScript.trim());
        }
        currentScript = '';
      } else {
        currentScript += line + '\n';
      }
    }

    // Add the last script if we found separators
    if (foundSeparators && currentScript.trim()) {
      scripts.push(currentScript.trim());
    }

    // If we found separators and have scripts, return them
    if (foundSeparators && scripts.length > 0) {
      return scripts;
    }

    // No clear separators found, try to split by multiple newlines
    // Try splitting by 3+ newlines first
    let parts = response.split(/\n\n\n+/);
    if (parts.length > 1) {
      return parts.map((s) => s.trim()).filter((s) => s.length > 0);
    }
    
    // Fallback to double newlines
    parts = response.split(/\n\n+/);
    const filtered = parts.map((s) => s.trim()).filter((s) => s.length > 0);
    
    // If we got multiple parts, return them; otherwise return the whole response
    return filtered.length > 1 ? filtered : [response.trim()];
  }
}

// Export a singleton instance
export const aiPipelineService = new AIPipelineService();
