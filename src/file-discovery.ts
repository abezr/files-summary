/**
 * File discovery module for TextDigest.
 * 
 * @semantic-role file-discovery
 * @purpose Scan folder recursively for text files modified in last N days
 * @algorithm
 * 1. Recursively walk directory tree
 * 2. Filter by extension (.txt, .md, .log)
 * 3. Filter by modification date (now - N days)
 * 4. Sort by modifiedAt DESC (newest first)
 * 5. Warn if file > 10MB, skip
 */

import { glob } from 'glob';
import { stat } from 'fs/promises';
import { resolve, relative, extname } from 'path';
import { FileMetadata } from './types.js';
import { CONFIG, createLogger } from './config.js';

const logger = createLogger('file-discovery');

/**
 * Discovers all text files modified in the last N days from a folder.
 * 
 * @semantic-role file-discovery
 * @input folder: string - Absolute or relative path to scan
 * @input days: number - Number of days to look back (e.g., 6)
 * @output FileMetadata[] - List of discovered files
 * @throws FileSystemError - If folder doesn't exist or is inaccessible
 * 
 * @algorithm
 * 1. Recursively walk directory tree using glob
 * 2. Filter by extension: .txt, .md, .log
 * 3. Filter by modification date: now - days <= mtime
 * 4. Sort by modifiedAt DESC (newest first)
 * 5. Warn if file > 10MB, skip
 * 
 * @example
 * const files = await discoverFiles('./logs', 6);
 * console.log(`Found ${files.length} files`);
 */
export async function discoverFiles(folder: string, days: number): Promise<FileMetadata[]> {
  logger.info('file_discovery_started', { folder, days });
  
  const startTime = Date.now();
  const absoluteFolder = resolve(folder);
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Build glob pattern for supported extensions
  const patterns = CONFIG.SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`);
  
  // Find all matching files
  const allFiles: FileMetadata[] = [];
  let skippedCount = 0;
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: absoluteFolder,
      absolute: false,
      nodir: true,
      dot: false,
    });
    
    for (const file of files) {
      const absolutePath = resolve(absoluteFolder, file);
      
      try {
        const stats = await stat(absolutePath);
        
        // Skip if file is too large
        if (stats.size > CONFIG.MAX_FILE_SIZE) {
          logger.warn('file_too_large', {
            path: file,
            size: stats.size,
            maxSize: CONFIG.MAX_FILE_SIZE,
          });
          skippedCount++;
          continue;
        }
        
        // Skip if file is too old
        if (stats.mtime < cutoffDate) {
          continue;
        }
        
        // Extract file type
        const ext = extname(file).substring(1) as 'txt' | 'md' | 'log';
        
        allFiles.push({
          path: relative(process.cwd(), absolutePath),
          size: stats.size,
          modifiedAt: stats.mtime,
          type: ext,
        });
        
        logger.info('file_discovered', {
          path: file,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          type: ext,
        });
      } catch (error: any) {
        logger.error('file_stat_failed', { path: file, error: error.message });
      }
    }
  }
  
  // Sort by modification date (newest first)
  allFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  
  const duration = Date.now() - startTime;
  logger.info('file_discovery_completed', {
    totalFiles: allFiles.length,
    skippedFiles: skippedCount,
    durationMs: duration,
  });
  
  if (allFiles.length === 0) {
    logger.warn('no_files_found', {
      folder,
      days,
      cutoffDate: cutoffDate.toISOString(),
    });
  }
  
  return allFiles;
}
