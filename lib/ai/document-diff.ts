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

  const prompt = `You are a legal document analyst. Compare these two contract document versions and provide a single sentence summarizing the key changes.

Focus on what was added, removed, or modified. If there are no material differences, say "These versions appear to have no material differences."

Previous Version:
${previousText}

Current Version:
${currentText}

Provide a single sentence summary of the differences:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4 if needed
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst specializing in contract comparison. Provide concise, single-sentence summaries of version changes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual output
      max_tokens: 150, // Reduced for single sentence summaries
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

/**
 * Generate AI summary of a document
 * Uses OpenAI GPT-4 to analyze and summarize the document content
 */
export async function generateDocumentSummary(documentText: string): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API key not configured. Cannot generate document summary.');
  }

  const prompt = `You are a legal document analyst. Analyze this contract document and provide a single sentence summary.

Assume this contract is between Choice Digital (also referred to as CDCO) and a counterparty. Focus on the document's purpose and key changes or terms. Examples: "This is an amendment to add checks to the Clearesult programs" or "This is a master services agreement establishing payment terms and deliverables."

Document Content:
${documentText}

Provide a single sentence summary:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst specializing in contract analysis. Provide concise, single-sentence summaries assuming contracts are between Choice Digital (CDCO) and a counterparty.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 150, // Reduced for single sentence summaries
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('OpenAI returned empty summary');
    }

    return summary;
  } catch (error) {
    logger.error('Error generating document summary:', error);
    throw new Error(`Failed to generate document summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate document summary from document URL
 * Downloads the document, extracts text, and generates AI summary
 */
export async function generateDocumentSummaryFromUrl(documentUrl: string): Promise<string> {
  try {
    // Extract text from document
    const documentText = await extractTextFromWordDocument(documentUrl);

    // Generate AI summary
    const summary = await generateDocumentSummary(documentText);
    
    return summary;
  } catch (error) {
    logger.error('Error generating document summary from URL:', error);
    throw error;
  }
}

/**
 * Generate comprehensive contract summary from all documents
 * Analyzes all contract documents and generates a comprehensive summary
 */
export async function generateComprehensiveContractSummary(documentTexts: string[]): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API key not configured. Cannot generate comprehensive contract summary.');
  }

  const combinedText = documentTexts.join('\n\n--- Document Separator ---\n\n');

  const prompt = `You are a legal document analyst. Analyze all the contract documents provided and generate a comprehensive summary of the entire contract.

Assume this contract is between Choice Digital (also referred to as CDCO) and a counterparty.

Provide a comprehensive summary that includes:
1. Contract type and purpose (e.g., master services agreement, amendment, etc.)
2. Key parties involved (CDCO and the counterparty)
3. Main terms and conditions
4. Important dates, amounts, deadlines, or milestones
5. Key obligations and responsibilities for each party
6. Important clauses or provisions (payment terms, liability, IP, termination, etc.)
7. Any notable conditions or requirements

Format the summary in clear, well-organized paragraphs. Be thorough but concise. Focus on the most important information that would be useful for contract management.

Contract Documents:
${combinedText}

Provide a comprehensive summary:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst specializing in contract analysis. Provide comprehensive, well-structured summaries assuming contracts are between Choice Digital (CDCO) and a counterparty.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000, // More tokens for comprehensive summaries
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('OpenAI returned empty summary');
    }

    return summary;
  } catch (error) {
    logger.error('Error generating comprehensive contract summary:', error);
    throw new Error(`Failed to generate comprehensive contract summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate comprehensive changelog from version summaries
 * Creates a full changelog showing all version-to-version changes
 */
export async function generateComprehensiveChangelog(versionSummaries: Array<{ versionNumber: number; summary: string; createdAt: string }>): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API key not configured. Cannot generate comprehensive changelog.');
  }

  // Sort by version number
  const sortedVersions = versionSummaries.sort((a, b) => a.versionNumber - b.versionNumber);

  const changelogEntries = sortedVersions.map(v => 
    `Version ${v.versionNumber} (${new Date(v.createdAt).toLocaleDateString()}):\n${v.summary}`
  ).join('\n\n');

  const prompt = `You are a legal document analyst. Create a comprehensive changelog from the version-to-version change summaries provided.

Organize the changelog chronologically, showing the evolution of the contract over time. For each version, clearly indicate what changed from the previous version.

Format the changelog as a well-structured document with:
- Clear version headers
- Bullet points or numbered lists for changes
- Group related changes together
- Highlight significant changes (new sections, removed clauses, modified terms, etc.)

If a version summary indicates no material differences, note that clearly.

Version Changes:
${changelogEntries}

Provide a comprehensive, well-formatted changelog:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst specializing in contract version tracking. Create clear, comprehensive changelogs that show the evolution of contracts over time.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000, // More tokens for comprehensive changelogs
    });

    const changelog = completion.choices[0]?.message?.content?.trim();
    
    if (!changelog) {
      throw new Error('OpenAI returned empty changelog');
    }

    return changelog;
  } catch (error) {
    logger.error('Error generating comprehensive changelog:', error);
    throw new Error(`Failed to generate comprehensive changelog: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

