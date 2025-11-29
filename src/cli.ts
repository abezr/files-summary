#!/usr/bin/env node
/**
 * CLI interface for TextDigest.
 * 
 * @semantic-role cli-interface
 * @purpose Command-line argument parsing and orchestration
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { discoverFiles } from './file-discovery.js';
import { extractContents, createBatches, processBatchesInParallel } from './content-processor.js';
import { summarizeBatch } from './llm-summarizer.js';
import { generateDigest, writeDigest } from './digest-builder.js';
import { evaluateDigest } from './evaluator.js';
import { CONFIG, createLogger } from './config.js';

const logger = createLogger('textdigest-cli');

/**
 * Main orchestration function.
 * 
 * @semantic-role orchestrator
 * @purpose Coordinate all stages of digest generation
 * 
 * @algorithm
 * 1. Discover files from folder (last N days)
 * 2. Extract content from files
 * 3. Create batches for parallel processing
 * 4. Summarize batches with LLM
 * 5. Generate digest
 * 6. Write to output file
 * 7. Evaluate quality
 */
async function runTextDigest(options: {
  folder: string;
  days: number;
  output: string;
}): Promise<void> {
  const startTime = Date.now();
  
  logger.info('textdigest_started', {
    folder: options.folder,
    days: options.days,
    output: options.output,
  });
  
  try {
    // Stage 1: File Discovery
    const files = await discoverFiles(options.folder, options.days);
    
    if (files.length === 0) {
      logger.warn('no_files_to_process', { folder: options.folder, days: options.days });
      console.error('⚠️  No files found to process. Try increasing --days or checking folder path.');
      process.exit(1);
    }
    
    // Stage 2: Content Extraction
    const contents = await extractContents(files);
    
    if (contents.length === 0) {
      logger.error('no_content_extracted', { folder: options.folder });
      console.error('❌ Failed to extract content from any files.');
      process.exit(1);
    }
    
    // Stage 3: Batch Creation
    const batches = createBatches(contents);
    
    // Stage 4: LLM Summarization (parallel)
    const summaries = await processBatchesInParallel(batches, summarizeBatch);
    
    if (summaries.length === 0) {
      logger.error('no_summaries_generated', { batches: batches.length });
      console.error('❌ Failed to generate summaries.');
      process.exit(1);
    }
    
    // Stage 5: Digest Generation
    const processingTimeMs = Date.now() - startTime;
    const digest = generateDigest(summaries, processingTimeMs);
    
    // Stage 6: Write Output
    await writeDigest(digest, options.output);
    
    // Stage 7: Quality Evaluation
    const evaluation = evaluateDigest(digest, files);
    
    // Log final results
    logger.info('textdigest_completed', {
      totalFiles: files.length,
      summariesGenerated: summaries.length,
      outputPath: options.output,
      processingTimeSeconds: Math.round(processingTimeMs / 1000),
      evaluation: {
        passed: evaluation.passed,
        scores: evaluation.scores,
      },
    });
    
    // Display results
    console.log('\n✅ Digest generated successfully!');
    console.log(`📄 Output: ${options.output}`);
    console.log(`⏱️  Processing time: ${Math.round(processingTimeMs / 1000)}s`);
    console.log(`📊 Files processed: ${files.length}`);
    console.log('\n📈 Quality Metrics:');
    console.log(`   - Source Linking: ${(evaluation.scores.sourceLinked * 100).toFixed(1)}% (threshold: ${(evaluation.thresholds.sourceLinked * 100).toFixed(1)}%)`);
    console.log(`   - File Coverage: ${(evaluation.scores.coverage * 100).toFixed(1)}% (threshold: ${(evaluation.thresholds.coverage * 100).toFixed(1)}%)`);
    console.log(`   - Confidence: ${(evaluation.scores.confidence * 100).toFixed(1)}% (threshold: ${(evaluation.thresholds.confidence * 100).toFixed(1)}%)`);
    
    if (!evaluation.passed) {
      console.log('\n⚠️  Quality Gate: FAILED');
      console.log('Issues:');
      evaluation.issues.forEach(issue => console.log(`   - ${issue}`));
      
      if (evaluation.recommendations.length > 0) {
        console.log('\nRecommendations:');
        evaluation.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
    } else {
      console.log('\n✅ Quality Gate: PASSED');
    }
    
  } catch (error: any) {
    logger.error('textdigest_failed', {
      error: error.message,
      stack: error.stack,
    });
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * CLI program definition.
 */
const program = new Command();

program
  .name('textdigest')
  .description('Intelligent Text File Digest Generator - Summarizes recent text files with LLM-powered insights')
  .version('1.0.0')
  .requiredOption('-f, --folder <path>', 'Folder to scan for text files')
  .option('-d, --days <number>', 'Number of days to look back', String(CONFIG.DEFAULT_DAYS_BACK))
  .option('-o, --output <path>', 'Output path for digest.md', CONFIG.DEFAULT_OUTPUT_PATH)
  .action(async (options) => {
    const folder = resolve(options.folder);
    const days = parseInt(options.days, 10);
    const output = resolve(options.output);
    
    await runTextDigest({ folder, days, output });
  });

program.parse();
