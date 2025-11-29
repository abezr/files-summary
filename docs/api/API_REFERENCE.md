# TextDigest - API Reference

**Version**: 1.0.0  
**Date**: 2025-11-29

---

## 📖 Table of Contents

1. [CLI Interface](#cli-interface)
2. [Core Functions](#core-functions)
3. [Type Definitions](#type-definitions)
4. [Configuration](#configuration)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## 🖥️ CLI Interface

### Command
```bash
textdigest [options]
```

### Options

| Option | Alias | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--folder` | `-f` | string | ✅ Yes | - | Folder to scan for text files |
| `--days` | `-d` | number | ❌ No | `6` | Number of days to look back |
| `--output` | `-o` | string | ❌ No | `./output/digest.md` | Output path for digest |
| `--help` | `-h` | - | ❌ No | - | Display help information |
| `--version` | `-V` | - | ❌ No | - | Display version number |

### Examples

```bash
# Basic usage
textdigest --folder ./logs

# Custom time window
textdigest --folder ./logs --days 14

# Custom output path
textdigest --folder ./logs --output ./reports/weekly-digest.md

# Full options
textdigest \
  --folder /path/to/project/logs \
  --days 30 \
  --output /path/to/reports/monthly.md
```

### Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Digest generated successfully |
| `1` | Error | Generic error (see logs for details) |

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_API_KEY` | ⚠️ One required* | Google Gemini API key | `AIza...` |
| `OPENAI_API_KEY` | ⚠️ One required* | OpenAI API key | `sk-proj-...` |
| `LOG_LEVEL` | ❌ No | Log verbosity | `info` (default) |

*At least one API key is required.

---

## 🔧 Core Functions

### File Discovery

#### `discoverFiles(folder: string, days: number): Promise<FileMetadata[]>`

Discovers all text files modified in the last N days from a folder.

**Parameters**:
- `folder` (string): Absolute or relative path to scan
- `days` (number): Number of days to look back (e.g., 6)

**Returns**: `Promise<FileMetadata[]>` - List of discovered files

**Throws**: `Error` if folder doesn't exist or is inaccessible

**Algorithm**:
1. Recursively walk directory tree using glob
2. Filter by extension: `.txt`, `.md`, `.log`
3. Filter by modification date: `now - days <= mtime`
4. Sort by `modifiedAt` DESC (newest first)
5. Warn if file > 10MB, skip

**Example**:
```typescript
import { discoverFiles } from './file-discovery.js';

const files = await discoverFiles('./logs', 6);
console.log(`Found ${files.length} files`);
```

**Structured Log Events**:
- `file_discovery_started` - When scan begins
- `file_discovered` - For each discovered file
- `file_too_large` - When file > 10MB
- `no_files_found` - When no files match criteria
- `file_discovery_completed` - When scan completes

---

### Content Processing

#### `readFileContent(file: FileMetadata): Promise<FileContent>`

Reads file content with UTF-8 encoding, fallback to latin1.

**Parameters**:
- `file` (FileMetadata): File metadata object

**Returns**: `Promise<FileContent>` - Extracted content

**Error Strategy**: Graceful degradation
1. Try UTF-8 encoding first
2. On failure, try latin1 encoding
3. On both failures, return empty content with error

**Example**:
```typescript
import { readFileContent } from './content-processor.js';

const content = await readFileContent(fileMetadata);
console.log(`Read ${content.lineCount} lines, ${content.wordCount} words`);
```

#### `extractContents(files: FileMetadata[]): Promise<FileContent[]>`

Extracts content from multiple files in parallel.

**Parameters**:
- `files` (FileMetadata[]): List of files to read

**Returns**: `Promise<FileContent[]>` - Extracted contents (only successful reads)

**Parallel-Safe**: ✅ Yes

**Example**:
```typescript
import { extractContents } from './content-processor.js';

const contents = await extractContents(discoveredFiles);
console.log(`Extracted ${contents.length} files successfully`);
```

#### `createBatches<T>(items: T[], batchSize: number): Batch<T>[]`

Creates batches from items for parallel processing.

**Parameters**:
- `items` (T[]): Items to batch
- `batchSize` (number): Items per batch (default: 20)

**Returns**: `Batch<T>[]` - Array of batches

**Example**:
```typescript
import { createBatches } from './content-processor.js';

const batches = createBatches(contents, 20);
console.log(`Created ${batches.length} batches`);
```

#### `processBatchesInParallel<T, R>(batches: Batch<T>[], processor: Function, maxConcurrent: number): Promise<R[]>`

Processes batches in parallel with concurrency limit.

**Parameters**:
- `batches` (Batch<T>[]): Batches to process
- `processor` (Function): Function to process each batch
- `maxConcurrent` (number): Max concurrent executions (default: 3)

**Returns**: `Promise<R[]>` - Merged results from all batches

**Parallel-Safe**: ✅ Yes  
**Concurrency-Limit**: Configurable

**Example**:
```typescript
import { processBatchesInParallel } from './content-processor.js';
import { summarizeBatch } from './llm-summarizer.js';

const summaries = await processBatchesInParallel(
  batches,
  summarizeBatch,
  3  // Max 3 concurrent batches
);
```

---

### LLM Summarization

#### `summarizeBatch(batch: Batch<FileContent>): Promise<FileSummary[]>`

Summarizes a batch of files using LLM with automatic fallback.

**Parameters**:
- `batch` (Batch<FileContent>): Batch of files to summarize

**Returns**: `Promise<FileSummary[]>` - Generated summaries (one per file)

**Error Strategy**: Try Google Gemini first, fallback to OpenAI

**Example**:
```typescript
import { summarizeBatch } from './llm-summarizer.js';

const summaries = await summarizeBatch(batch);
console.log(`Generated ${summaries.length} summaries`);
```

**Structured Log Events**:
- `llm_request` - Before API call (includes provider, model, file count)
- `llm_response` - After API call (includes tokens, latency)
- `llm_primary_failed` - When Google Gemini fails
- `llm_fallback_failed` - When OpenAI also fails

---

### Digest Generation

#### `generateDigest(summaries: FileSummary[], processingTimeMs: number): Digest`

Generates digest structure from file summaries.

**Parameters**:
- `summaries` (FileSummary[]): All generated summaries
- `processingTimeMs` (number): Total processing time in milliseconds

**Returns**: `Digest` - Structured digest object

**Example**:
```typescript
import { generateDigest } from './digest-builder.js';

const digest = generateDigest(summaries, Date.now() - startTime);
console.log(`Generated digest with ${digest.statistics.totalFiles} files`);
```

#### `writeDigest(digest: Digest, outputPath: string): Promise<void>`

Writes digest to file as Markdown.

**Parameters**:
- `digest` (Digest): Digest object
- `outputPath` (string): Output file path

**Returns**: `Promise<void>`

**Example**:
```typescript
import { writeDigest } from './digest-builder.js';

await writeDigest(digest, './output/digest.md');
console.log('Digest written successfully');
```

---

### Quality Evaluation

#### `evaluateDigest(digest: Digest, inputFiles: FileMetadata[]): EvaluationResult`

Evaluates digest quality against acceptance criteria.

**Parameters**:
- `digest` (Digest): Generated digest
- `inputFiles` (FileMetadata[]): Original input files

**Returns**: `EvaluationResult` - Quality scores and pass/fail status

**Metrics Calculated**:
1. **sourceLinked**: % of facts with `[source: ...]` tags (threshold: ≥ 90%)
2. **coverage**: % of input files cited in digest (threshold: ≥ 80%)
3. **confidence**: Average confidence from summaries (threshold: ≥ 0.75)

**Example**:
```typescript
import { evaluateDigest } from './evaluator.js';

const evaluation = evaluateDigest(digest, inputFiles);
if (evaluation.passed) {
  console.log('✅ Quality gate passed!');
} else {
  console.error('❌ Quality gate failed:', evaluation.issues);
}
```

---

## 📊 Type Definitions

### FileMetadata

Represents metadata for a discovered text file.

```typescript
interface FileMetadata {
  path: string;          // Relative path from scan folder
  size: number;          // File size in bytes
  modifiedAt: Date;      // Last modification timestamp
  type: 'txt' | 'md' | 'log';
}
```

**Validation**:
- `path`: Non-empty string, must exist on filesystem
- `size`: Positive integer, ≤ 10MB (10,485,760 bytes)
- `modifiedAt`: Valid Date, within last N days
- `type`: One of `'txt'`, `'md'`, `'log'`

### FileContent

Represents extracted content from a text file.

```typescript
interface FileContent {
  metadata: FileMetadata;
  content: string;       // UTF-8 or latin1 text content
  lineCount: number;
  wordCount: number;
  encoding: 'utf8' | 'latin1';
  error?: string;        // If read failed
}
```

**Validation**:
- `content`: String with max 10MB length
- `encoding`: Either `'utf8'` or `'latin1'`
- `error`: Optional, set if read failed

### Batch\<T\>

Represents a batch of items for parallel processing.

```typescript
interface Batch<T> {
  id: string;            // UUID
  items: T[];
  totalSize: number;     // Combined bytes
  createdAt: Date;
}
```

**Validation**:
- `items`: Array of T, max 20 items (configurable)
- `totalSize`: Sum of all item sizes in batch

### FileSummary

Represents an LLM-generated summary for a single file.

```typescript
interface FileSummary {
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
```

**Quality Requirements**:
- `keyFacts`: Must have `[source: ...]` tags (90%+ requirement)
- `confidence`: 0-1 score (≥ 0.75 target)

### Digest

Represents the final digest output structure.

```typescript
interface Digest {
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
```

### EvaluationResult

Represents quality evaluation results.

```typescript
interface EvaluationResult {
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
```

---

## ⚙️ Configuration

### CONFIG Constants

```typescript
const CONFIG = {
  // File processing limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  BATCH_SIZE: 20,                   // Files per batch
  MAX_CONCURRENT_BATCHES: 3,        // Parallel batch processing
  
  // Date filtering
  DEFAULT_DAYS_BACK: 6,
  
  // File types
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.log'],
  
  // LLM configuration
  LLM: {
    primary: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      maxRetries: 2,
      timeout: 30000, // 30s
    },
    fallback: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxRetries: 1,
      timeout: 20000, // 20s
    },
  },
  
  // Quality thresholds
  QUALITY_THRESHOLDS: {
    sourceLinked: 0.90,    // 90% facts must have sources
    coverage: 0.80,        // 80% files must be cited
    confidence: 0.75,      // 75% avg confidence
  },
  
  // Output
  DEFAULT_OUTPUT_PATH: './output/digest.md',
};
```

---

## 🚨 Error Handling

### Error Types

#### FileSystemError
**When**: Folder doesn't exist or is inaccessible

**Example**:
```
Error: Folder './nonexistent' does not exist
```

**Recovery**: Check folder path, verify permissions

#### EncodingError
**When**: Both UTF-8 and latin1 encoding fail

**Example**:
```
Error: Failed to read file 'corrupt.log': Invalid encoding
```

**Recovery**: File is skipped, processing continues

#### APIKeyError
**When**: No API keys configured

**Example**:
```
Error: Missing API keys. Set GOOGLE_API_KEY or OPENAI_API_KEY environment variable.
Example: export GOOGLE_API_KEY=your_key_here
```

**Recovery**: Set at least one API key

#### LLMError
**When**: Both LLM providers fail

**Example**:
```
Error: LLM summarization failed: Rate limit exceeded
```

**Recovery**: Wait and retry, or check API quota

---

## 📚 Examples

### Complete Workflow

```typescript
import { discoverFiles } from './file-discovery.js';
import { extractContents, createBatches, processBatchesInParallel } from './content-processor.js';
import { summarizeBatch } from './llm-summarizer.js';
import { generateDigest, writeDigest } from './digest-builder.js';
import { evaluateDigest } from './evaluator.js';

async function generateTextDigest() {
  // Stage 1: Discover files
  const files = await discoverFiles('./logs', 6);
  console.log(`Found ${files.length} files`);
  
  // Stage 2: Extract content
  const contents = await extractContents(files);
  console.log(`Extracted ${contents.length} files`);
  
  // Stage 3: Create batches
  const batches = createBatches(contents, 20);
  console.log(`Created ${batches.length} batches`);
  
  // Stage 4: Summarize with LLM
  const summaries = await processBatchesInParallel(batches, summarizeBatch, 3);
  console.log(`Generated ${summaries.length} summaries`);
  
  // Stage 5: Generate digest
  const digest = generateDigest(summaries, Date.now() - startTime);
  
  // Stage 6: Write output
  await writeDigest(digest, './output/digest.md');
  
  // Stage 7: Evaluate quality
  const evaluation = evaluateDigest(digest, files);
  console.log(`Quality: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
}
```

---

**Last Updated**: 2025-11-29  
**Version**: 1.0.0
