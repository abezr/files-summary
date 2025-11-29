/**
 * Quality evaluation module for TextDigest.
 * 
 * @semantic-role quality-evaluation
 * @purpose Measure digest quality against thresholds
 */

import { Digest, EvaluationResult, FileMetadata } from './types.js';
import { CONFIG, createLogger } from './config.js';

const logger = createLogger('evaluator');

/**
 * Evaluates digest quality against acceptance criteria.
 * 
 * @semantic-role quality-assessment
 * @input digest: Digest - Generated digest
 * @input inputFiles: FileMetadata[] - Original input files
 * @output EvaluationResult - Quality scores and pass/fail status
 * 
 * @algorithm
 * 1. Calculate sourceLinked: % of facts with [source: ...] tags
 * 2. Calculate coverage: % of input files cited in digest
 * 3. Calculate confidence: Average confidence from summaries
 * 4. Compare against thresholds
 * 5. Generate issues and recommendations
 */
export function evaluateDigest(digest: Digest, inputFiles: FileMetadata[]): EvaluationResult {
  logger.info('evaluation_started', {
    digestFiles: digest.statistics.totalFiles,
    inputFiles: inputFiles.length,
  });
  
  // 1. Calculate sourceLinked score
  const sourceLinked = calculateSourceLinkedScore(digest);
  
  // 2. Calculate coverage score
  const coverage = calculateCoverageScore(digest, inputFiles);
  
  // 3. Calculate average confidence
  const confidence = calculateConfidenceScore(digest);
  
  // 4. Check thresholds
  const thresholds = CONFIG.QUALITY_THRESHOLDS;
  const passed =
    sourceLinked >= thresholds.sourceLinked &&
    coverage >= thresholds.coverage &&
    confidence >= thresholds.confidence;
  
  // 5. Generate issues
  const issues: string[] = [];
  if (sourceLinked < thresholds.sourceLinked) {
    issues.push(
      `Source linking below threshold: ${(sourceLinked * 100).toFixed(1)}% < ${(thresholds.sourceLinked * 100).toFixed(1)}%`
    );
  }
  if (coverage < thresholds.coverage) {
    issues.push(
      `File coverage below threshold: ${(coverage * 100).toFixed(1)}% < ${(thresholds.coverage * 100).toFixed(1)}%`
    );
  }
  if (confidence < thresholds.confidence) {
    issues.push(
      `Average confidence below threshold: ${(confidence * 100).toFixed(1)}% < ${(thresholds.confidence * 100).toFixed(1)}%`
    );
  }
  
  // 6. Generate recommendations
  const recommendations: string[] = [];
  if (sourceLinked < 0.95) {
    recommendations.push('Improve LLM prompt to enforce [source: ...] tags in all facts');
  }
  if (coverage < 0.90) {
    recommendations.push('Ensure executive summary cites insights from more input files');
  }
  if (confidence < 0.80) {
    recommendations.push('Review LLM responses for incomplete source citations');
  }
  
  const result: EvaluationResult = {
    scores: {
      sourceLinked,
      coverage,
      confidence,
    },
    thresholds,
    passed,
    issues,
    recommendations,
  };
  
  logger.info('evaluation_completed', {
    passed,
    scores: {
      sourceLinked: (sourceLinked * 100).toFixed(1) + '%',
      coverage: (coverage * 100).toFixed(1) + '%',
      confidence: (confidence * 100).toFixed(1) + '%',
    },
    issues: issues.length,
  });
  
  return result;
}

/**
 * Calculates % of facts/insights with [source: ...] tags.
 * 
 * @semantic-role metric-calculation
 */
function calculateSourceLinkedScore(digest: Digest): number {
  const allSummaries = [
    ...digest.fileSummaries.txt,
    ...digest.fileSummaries.md,
    ...digest.fileSummaries.log,
  ];
  
  const allItems = allSummaries.flatMap(s => [...s.keyFacts, ...s.insights]);
  if (allItems.length === 0) return 0;
  
  const linkedItems = allItems.filter(item => /\[source:/.test(item));
  return linkedItems.length / allItems.length;
}

/**
 * Calculates % of input files cited in digest.
 * 
 * @semantic-role metric-calculation
 */
function calculateCoverageScore(digest: Digest, inputFiles: FileMetadata[]): number {
  if (inputFiles.length === 0) return 0;
  
  const inputPaths = new Set(inputFiles.map(f => f.path));
  const citedPaths = new Set(digest.sourceIndex);
  
  let coveredCount = 0;
  for (const path of inputPaths) {
    if (citedPaths.has(path)) {
      coveredCount++;
    }
  }
  
  return coveredCount / inputFiles.length;
}

/**
 * Calculates average confidence from all summaries.
 * 
 * @semantic-role metric-calculation
 */
function calculateConfidenceScore(digest: Digest): number {
  const allSummaries = [
    ...digest.fileSummaries.txt,
    ...digest.fileSummaries.md,
    ...digest.fileSummaries.log,
  ];
  
  if (allSummaries.length === 0) return 0;
  
  const totalConfidence = allSummaries.reduce((sum, s) => sum + s.confidence, 0);
  return totalConfidence / allSummaries.length;
}
