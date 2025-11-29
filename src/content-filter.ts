/**
 * Content filtering module for law content detection and exclusion.
 * 
 * @semantic-role content-filtering
 * @algorithm
 * 1. Load legal terms configuration
 * 2. Pattern matching for case citations (e.g., "Brown v. Board, 347 U.S. 483")
 * 3. Pattern matching for statutes (e.g., "18 U.S.C. § 1001")
 * 4. Calculate confidence score based on matches
 * 5. Return filtering result with matched terms
 * 
 * @version 2.1
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LawFilterResult, FileContent, Logger } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Legal terms configuration
 * @semantic-role configuration
 */
interface LegalTermsConfig {
  legalTerms: string[];
  caseCitationPatterns: string[];
  statutePatterns: string[];
  excludePatterns: string[];
}

let config: LegalTermsConfig | null = null;

/**
 * Load legal terms configuration from JSON file.
 * 
 * @semantic-role initialization
 * @input None
 * @output LegalTermsConfig object
 */
function loadConfig(): LegalTermsConfig {
  if (config) return config;
  
  try {
    const configPath = join(__dirname, '../config/legal-terms.json');
    const content = readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
    return config!;
  } catch (error) {
    // Fallback to minimal config
    config = {
      legalTerms: ['plaintiff', 'defendant', 'court', 'judge', 'jury'],
      caseCitationPatterns: ['v\\.', '\\d+\\s+U\\.S\\.'],
      statutePatterns: ['§\\s*\\d+', 'Section\\s+\\d+'],
      excludePatterns: []
    };
    return config;
  }
}

/**
 * Filter law content from a file.
 * 
 * @semantic-role filtering
 * @input FileContent object
 * @output LawFilterResult with confidence score
 * @algorithm
 * 1. Convert content to lowercase for matching
 * 2. Match legal terms (case-insensitive)
 * 3. Match case citations (regex)
 * 4. Match statutes (regex)
 * 5. Calculate confidence: (matches / total_patterns) * weight
 * 6. Threshold: >= 0.3 confidence = legal content
 * 
 * @quality-metrics
 * - Target Precision: >= 90%
 * - Target Recall: >= 85%
 * 
 * @example
 * ```typescript
 * const result = filterLawContent(fileContent, logger);
 * if (result.isLegalContent && result.confidence > 0.7) {
 *   // Exclude this file from digest
 * }
 * ```
 */
export function filterLawContent(
  file: FileContent,
  logger?: Logger
): LawFilterResult {
  const cfg = loadConfig();
  const content = file.content.toLowerCase();
  const matchedTerms: string[] = [];
  const caseCitations: string[] = [];
  const statutes: string[] = [];
  
  // Match legal terms (case-insensitive)
  for (const term of cfg.legalTerms) {
    const pattern = new RegExp(`\\b${term.toLowerCase()}\\b`, 'g');
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      matchedTerms.push(term);
    }
  }
  
  // Match case citations
  for (const pattern of cfg.caseCitationPatterns) {
    const regex = new RegExp(pattern, 'gi');
    const matches = file.content.match(regex);
    if (matches) {
      caseCitations.push(...matches);
    }
  }
  
  // Match statutes
  for (const pattern of cfg.statutePatterns) {
    const regex = new RegExp(pattern, 'gi');
    const matches = file.content.match(regex);
    if (matches) {
      statutes.push(...matches);
    }
  }
  
  // Calculate confidence score
  // Weight: legal terms (0.4), case citations (0.4), statutes (0.2)
  const termScore = Math.min(matchedTerms.length / 10, 1.0) * 0.4;
  const citationScore = Math.min(caseCitations.length / 5, 1.0) * 0.4;
  const statuteScore = Math.min(statutes.length / 3, 1.0) * 0.2;
  const confidence = termScore + citationScore + statuteScore;
  
  // Threshold: >= 0.3 confidence indicates legal content
  const isLegalContent = confidence >= 0.3;
  
  if (logger && isLegalContent) {
    logger.info('law_content_detected', {
      file: file.metadata.path,
      confidence,
      matchedTerms: matchedTerms.slice(0, 5),
      caseCitations: caseCitations.slice(0, 3),
      statutes: statutes.slice(0, 3)
    });
  }
  
  return {
    isLegalContent,
    confidence,
    matchedTerms,
    caseCitations,
    statutes
  };
}

/**
 * Batch filter law content from multiple files.
 * 
 * @semantic-role batch-processing
 * @input Array of FileContent
 * @output Filtered array (non-legal files only)
 * 
 * @example
 * ```typescript
 * const filtered = batchFilterLawContent(files, true, logger);
 * // filtered contains only non-legal files
 * ```
 */
export function batchFilterLawContent(
  files: FileContent[],
  excludeLaw: boolean = true,
  logger?: Logger
): FileContent[] {
  if (!excludeLaw) return files;
  
  const filtered: FileContent[] = [];
  let excludedCount = 0;
  
  for (const file of files) {
    const result = filterLawContent(file, logger);
    
    if (!result.isLegalContent) {
      filtered.push(file);
    } else {
      excludedCount++;
    }
  }
  
  if (logger && excludedCount > 0) {
    logger.info('law_content_filtering_complete', {
      totalFiles: files.length,
      excluded: excludedCount,
      retained: filtered.length,
      exclusionRate: (excludedCount / files.length).toFixed(2)
    });
  }
  
  return filtered;
}

/**
 * Load custom legal terms from file path.
 * 
 * @semantic-role configuration
 * @input Path to custom legal terms JSON file
 * @output Updated configuration
 */
export function loadCustomLegalTerms(path: string, logger?: Logger): void {
  try {
    const content = readFileSync(path, 'utf8');
    const customConfig = JSON.parse(content);
    config = customConfig;
    
    if (logger) {
      logger.info('custom_legal_terms_loaded', {
        path,
        termCount: config?.legalTerms.length || 0
      });
    }
  } catch (error) {
    if (logger) {
      logger.error('custom_legal_terms_load_failed', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
