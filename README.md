# TextDigest

**Intelligent Text File Digest Generator** - Automatically summarizes recent text files with LLM-powered insights, preserving full source traceability.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)

---

## 🎯 Features

- **🔍 Smart Discovery**: Automatically finds `.txt`, `.md`, `.log` files modified in the last N days
- **📊 Batch Processing**: Processes hundreds of files efficiently with parallel LLM calls
- **🔗 Source Traceability**: Every fact and insight links back to source file and line number
- **🤖 Dual LLM Support**: Primary Google Gemini + fallback OpenAI for reliability
- **📈 Quality Metrics**: Built-in evaluation against acceptance thresholds
- **🐳 Docker Ready**: One-command deployment with Docker Compose
- **⚡ High Performance**: Process 300 files in under 3 minutes

---

## 📦 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize

# 2. Set API keys
export GOOGLE_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here  # Optional fallback

# 3. Run with Docker Compose
docker-compose up

# Output: ./output/digest.md
```

### Option 2: Local Installation

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Set API keys
export GOOGLE_API_KEY=your_key_here

# 4. Run CLI
npm start -- --folder ./data --days 6 --output ./output/digest.md
```

---

## 🚀 Usage

### CLI Options

```bash
textdigest [options]

Options:
  -f, --folder <path>   Folder to scan for text files (required)
  -d, --days <number>   Number of days to look back (default: 6)
  -o, --output <path>   Output path for digest.md (default: ./output/digest.md)
  -h, --help           Display help information
  -V, --version        Display version number
```

### Examples

```bash
# Scan ./logs folder for files modified in last 6 days
textdigest --folder ./logs

# Scan with custom date range and output
textdigest --folder ./documents --days 14 --output ./reports/summary.md

# Using Docker
docker run -v ./data:/data -v ./output:/output \
  -e GOOGLE_API_KEY=your_key \
  textdigest:latest --folder /data --days 6 --output /output/digest.md
```

---

## 📋 Output Format

The generated `digest.md` includes:

### 1. Executive Summary
- Top 5-10 insights across all files
- Cross-file patterns and trends

### 2. Statistics
- Total files processed
- Total size (MB)
- Date range
- File type distribution

### 3. Per-File Summaries
Grouped by file type (`.txt`, `.md`, `.log`):
- 2-3 sentence summary
- Key facts (with `[source: file:line]` tags)
- Insights (with `[source: file]` tags)
- Extracted statistics

### 4. Source Index
- Clickable links to all processed files

**Example Output:**

```markdown
# Text File Digest
**Generated**: 2025-11-29T10:00:00.000Z
**Processing Time**: 45s
**Model**: gemini-2.0-flash-exp

## 🎯 Executive Summary
1. Database connection pool increased from 10 to 20, reducing timeout rate by 87% [source: debug.txt]
2. Payment gateway fallback implemented after 503 errors [source: app.log:8]
3. API response time improved from 250ms to 180ms [source: notes.md]

## 📊 Statistics
- **Total Files**: 3
- **Total Size**: 2.1 KB
- **Date Range**: 2025-11-29 to 2025-11-29
- **File Types**: txt: 1, md: 1, log: 1

## 📝 File Summaries

### Log Files (.log)
#### [tests/fixtures/sample-logs/app.log](tests/fixtures/sample-logs/app.log)
**Modified**: 2025-11-29 | **Size**: 756 Bytes

Application startup and operational logs showing authentication, API requests, and error recovery.

**Key Facts**:
- Database connection timeout occurred after 30s [source: app.log:4]
- Payment gateway returned 503 error, fallback processor used [source: app.log:8-9]
- Daily backup completed: 2.3 GB [source: app.log:10]
```

---

## 🧪 Quality Metrics

TextDigest includes built-in quality evaluation:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Source Linking** | ≥ 90% | % of facts with `[source: ...]` tags |
| **File Coverage** | ≥ 80% | % of input files cited in digest |
| **Confidence** | ≥ 0.75 | Average LLM confidence score |

Example output:

