import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { createGeminiCompletion } from '@/backend/services/gemini';

export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const { examples } = await request.json();

      if (!examples || typeof examples !== 'string' || examples.trim() === '') {
        return NextResponse.json({ error: 'Please provide examples of your writing.' }, { status: 400 });
      }

      const systemPrompt = `You are an expert copywriter and brand voice analyst.
Analyze the following writing examples and define the author's precise "Brand Voice Profile".
I need you to extract the exact tonal guidelines so another AI can perfectly replicate this writing style.

Focus on:
1. Tone (e.g., casual, professional, aggressive, humorous, academic)
2. Formatting (e.g., short paragraphs, uses bullet points, heavy emoji use, no emojis)
3. Vocabulary (e.g., simple words, industry jargon, swear words, slang)
4. Sentence Structure (e.g., punchy one-liners, long flowing sentences)

Return ONLY a concise, bulleted list of 5-7 strict instructions on how to write like this person. Do not include introductory text. Provide actionable rules.`;

      const userMessage = `Examples of their writing:\n"""\n${examples}\n"""`;

      const responseText = await createGeminiCompletion(systemPrompt, userMessage, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      return NextResponse.json({ voiceProfile: responseText.trim() });
    } catch (error: any) {
      console.error('Voice analysis error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze voice. Please try again.' },
        { status: 500 }
      );
    }
  });
}
