/**
 * AI Document Diff Utilities
 * Extracts text from Word documents and generates AI-powered diff summaries
 */

import mammoth from 'mammoth';
import OpenAI from 'openai';
import { logger } from '@/lib/utils/logger';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set. AI diff generation will be disabled.');
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Extract text from a Word document URL
 * Downloads the document and extracts plain text using mammoth
 */
export async function extractTextFromWordDocument(fileUrl: string): Promise<string> {
  try {
    // Fetch the document
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error('Error extracting text from Word document:', error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate AI diff summary comparing two document versions
 * Uses OpenAI GPT-4 to analyze changes between versions
 */
export async function generateDiffSummary(
  previousText: string,
  currentText: string
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API key not configured. Cannot generate diff summary.');
  }

  const prompt = `You are a legal document analyst. Compare these two contract document versions and summarize the key changes in plain English. Focus on:

1. Added clauses or sections
2. Removed clauses or sections
3. Modified terms, dates, or amounts
4. Changed language or wording
5. Any other significant changes

Be concise but thorough. Use bullet points for clarity. If there are no significant changes, state that clearly.

Previous Version:
${previousText}

Current Version:
${currentText}

Provide a clear summary of the differences:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4 if needed
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst specializing in contract comparison and change analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual output
      max_tokens: 1000,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('OpenAI returned empty summary');
    }

    return summary;
  } catch (error) {
    logger.error('Error generating AI diff summary:', error);
    throw new Error(`Failed to generate diff summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate diff summary from document URLs
 * Downloads both documents, extracts text, and generates AI summary
 */
export async function generateDiffSummaryFromUrls(
  previousVersionUrl: string,
  currentVersionUrl: string
): Promise<string> {
  try {
    // Extract text from both documents in parallel
    const [previousText, currentText] = await Promise.all([
      extractTextFromWordDocument(previousVersionUrl),
      extractTextFromWordDocument(currentVersionUrl),
    ]);

    // Generate AI summary
    const summary = await generateDiffSummary(previousText, currentText);
    
    return summary;
  } catch (error) {
    logger.error('Error generating diff summary from URLs:', error);
    throw error;
  }
}

