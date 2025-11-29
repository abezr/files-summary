/**
 * Digest generation module for TextDigest v2.1.
 * 
 * @semantic-role digest-generation
 * @purpose Build final Markdown output from summaries with v2.1 enhancements
 * @version 2.1
 */

import { writeFile } from 'fs/promises';
import { Digest, FileSummary, LLMConclusions, AnalyzedFact } from './types.js';
import { createLogger } from './config.js';
import { formatFactsForDigest, getFactStatistics } from './fact-analyzer.js';

const logger = createLogger('digest-builder');

/**
 * Generates digest structure from file summaries with v2.1 features.
 * 
 * @semantic-role data-aggregation
 * @input summaries: FileSummary[] - All generated summaries
 * @input processingTimeMs: number - Total processing time
 * @input factAnalysis: Optional analyzed facts
 * @input conclusions: Optional LLM conclusions
 * @output Digest - Structured digest object with v2.1 sections
 * @version 2.1
 */
export function generateDigest(
  summaries: FileSummary[], 
  processingTimeMs: number,
  factAnalysis?: { common: AnalyzedFact[]; unusual: AnalyzedFact[]; long: AnalyzedFact[] },
  conclusions?: LLMConclusions | null
): Digest {
  logger.info('digest_generation_v2.1_started', { 
    summaryCount: summaries.length,
    hasFactAnalysis: !!factAnalysis,
    hasConclusions: !!conclusions
  });
  
  // Group summaries by file type
  const fileSummaries = {
    txt: summaries.filter(s => s.file.type === 'txt'),
    md: summaries.filter(s => s.file.type === 'md'),
    log: summaries.filter(s => s.file.type === 'log'),
  };
  
  // Extract executive summary (top insights across all files)
  const executiveSummary = extractTopInsights(summaries, 10);
  
  // Calculate statistics
  const totalFiles = summaries.length;
  const totalSize = summaries.reduce((sum, s) => sum + s.file.size, 0);
  const dates = summaries.map(s => s.file.modifiedAt.getTime());
  const dateRange: [Date, Date] = [new Date(Math.min(...dates)), new Date(Math.max(...dates))];
  
  const fileTypes: Record<string, number> = {
    txt: fileSummaries.txt.length,
    md: fileSummaries.md.length,
    log: fileSummaries.log.length,
  };
  
  // Build source index (all unique file paths)
  const sourceIndex = Array.from(new Set(summaries.map(s => s.file.path))).sort();
  
  const digest: Digest & {
    factAnalysis?: typeof factAnalysis;
    conclusions?: typeof conclusions;
  } = {
    executiveSummary,
    fileSummaries,
    statistics: {
      totalFiles,
      totalSize,
      dateRange,
      fileTypes,
    },
    sourceIndex,
    metadata: {
      generatedAt: new Date(),
      processingTime: Math.round(processingTimeMs / 1000),
      model: summaries[0]?.model || 'unknown',
    },
    factAnalysis,
    conclusions: conclusions || undefined
  };
  
  logger.info('digest_generation_v2.1_completed', {
    executiveSummaryCount: executiveSummary.length,
    totalFiles,
    totalSize,
    commonFacts: factAnalysis?.common.length || 0,
    unusualFacts: factAnalysis?.unusual.length || 0,
    longFacts: factAnalysis?.long.length || 0,
    conclusions: conclusions?.conclusions.length || 0,
    recommendations: conclusions?.recommendations.length || 0
  });
  
  return digest as Digest;
}

/**
 * Renders digest as Markdown with v2.1 enhancements.
 * 
 * @semantic-role markdown-generation
 * @output string - Markdown content with v2.1 sections
 * @version 2.1
 */
