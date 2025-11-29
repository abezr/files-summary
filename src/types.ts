/**
 * Type definitions for TextDigest system.
 * 
 * @semantic-role data-structures
 * @purpose Define all interfaces with validation rules
 * @maintainability LLM-friendly semantic markup
 */

/**
 * Represents metadata for a discovered text file.
 * 
 * @semantic-role data-structure
 * @usage Used in file-discovery and content-extraction stages
 * @validation
 * - path: Non-empty string, must exist on filesystem
 * - size: Positive integer, <= 10MB (10485760 bytes)
 * - modifiedAt: Valid Date, within last N days
 * - type: One of 'txt', 'md', 'log'
 */
export interface FileMetadata {
  path: string;          // Relative path from scan folder
  size: number;          // File size in bytes
  modifiedAt: Date;      // Last modification timestamp
  type: 'txt' | 'md' | 'log';
}

/**
 * Represents extracted content from a text file.
 * 
 * @semantic-role data-structure
 * @usage Content extraction stage output
 * @validation
 * - content: String with max 10MB length
 * - encoding: 'utf8' or 'latin1'
 * - error: Optional, set if read failed
 */
export interface FileContent {
  metadata: FileMetadata;
  content: string;       // UTF-8 or latin1 text content
  lineCount: number;
  wordCount: number;
  encoding: 'utf8' | 'latin1';
  error?: string;        // If read failed
}

/**
 * Represents a batch of files for parallel processing.
 * 
 * @semantic-role data-structure
 * @usage Batch processing stage
 * @validation
 * - items: Array of FileContent, max 20 items
 * - totalSize: Sum of all file sizes in batch
 */
export interface Batch<T> {
  id: string;            // UUID
  items: T[];
  totalSize: number;     // Combined bytes
  createdAt: Date;
}

/**
 * Represents an LLM-generated summary for a single file.
 * 
 * @semantic-role data-structure
 * @usage LLM summarization output
 * @validation
 * - keyFacts: Must have [source: ...] tags (90%+ requirement)
 * - confidence: 0-1 score
 */
export interface FileSummary {
  file: FileMetadata;
  summary: string;       // 2-3 sentence summary
  keyFacts: string[];    // 3-5 bullet points with [source: ...]
  insights: string[];    // 1-2 insights with [source: ...]
  statistics: {          // Extracted numbers
    [key: string]: number | string;
  };
  sources: string[];     // File paths referenced
  model: string;         // gemini-2.0-flash-exp or gpt-4o-mini
  tokens: number;
  confidence: number;    // 0-1 score
}

/**
 * Represents the final digest output structure.
 * 
 * @semantic-role data-structure
 * @usage Digest generation stage
 */
export interface Digest {
  executiveSummary: string[];  // Top 5-10 insights across all files
  fileSummaries: {             // Grouped by file type
    txt: FileSummary[];
    md: FileSummary[];
    log: FileSummary[];
  };
  statistics: {
    totalFiles: number;
    totalSize: number;
    dateRange: [Date, Date];
    fileTypes: Record<string, number>;
  };
  sourceIndex: string[];       // All file paths, sorted
  metadata: {
    generatedAt: Date;
    processingTime: number;    // Seconds
    model: string;
  };
}

/**
 * Represents quality evaluation results.
 * 
 * @semantic-role data-structure
 * @usage Quality evaluation stage
 */
export interface EvaluationResult {
  scores: {
    sourceLinked: number;      // % of facts with [source: ...] tags
    coverage: number;          // % of files cited in executive summary
    confidence: number;        // Avg confidence score
  };
  thresholds: {
    sourceLinked: number;      // Min 0.90
    coverage: number;          // Min 0.80
    confidence: number;        // Min 0.75
  };
  passed: boolean;
  issues: string[];            // Failed checks
  recommendations: string[];   // Improvement suggestions
}

/**
 * Logger interface for structured logging.
 * 
 * @semantic-role observability
 * @usage Structured JSON logs for MCP integration
 */
export interface Logger {
  info(event: string, data?: Record<string, any>): void;
  warn(event: string, data?: Record<string, any>): void;
  error(event: string, data?: Record<string, any>): void;
}
