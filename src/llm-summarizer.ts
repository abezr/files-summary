/**
 * LLM summarization module for TextDigest.
 * 
 * @semantic-role llm-integration
 * @purpose Generate summaries using Google Gemini or OpenAI
 * @error-strategy Fallback from Google to OpenAI on failure
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Batch, FileContent, FileSummary } from './types.js';
import { CONFIG, loadEnvConfig, createLogger } from './config.js';

const logger = createLogger('llm-summarizer');

// Lazy-initialized API clients
let googleAI: GoogleGenerativeAI | null = null;
let openAI: OpenAI | null = null;
let initialized = false;

function initializeClients() {
  if (initialized) return;
  
  const envConfig = loadEnvConfig();
  googleAI = envConfig.GOOGLE_API_KEY ? new GoogleGenerativeAI(envConfig.GOOGLE_API_KEY) : null;
  openAI = envConfig.OPENAI_API_KEY ? new OpenAI({ apiKey: envConfig.OPENAI_API_KEY }) : null;
  initialized = true;
}

/**
 * Prompt template for batch summarization.
 * 
 * @semantic-role prompt-engineering
 * @optimization Enforces [source: ...] tags for traceability
 */
function buildPrompt(batch: Batch<FileContent>): string {
  const fileContents = batch.items
    .map((item, index) => {
      return `## File ${index + 1}: ${item.metadata.path}
Modified: ${item.metadata.modifiedAt.toISOString()}
Size: ${item.metadata.size} bytes

\`\`\`
${item.content.slice(0, 50000)}${item.content.length > 50000 ? '\n... (truncated)' : ''}
\`\`\``;
    })
    .join('\n\n');

  return `You are a technical analyst summarizing recent project files.

# Files to Analyze (Batch ${batch.id}):
${fileContents}

# Your Task:
For EACH file, provide:
1. **Summary** (2-3 sentences): What is this file about?
2. **Key Facts** (3-5 bullets): Concrete statements from the file. MUST include [source: filename:line] tags.
3. **Insights** (1-2 bullets): Interesting patterns or implications. MUST include [source: filename] tags.
4. **Statistics** (if any): Extract numbers (dates, counts, metrics)
5. **Sources**: List the file path for each fact/insight

# Output Format (JSON):
{
  "summaries": [
    {
      "file": "path/to/file.txt",
      "summary": "Brief description...",
      "keyFacts": ["Fact 1 [source: file.txt:42]", "Fact 2 [source: file.txt:105]"],
      "insights": ["Insight 1 [source: file.txt]"],
      "statistics": {"key": "value"},
      "sources": ["path/to/file.txt:42", "path/to/file.txt:105"]
    }
  ]
}

# CRITICAL Rules:
- Every fact MUST cite source as "[source: path:line]"
- Every insight MUST cite source as "[source: path]"
- Be concise (max 500 chars per summary)
- Extract ALL numbers/dates you find
- Focus on WHAT changed, not technical jargon
- If file is empty/unreadable, say "No content"
- Output ONLY valid JSON, no markdown formatting`;
}

/**
 * Summarizes a batch using Google Gemini.
 * 
 * @semantic-role llm-api-call
 * @provider google
 */
async function summarizeWithGoogle(batch: Batch<FileContent>): Promise<FileSummary[]> {
  if (!googleAI) throw new Error('Google API key not configured');
  
  logger.info('llm_request', {
    batchId: batch.id,
    provider: 'google',
    model: CONFIG.LLM.primary.model,
    fileCount: batch.items.length,
  });
  
  const model = googleAI.getGenerativeModel({ model: CONFIG.LLM.primary.model });
  const prompt = buildPrompt(batch);
  
  const startTime = Date.now();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  const latencyMs = Date.now() - startTime;
  
  // Parse JSON response (remove markdown code blocks if present)
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const data = JSON.parse(jsonText);
  
  const summaries: FileSummary[] = data.summaries.map((s: any, index: number) => {
    const fileMetadata = batch.items[index].metadata;
    return {
      file: fileMetadata,
      summary: s.summary || 'No summary provided',
      keyFacts: s.keyFacts || [],
      insights: s.insights || [],
      statistics: s.statistics || {},
      sources: s.sources || [],
      model: CONFIG.LLM.primary.model,
      tokens: response.usageMetadata?.totalTokenCount || 0,
      confidence: calculateConfidence(s),
    };
  });
  
  logger.info('llm_response', {
    batchId: batch.id,
    provider: 'google',
    summariesCount: summaries.length,
    tokens: response.usageMetadata?.totalTokenCount || 0,
    latencyMs,
  });
  
  return summaries;
}

/**
 * Summarizes a batch using OpenAI GPT.
 * 
 * @semantic-role llm-api-call
 * @provider openai
 */
async function summarizeWithOpenAI(batch: Batch<FileContent>): Promise<FileSummary[]> {
  if (!openAI) throw new Error('OpenAI API key not configured');
  
  logger.info('llm_request', {
    batchId: batch.id,
    provider: 'openai',
    model: CONFIG.LLM.fallback.model,
    fileCount: batch.items.length,
  });
  
  const prompt = buildPrompt(batch);
  const startTime = Date.now();
  
  const response = await openAI.chat.completions.create({
    model: CONFIG.LLM.fallback.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  
  const latencyMs = Date.now() - startTime;
  const text = response.choices[0].message.content!;
  const data = JSON.parse(text);
  
  const summaries: FileSummary[] = data.summaries.map((s: any, index: number) => {
    const fileMetadata = batch.items[index].metadata;
    return {
      file: fileMetadata,
      summary: s.summary || 'No summary provided',
      keyFacts: s.keyFacts || [],
      insights: s.insights || [],
      statistics: s.statistics || {},
      sources: s.sources || [],
      model: CONFIG.LLM.fallback.model,
      tokens: response.usage?.total_tokens || 0,
      confidence: calculateConfidence(s),
    };
  });
  
  logger.info('llm_response', {
    batchId: batch.id,
    provider: 'openai',
    summariesCount: summaries.length,
    tokens: response.usage?.total_tokens || 0,
    latencyMs,
  });
  
  return summaries;
}

/**
 * Summarizes a batch with automatic fallback.
 * 
 * @semantic-role error-recovery
 * @error-strategy Try Google first, fallback to OpenAI
 */
export async function summarizeBatch(batch: Batch<FileContent>): Promise<FileSummary[]> {
  // Initialize API clients on first use
  initializeClients();
  
  try {
    if (googleAI) {
      return await summarizeWithGoogle(batch);
    } else if (openAI) {
      return await summarizeWithOpenAI(batch);
    } else {
      throw new Error('No API keys configured');
    }
  } catch (primaryError: any) {
    logger.warn('llm_primary_failed', {
      batchId: batch.id,
      error: primaryError.message,
      fallback: 'openai',
    });
    
    // Fallback to OpenAI
    if (openAI && googleAI) {
      try {
        return await summarizeWithOpenAI(batch);
      } catch (fallbackError: any) {
        logger.error('llm_fallback_failed', {
          batchId: batch.id,
          error: fallbackError.message,
        });
        throw fallbackError;
      }
    }
    
    throw primaryError;
  }
}

/**
 * Calculates confidence score based on source linking.
 * 
 * @semantic-role quality-metric
 * @algorithm Count % of facts/insights with [source: ...] tags
 */
function calculateConfidence(summary: any): number {
  const allItems = [...(summary.keyFacts || []), ...(summary.insights || [])];
  if (allItems.length === 0) return 0;
  
  const linkedItems = allItems.filter((item: string) => /\[source:/.test(item));
  return linkedItems.length / allItems.length;
}
