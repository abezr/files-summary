/**
 * Advanced fact analysis module for TextDigest v2.1.
 * 
 * @semantic-role fact-analysis
 * @algorithm
 * 1. Extract all facts from summaries
 * 2. Frequency analysis for common facts
 * 3. TF-IDF scoring for unusual facts
 * 4. Length analysis for long facts (>50 words)
 * 5. Rank and categorize facts
 * 
 * @version 2.1
 */

import { TfIdf } from 'natural';
import type { FileSummary, AnalyzedFact, Logger } from './types.js';

// Simple stopword removal (fallback)
const commonStopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);

function removeStopwords(words: string[]): string[] {
  return words.filter(w => !commonStopwords.has(w.toLowerCase()));
}

/**
 * Analyze facts across all summaries.
 * 
 * @semantic-role analysis
 * @input Array of FileSummary objects
 * @output Object with common, unusual, and long facts
 * 
 * @algorithm
 * 1. Collect all facts from all summaries
 * 2. Calculate frequency for each unique fact
 * 3. Build TF-IDF corpus from facts
 * 4. Calculate rarity score (inverse of TF-IDF)
 * 5. Identify long facts (>50 words)
 * 6. Rank and categorize
 * 
 * @quality-metrics
 * - Top 10 most common facts (frequency >= 3)
 * - Top 10 most unusual facts (rarity score >= 0.7)
 * - All long facts (>50 words)
 * 
 * @example
 * ```typescript
 * const analysis = analyzeFacts(summaries, logger);
 * console.log(`Common facts: ${analysis.common.length}`);
 * console.log(`Unusual facts: ${analysis.unusual.length}`);
 * console.log(`Long facts: ${analysis.long.length}`);
 * ```
 */
export function analyzeFacts(
  summaries: FileSummary[],
  logger?: Logger
): {
  common: AnalyzedFact[];
  unusual: AnalyzedFact[];
  long: AnalyzedFact[];
} {
  // Collect all facts with source tracking
  const factMap = new Map<string, { sources: Set<string>; frequency: number }>();
  
  for (const summary of summaries) {
    for (const fact of summary.keyFacts) {
      // Extract fact text (remove source tags)
      const cleanFact = fact.replace(/\[source:.*?\]/g, '').trim();
      
      if (!factMap.has(cleanFact)) {
        factMap.set(cleanFact, {
          sources: new Set([summary.file.path]),
          frequency: 1
        });
      } else {
        const entry = factMap.get(cleanFact)!;
        entry.sources.add(summary.file.path);
        entry.frequency++;
      }
    }
  }
  
  // Build TF-IDF corpus
  const tfidf = new TfIdf();
  const facts = Array.from(factMap.keys());
  
  facts.forEach(fact => {
    // Tokenize and remove stopwords for better TF-IDF
    const words = fact.toLowerCase().split(/\s+/);
    const filtered = removeStopwords(words as string[]).join(' ');
    tfidf.addDocument(filtered);
  });
  
  // Calculate rarity scores (inverse TF-IDF)
  const analyzedFacts: AnalyzedFact[] = facts.map((fact, index) => {
    const entry = factMap.get(fact)!;
    const wordCount = fact.split(/\s+/).length;
    
    // Get TF-IDF scores for this document
    const scores: number[] = [];
    tfidf.listTerms(index).forEach(item => {
      scores.push(item.tfidf);
    });
    
    // Rarity score: low TF-IDF = more unusual
    // Normalize by taking inverse of average TF-IDF
    const avgTfIdf = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const rarityScore = avgTfIdf > 0 ? 1 / (1 + avgTfIdf) : 0.5;
    
    return {
      text: fact,
      sources: Array.from(entry.sources),
      frequency: entry.frequency,
      rarityScore,
      wordCount,
      category: 'common' as const
    };
  });
  
  // Categorize facts
  const common = analyzedFacts
    .filter(f => f.frequency >= 3)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
    .map(f => ({ ...f, category: 'common' as const }));
  
  const unusual = analyzedFacts
    .filter(f => f.frequency === 1 && f.rarityScore >= 0.7)
    .sort((a, b) => b.rarityScore - a.rarityScore)
    .slice(0, 10)
    .map(f => ({ ...f, category: 'unusual' as const }));
  
  const long = analyzedFacts
    .filter(f => f.wordCount > 50)
    .sort((a, b) => b.wordCount - a.wordCount)
    .map(f => ({ ...f, category: 'long' as const }));
  
  if (logger) {
    logger.info('fact_analysis_complete', {
      totalUniqueFacts: analyzedFacts.length,
      commonFacts: common.length,
      unusualFacts: unusual.length,
      longFacts: long.length,
      avgFrequency: (analyzedFacts.reduce((sum, f) => sum + f.frequency, 0) / analyzedFacts.length).toFixed(2),
      avgWordCount: (analyzedFacts.reduce((sum, f) => sum + f.wordCount, 0) / analyzedFacts.length).toFixed(2)
    });
  }
  
  return { common, unusual, long };
}

/**
 * Extract key statistics from analyzed facts.
 * 
 * @semantic-role statistics
 * @input Analyzed facts
 * @output Statistics object
 */
export function getFactStatistics(facts: {
  common: AnalyzedFact[];
  unusual: AnalyzedFact[];
  long: AnalyzedFact[];
}): Record<string, number | string> {
  const allFacts = [...facts.common, ...facts.unusual, ...facts.long];
  const uniqueFacts = new Set(allFacts.map(f => f.text)).size;
  
  const totalFrequency = facts.common.reduce((sum, f) => sum + f.frequency, 0);
  const avgRarity = facts.unusual.length > 0
    ? facts.unusual.reduce((sum, f) => sum + f.rarityScore, 0) / facts.unusual.length
    : 0;
  
  return {
    totalUniqueFacts: uniqueFacts,
    mostCommonFactCount: facts.common.length > 0 ? facts.common[0].frequency : 0,
    averageRarityScore: avgRarity.toFixed(2),
    longestFactWords: facts.long.length > 0 ? facts.long[0].wordCount : 0
  };
}

/**
 * Format analyzed facts for digest output.
 * 
 * @semantic-role formatting
 * @input Analyzed facts array
 * @output Markdown-formatted string array
 */
export function formatFactsForDigest(facts: AnalyzedFact[]): string[] {
  return facts.map(fact => {
    const sourceList = fact.sources.slice(0, 3).join(', ');
    const moreStr = fact.sources.length > 3 ? ` (+${fact.sources.length - 3} more)` : '';
    
    return `- ${fact.text}\n  - **Frequency**: ${fact.frequency} | **Sources**: ${sourceList}${moreStr}`;
  });
}