export function renderDigestMarkdown(digest: Digest & {
  factAnalysis?: { common: AnalyzedFact[]; unusual: AnalyzedFact[]; long: AnalyzedFact[] };
  conclusions?: LLMConclusions;
}): string {
  const md: string[] = [];
  
  // Header
  md.push('# Text File Digest v2.1\n');
  md.push(`**Generated**: ${digest.metadata.generatedAt.toISOString()}`);
  md.push(`**Processing Time**: ${digest.metadata.processingTime}s`);
  md.push(`**Model**: ${digest.metadata.model}\n`);
  md.push('---\n');
  
  // Executive Summary
  md.push('## 🎯 Executive Summary\n');
  md.push(`Top insights from ${digest.statistics.totalFiles} files (last 6 days):\n`);
  digest.executiveSummary.forEach((insight, i) => {
    md.push(`${i + 1}. ${insight}`);
  });
  md.push('\n---\n');
  
  // v2.1: LLM Conclusions & Recommendations
  if (digest.conclusions) {
    md.push('## 💡 Conclusions & Recommendations\n');
    
    if (digest.conclusions.conclusions.length > 0) {
      md.push('### High-Level Conclusions\n');
      digest.conclusions.conclusions.forEach((conclusion, i) => {
        md.push(`${i + 1}. ${conclusion}`);
      });
      md.push('');
    }
    
    if (digest.conclusions.recommendations.length > 0) {
      md.push('### Actionable Recommendations\n');
      digest.conclusions.recommendations.forEach((rec, i) => {
        md.push(`${i + 1}. ${rec}`);
      });
      md.push('');
    }
    
    if (digest.conclusions.evidence.length > 0) {
      md.push('### Supporting Evidence\n');
      digest.conclusions.evidence.slice(0, 5).forEach(ev => {
        md.push(`- ${ev}`);
      });
      md.push('');
    }
    
    md.push(`*Confidence: ${(digest.conclusions.confidence * 100).toFixed(1)}%*\n`);
    md.push('---\n');
  }
  
  // v2.1: Advanced Fact Analysis
  if (digest.factAnalysis) {
    md.push('## 🔍 Advanced Fact Analysis\n');
    
    if (digest.factAnalysis.common.length > 0) {
      md.push('### Most Common Facts\n');
      md.push('Facts that appear frequently across multiple files:\n');
      formatFactsForDigest(digest.factAnalysis.common.slice(0, 5)).forEach(fact => {
        md.push(fact);
      });
      md.push('');
    }
    
    if (digest.factAnalysis.unusual.length > 0) {
      md.push('### Most Unusual Facts\n');
      md.push('Rare but significant findings:\n');
      formatFactsForDigest(digest.factAnalysis.unusual.slice(0, 5)).forEach(fact => {
        md.push(fact);
      });
      md.push('');
    }
    
    if (digest.factAnalysis.long.length > 0) {
      md.push('### Long Facts (>50 words)\n');
      md.push('Detailed findings requiring attention:\n');
      formatFactsForDigest(digest.factAnalysis.long.slice(0, 3)).forEach(fact => {
        md.push(fact);
      });
      md.push('');
    }
    
    // Fact statistics
    const factStats = getFactStatistics(digest.factAnalysis);
    md.push('### Fact Statistics\n');
    Object.entries(factStats).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      md.push(`- **${label}**: ${value}`);
    });
    md.push('\n---\n');
  }
  
  // Statistics
  md.push('## 📊 File Statistics\n');
  md.push(`- **Total Files**: ${digest.statistics.totalFiles}`);
  md.push(`- **Total Size**: ${formatBytes(digest.statistics.totalSize)}`);
  md.push(`- **Date Range**: ${formatDate(digest.statistics.dateRange[0])} to ${formatDate(digest.statistics.dateRange[1])}`);
  md.push(`- **File Types**: ${Object.entries(digest.statistics.fileTypes).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  md.push('\n---\n');
  
  // File Summaries by Type
  md.push('## 📝 File Summaries\n');
  
  if (digest.fileSummaries.txt.length > 0) {
    md.push('### Text Files (.txt)\n');
    digest.fileSummaries.txt.forEach(summary => {
      md.push(renderFileSummary(summary));
    });
  }
  
  if (digest.fileSummaries.md.length > 0) {
    md.push('### Markdown Files (.md)\n');
    digest.fileSummaries.md.forEach(summary => {
      md.push(renderFileSummary(summary));
    });
  }
  
  if (digest.fileSummaries.log.length > 0) {
    md.push('### Log Files (.log)\n');
    digest.fileSummaries.log.forEach(summary => {
      md.push(renderFileSummary(summary));
    });
  }
  
  // Source Index
  md.push('\n---\n');
  md.push('## 🔗 Source Index\n');
  md.push('All processed files (clickable links):\n');
  digest.sourceIndex.forEach(path => {
    md.push(`- [${path}](${path})`);
  });
  
  md.push('\n---\n');
  md.push('*Generated by TextDigest v2.1 - https://github.com/abezr/files-summary*');
  
  return md.join('\n');
}

/**
 * Renders a single file summary.
 */
function renderFileSummary(summary: FileSummary): string {
  const lines: string[] = [];
  
  lines.push(`#### [${summary.file.path}](${summary.file.path})`);
  lines.push(`**Modified**: ${formatDate(summary.file.modifiedAt)} | **Size**: ${formatBytes(summary.file.size)}\n`);
  lines.push(summary.summary + '\n');
  
  if (summary.keyFacts.length > 0) {
    lines.push('**Key Facts**:');
    summary.keyFacts.forEach(fact => {
      lines.push(`- ${fact}`);
    });
    lines.push('');
  }
  
  if (summary.insights.length > 0) {
    lines.push('**Insights**:');
    summary.insights.forEach(insight => {
      lines.push(`- ${insight}`);
    });
    lines.push('');
  }
  
  if (Object.keys(summary.statistics).length > 0) {
    lines.push(`**Statistics**: ${JSON.stringify(summary.statistics)}\n`);
  }
  
  lines.push('---\n');
  return lines.join('\n');
}

/**
 * Writes digest to file.
 * 
 * @semantic-role file-output
 */
export async function writeDigest(digest: Digest, outputPath: string): Promise<void> {
  logger.info('digest_write_started', { outputPath });
  
  const markdown = renderDigestMarkdown(digest);
  await writeFile(outputPath, markdown, 'utf-8');
  
  logger.info('digest_write_completed', {
    outputPath,
    sizeBytes: markdown.length,
  });
}

/**
 * Extracts top insights from all summaries.
 */
function extractTopInsights(summaries: FileSummary[], count: number): string[] {
  const allInsights = summaries.flatMap(s => s.insights);
  
  // Deduplicate and take top N
  const uniqueInsights = Array.from(new Set(allInsights));
  return uniqueInsights.slice(0, count);
}

/**
 * Utility: Format bytes to human-readable.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Utility: Format date to readable string.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
