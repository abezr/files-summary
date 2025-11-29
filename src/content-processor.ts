/**
 * Content processing module for TextDigest.
 * 
 * @semantic-role content-extraction
 * @purpose Read file contents and organize into batches
 * @error-strategy Graceful degradation - log error, skip file
 */

import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { FileMetadata, FileContent, Batch } from './types.js';
import { CONFIG, createLogger } from './config.js';

const logger = createLogger('content-processor');

/**
 * Reads file content with UTF-8 encoding, fallback to latin1.
 * 
 * @semantic-role error-recovery
 * @error-strategy Graceful degradation - log error, skip file
 * 
 * @algorithm
 * 1. Try UTF-8 encoding first
 * 2. Fallback to latin1 if UTF-8 fails
 * 3. Count lines and words
 * 4. Log error and return empty content if both fail
 */
export async function readFileContent(file: FileMetadata): Promise<FileContent> {
  try {
    const content = await readFile(file.path, 'utf-8');
    return {
      metadata: file,
      content,
      encoding: 'utf8',
      lineCount: countLines(content),
      wordCount: countWords(content),
    };
  } catch (utf8Error: any) {
    try {
      const content = await readFile(file.path, 'latin1');
      logger.warn('utf8_decode_failed', { path: file.path, fallback: 'latin1' });
      return {
        metadata: file,
        content,
        encoding: 'latin1',
        lineCount: countLines(content),
        wordCount: countWords(content),
      };
    } catch (latin1Error: any) {
      logger.error('file_read_failed', { path: file.path, error: latin1Error.message });
      return {
        metadata: file,
        content: '',
        encoding: 'utf8',
        lineCount: 0,
        wordCount: 0,
        error: latin1Error.message,
      };
    }
  }
}

/**
 * Extracts content from multiple files in parallel.
 * 
 * @semantic-role content-extraction
 * @parallel-safe true
 * @input files: FileMetadata[] - List of files to read
 * @output FileContent[] - Extracted contents
 */
export async function extractContents(files: FileMetadata[]): Promise<FileContent[]> {
  logger.info('content_extraction_started', { fileCount: files.length });
  
  const startTime = Date.now();
  const contents = await Promise.all(files.map(readFileContent));
  
  const successCount = contents.filter(c => !c.error).length;
  const errorCount = contents.filter(c => c.error).length;
  const totalChars = contents.reduce((sum, c) => sum + c.content.length, 0);
  
  logger.info('content_extraction_completed', {
    totalFiles: files.length,
    successCount,
    errorCount,
    totalChars,
    durationMs: Date.now() - startTime,
  });
  
  return contents.filter(c => !c.error); // Return only successful reads
}

/**
 * Creates batches from file contents for parallel LLM processing.
 * 
 * @semantic-role batch-processing
 * @input contents: FileContent[] - All extracted contents
 * @input batchSize: number - Files per batch (default: 20)
 * @output Batch<FileContent>[] - Array of batches
 * 
 * @algorithm
 * 1. Group contents into chunks of batchSize
 * 2. Calculate total size for each batch
 * 3. Assign UUID to each batch
 */
export function createBatches(contents: FileContent[], batchSize: number = CONFIG.BATCH_SIZE): Batch<FileContent>[] {
  logger.info('batch_creation_started', { totalContents: contents.length, batchSize });
  
  const batches: Batch<FileContent>[] = [];
  
  for (let i = 0; i < contents.length; i += batchSize) {
    const items = contents.slice(i, i + batchSize);
    const totalSize = items.reduce((sum, item) => sum + item.content.length, 0);
    
    const batch: Batch<FileContent> = {
      id: randomUUID(),
      items,
      totalSize,
      createdAt: new Date(),
    };
    
    batches.push(batch);
    logger.info('batch_created', {
      batchId: batch.id,
      fileCount: items.length,
      totalSize,
    });
  }
  
  logger.info('batch_creation_completed', { totalBatches: batches.length });
  return batches;
}

/**
 * Processes batches in parallel with concurrency limit.
 * 
 * @semantic-role parallel-execution
 * @parallel-safe true
 * @concurrency-limit CONFIG.MAX_CONCURRENT_BATCHES
 * 
 * @algorithm
 * 1. Process batches in chunks of MAX_CONCURRENT_BATCHES
 * 2. Await each chunk before starting next
 * 3. Track progress
 */
export async function processBatchesInParallel<T, R>(
  batches: Batch<T>[],
  processor: (batch: Batch<T>) => Promise<R[]>,
  maxConcurrent: number = CONFIG.MAX_CONCURRENT_BATCHES
): Promise<R[]> {
  logger.info('parallel_processing_started', {
    totalBatches: batches.length,
    maxConcurrent,
  });
  
  const results: R[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const chunk = batches.slice(i, i + maxConcurrent);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults.flat());
    
    logger.info('batch_chunk_completed', {
      processedBatches: Math.min(i + maxConcurrent, batches.length),
      totalBatches: batches.length,
      progress: Math.round((Math.min(i + maxConcurrent, batches.length) / batches.length) * 100),
    });
  }
  
  logger.info('parallel_processing_completed', {
    totalResults: results.length,
    durationMs: Date.now() - startTime,
  });
  
  return results;
}

/**
 * Utility: Count lines in text.
 */
function countLines(text: string): number {
  return text.split('\n').length;
}

/**
 * Utility: Count words in text.
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
