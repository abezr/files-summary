#!/usr/bin/env node
/**
 * CLI interface for TextDigest v2.1.
 * 
 * @semantic-role cli-interface
 * @purpose Command-line argument parsing and orchestration
 * @version 2.1
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { discoverFiles } from './file-discovery.js';
import { extractContents, createBatches, processBatchesInParallel } from './content-processor.js';
import { summarizeBatch, generateConclusions } from './llm-summarizer.js';
import { generateDigest, writeDigest } from './digest-builder.js';
import { evaluateDigest } from './evaluator.js';
import { batchFilterLawContent, loadCustomLegalTerms } from './content-filter.js';
import { analyzeFacts } from './fact-analyzer.js';
import { buildKnowledgeGraph } from './graph-builder.js';
import { clusterEntities } from './semantic-clustering.js';
import { CONFIG, createLogger } from './config.js';

const logger = createLogger('textdigest-cli');

/**
 * Main orchestration function for v2.1.
 * 
 * @semantic-role orchestrator
 * @purpose Coordinate all stages of digest generation with v2.1 enhancements
 * @version 2.1
 * 
 * @algorithm
 * 1. Discover files from folder (last N days)
 * 2. Extract content from files
 * 3. [v2.1] Filter law content (optional)
 * 4. [v2.1] Adaptive processing: Knowledge Graph for large batches (>50 files)
 * 5. Create batches for parallel processing
 * 6. Summarize batches with LLM
 * 7. [v2.1] Analyze facts (common, unusual, long)
 * 8. [v2.1] Generate LLM conclusions & recommendations
 * 9. Generate digest with v2.1 sections
 * 10. Write to output file
 * 11. Evaluate quality
 */
async function runTextDigest(options: {
  folder: string;
  days: number;
  output: string;
  excludeLaw: boolean;
  includeConclusions: boolean;
  legalTerms?: string;
}): Promise<void> {
  const startTime = Date.now();
  
  logger.info('textdigest_v2.1_started', {
    folder: options.folder,
    days: options.days,
    output: options.output,
    excludeLaw: options.excludeLaw,
    includeConclusions: options.includeConclusions,
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
    let contents = await extractContents(files);
    
    if (contents.length === 0) {
      logger.error('no_content_extracted', { folder: options.folder });
      console.error('❌ Failed to extract content from any files.');
      process.exit(1);
    }
    
    // Stage 3: [v2.1] Law Content Filtering
    if (options.legalTerms) {
      loadCustomLegalTerms(options.legalTerms, logger);
    }
    
    const originalCount = contents.length;
    contents = batchFilterLawContent(contents, options.excludeLaw, logger);
    
    if (options.excludeLaw && originalCount > contents.length) {
      console.log(`📋 Law content filtering: ${originalCount - contents.length} files excluded`);
    }
    
    if (contents.length === 0) {
      logger.warn('all_files_filtered', { originalCount });
      console.error('⚠️  All files were filtered as law content. Use --no-exclude-law to include them.');
      process.exit(1);
    }
    
    // Stage 4: [v2.1] Adaptive Processing Decision
    const totalTokens = contents.reduce((sum, c) => sum + c.content.length / 4, 0); // Rough estimate
    const useKnowledgeGraph = contents.length > 50 || totalTokens > 20000;
    
    if (useKnowledgeGraph) {
      logger.info('using_knowledge_graph_mode', {
        fileCount: contents.length,
        estimatedTokens: Math.round(totalTokens),
      });
      console.log('🧠 Large batch detected - using Knowledge Graph mode for scalability');
      
      // Build knowledge graph
      const graph = buildKnowledgeGraph(contents, logger);
      
      // Cluster entities
      graph.clusters = clusterEntities(graph.nodes, logger);
      
      console.log(`   - Entities: ${graph.nodes.length}, Clusters: ${graph.clusters.length}`);
    }
    
    // Stage 5: Batch Creation
    const batches = createBatches(contents);
    
    // Stage 6: LLM Summarization (parallel)
    const summaries = await processBatchesInParallel(batches, summarizeBatch);
    
    if (summaries.length === 0) {
      logger.error('no_summaries_generated', { batches: batches.length });
      console.error('❌ Failed to generate summaries.');
      process.exit(1);
    }
    
    // Stage 7: [v2.1] Fact Analysis
    console.log('🔍 Analyzing facts...');
    const factAnalysis = analyzeFacts(summaries, logger);
    
    console.log(`   - Common facts: ${factAnalysis.common.length}`);
    console.log(`   - Unusual facts: ${factAnalysis.unusual.length}`);
    console.log(`   - Long facts: ${factAnalysis.long.length}`);
    
    // Stage 8: [v2.1] LLM Conclusions & Recommendations
    let conclusions = null;
    if (options.includeConclusions) {
      console.log('💡 Generating conclusions and recommendations...');
      conclusions = await generateConclusions(summaries, factAnalysis, logger);
      console.log(`   - Conclusions: ${conclusions.conclusions.length}`);
      console.log(`   - Recommendations: ${conclusions.recommendations.length}`);
    }
    
    // Stage 9: Digest Generation
    const processingTimeMs = Date.now() - startTime;
    const digest = generateDigest(summaries, processingTimeMs, factAnalysis, conclusions);
    
    // Stage 10: Write Output
    await writeDigest(digest, options.output);
    
    // Stage 11: Quality Evaluation
    const evaluation = evaluateDigest(digest, files);
    
    // Log final results
    logger.info('textdigest_v2.1_completed', {
      totalFiles: files.length,
      processedFiles: contents.length,
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
    console.log(`📊 Files processed: ${contents.length} (of ${files.length} discovered)`);
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
    logger.error('textdigest_v2.1_failed', {
      error: error.message,
      stack: error.stack,
    });
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * CLI program definition for v2.1.
 * @version 2.1
 */
const program = new Command();

program
  .name('textdigest')
  .description('Intelligent Text File Digest Generator v2.1 - With Knowledge Graph, Law Filtering, and Advanced Fact Analysis')
  .version('2.1.0')
  .requiredOption('-f, --folder <path>', 'Folder to scan for text files')
  .option('-d, --days <number>', 'Number of days to look back', String(CONFIG.DEFAULT_DAYS_BACK))
  .option('-o, --output <path>', 'Output path for digest.md', CONFIG.DEFAULT_OUTPUT_PATH)
  .option('--no-exclude-law', 'Include law content files (default: exclude)')
  .option('--include-conclusions', 'Generate LLM conclusions and recommendations (default: false)')
  .option('--legal-terms <path>', 'Path to custom legal terms JSON file')
  .action(async (options) => {
    const folder = resolve(options.folder);
    const days = parseInt(options.days, 10);
    const output = resolve(options.output);
    const excludeLaw = options.excludeLaw !== false; // Default: true
    const includeConclusions = options.includeConclusions || false;
    const legalTerms = options.legalTerms ? resolve(options.legalTerms) : undefined;
    
    await runTextDigest({ 
      folder, 
      days, 
      output, 
      excludeLaw, 
      includeConclusions,
      legalTerms 
    });
  });

program.parse();
