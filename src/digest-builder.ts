/**
 * Digest generation module for TextDigest.
 * 
 * @semantic-role digest-generation
 * @purpose Build final Markdown output from summaries
 */

import { writeFile } from 'fs/promises';
import { Digest, FileSummary } from './types.js';
import { createLogger } from './config.js';

const logger = createLogger('digest-builder');

/**
 * Generates digest structure from file summaries.
 * 
 * @semantic-role data-aggregation
 * @input summaries: FileSummary[] - All generated summaries
 * @output Digest - Structured digest object
 */
export function generateDigest(summaries: FileSummary[], processingTimeMs: number): Digest {
  logger.info('digest_generation_started', { summaryCount: summaries.length });
  
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
  
  const digest: Digest = {
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
  };
  
  logger.info('digest_generation_completed', {
    executiveSummaryCount: executiveSummary.length,
    totalFiles,
    totalSize,
  });
  
  return digest;
}

/**
 * Renders digest as Markdown.
 * 
 * @semantic-role markdown-generation
 * @output string - Markdown content
 */
export function renderDigestMarkdown(digest: Digest): string {
  const md: string[] = [];
  
  // Header
  md.push('# Text File Digest\n');
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
  
  // Statistics
  md.push('## 📊 Statistics\n');
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