```
📈 Quality Metrics:
   - Source Linking: 95.2% (threshold: 90.0%)
   - File Coverage: 100.0% (threshold: 80.0%)
   - Confidence: 87.3% (threshold: 75.0%)

✅ Quality Gate: PASSED
```

---

## 🏗️ Architecture

TextDigest follows a **minimalist design** with strict constraints:

- **Max 8 TypeScript files** (excluding tests)
- **Max 800 lines** of core logic
- **Max 5 dependencies**
- **Zero database** (in-memory processing only)

### Data Flow

```
[Folder] → [File Discovery] → [Content Extraction] → 
[Batch Creation] → [LLM Summarization] → [Digest Generation] → 
[Quality Evaluation] → [digest.md]
```

### Core Modules

| Module | Purpose | Lines |
|--------|---------|-------|
| `types.ts` | Type definitions | ~80 |
| `config.ts` | Configuration & logging | ~50 |
| `file-discovery.ts` | File scanning | ~120 |
| `content-processor.ts` | Batch processing | ~180 |
| `llm-summarizer.ts` | LLM integration | ~200 |
| `digest-builder.ts` | Markdown generation | ~100 |
| `evaluator.ts` | Quality metrics | ~150 |
| `cli.ts` | CLI interface | ~150 |

---

## 🤖 LLM Models

### Primary: Google Gemini 2.0 Flash Exp
- **Model**: `gemini-2.0-flash-exp`
- **Context**: 1M tokens
- **Speed**: Fast (2-3s per batch)
- **Cost**: Low

### Fallback: OpenAI GPT-4o Mini
- **Model**: `gpt-4o-mini`
- **Reliability**: High
- **Fallback**: Automatic on primary failure

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes* | Google Gemini API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (fallback) |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` |

*At least one API key is required.

### System Limits

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_FILE_SIZE` | 10 MB | Files larger than this are skipped |
| `BATCH_SIZE` | 20 | Files per LLM batch |
| `MAX_CONCURRENT_BATCHES` | 3 | Parallel batch processing limit |
| `DEFAULT_DAYS_BACK` | 6 | Default time window |

---

## 🧪 Testing

```bash
# Run E2E tests
npm test

# Test with sample data
npm start -- --folder ./tests/fixtures/sample-logs --output ./test-output.md
```

---

## 📊 Performance

Tested on 300 small files (avg 2KB each):
- **Processing Time**: 2-3 minutes
- **Memory Usage**: < 512 MB
- **API Calls**: 15 batches (20 files each)
- **Quality Metrics**: 95%+ source linking

---

## 🛠️ Development

### Project Structure

```
textdigest/
├── src/
│   ├── types.ts              # Type definitions
│   ├── config.ts             # Configuration
│   ├── file-discovery.ts     # File scanning
│   ├── content-processor.ts  # Batch processing
│   ├── llm-summarizer.ts     # LLM integration
│   ├── digest-builder.ts     # Markdown generation
│   ├── evaluator.ts          # Quality metrics
│   └── cli.ts                # CLI interface
├── tests/
│   ├── fixtures/             # Test data
│   └── e2e.test.ts           # E2E tests
├── output/                   # Generated digests
├── data/                     # Input files
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### Semantic Markup

All functions include semantic markup for LLM maintainability:

```typescript
/**
 * @semantic-role file-discovery
 * @purpose Scan folder recursively for text files
 * @input folder: string, days: number
 * @output FileMetadata[]
 * @algorithm
 * 1. Walk directory tree
 * 2. Filter by extension and date
 * 3. Sort by modification time
 */
```

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Architecture inspired by [QA evaluation paper](https://arxiv.org/pdf/2506.18315)
- LLM-driven development patterns
- Log-driven quality assurance

---

## 🔗 Links

- **Repository**: https://github.com/abezr/pdf-summarize
- **Issues**: https://github.com/abezr/pdf-summarize/issues
- **Google Gemini**: https://ai.google.dev/models/gemini
- **OpenAI Models**: https://platform.openai.com/docs/models

---

**Built with ❤️ for efficient text file analysis**
