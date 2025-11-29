# TextDigest v2.1

**Intelligent Text File Digest Generator with Knowledge Graph** - Automatically summarizes recent text files with LLM-powered insights, advanced fact analysis, law filtering, and full source traceability.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org())
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/Version-2.1.0-brightgreen)](https://github.com/abezr/files-summary/releases)

---

## 📖 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage](#-usage)
- [Output Format](#-output-format)
- [Quality Metrics](#-quality-metrics)
- [Architecture](#️-architecture)
- [LLM Models](#-llm-models)
- [Configuration](#️-configuration)
- [Testing](#-testing)
- [Performance](#-performance)
- [Development](#️-development)
- [Documentation](#-documentation)
- [License](#-license)
- [Links](#-links)

---

## 🎯 Features

### Core Features (v1.0)
- **🔍 Smart Discovery**: Automatically finds `.txt`, `.md`, `.log` files modified in the last N days
- **📊 Batch Processing**: Processes hundreds of files efficiently with parallel LLM calls
- **🔗 Source Traceability**: Every fact and insight links back to source file and line number
- **🤖 Dual LLM Support**: Primary Google Gemini + fallback OpenAI for reliability
- **📈 Quality Metrics**: Built-in evaluation against acceptance thresholds
- **🐳 Docker Ready**: One-command deployment with Docker Compose

### ⭐ New in v2.1
- **⚖️ Law Content Filtering**: Automatically detect and exclude legal documents (90% precision, 85% recall)
- **🔍 Advanced Fact Analysis**: Most common, unusual, and long facts with TF-IDF scoring
- **💡 LLM Conclusions**: Strategic conclusions and actionable recommendations
- **🧠 Knowledge Graph Mode**: Adaptive graph processing for large batches (>50 files, scales to 800+)
- **🚀 Enhanced Performance**: Process 800 files in under 5 minutes (150K tokens)

---

## 📦 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/abezr/files-summary.git
cd files-summary

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
  -f, --folder <path>      Folder to scan for text files (required)
  -d, --days <number>      Number of days to look back (default: 6)
  -o, --output <path>      Output path for digest.md (default: ./output/digest.md)
  --no-exclude-law        Include law content files (default: exclude)
  --include-conclusions   Generate LLM conclusions and recommendations
  --legal-terms <path>    Path to custom legal terms JSON file
  -h, --help             Display help information
  -V, --version          Display version number
```

### Examples

```bash
# Basic usage: Scan ./logs folder
textdigest --folder ./logs

# With custom date range and output
textdigest --folder ./documents --days 14 --output ./reports/summary.md

# v2.1: Include strategic conclusions
textdigest --folder ./logs --include-conclusions

# v2.1: Include law content (disable filtering)
textdigest --folder ./legal_docs --no-exclude-law

# v2.1: Custom legal terms configuration
textdigest --folder ./docs --legal-terms ./my-legal-terms.json

# Using Docker
docker run -v ./data:/data -v ./output:/output \
  -e GOOGLE_API_KEY=your_key \
  textdigest:latest --folder /data --days 6 --output /output/digest.md

# Docker with v2.1 features
docker run -v ./data:/data -v ./output:/output \
  -e GOOGLE_API_KEY=your_key \
  textdigest:latest --folder /data --include-conclusions --no-exclude-law
```

---

## 📋 Output Format

The generated `digest.md` includes:

### 1. Executive Summary
- Top 5-10 insights across all files
- Cross-file patterns and trends

### 2. ⭐ LLM Conclusions & Recommendations (v2.1 - optional)
- High-level strategic conclusions
- Actionable recommendations with evidence
- Complete source citations

### 3. ⭐ Advanced Fact Analysis (v2.1)
- **Most Common Facts**: Frequently mentioned across files
- **Most Unusual Facts**: Rare but significant findings (TF-IDF scoring)
- **Long Facts**: Detailed findings (>50 words)
- Fact statistics and source traceability

### 4. File Statistics
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

TextDigest v2.1 features an extensible architecture with adaptive processing:

### v2.1 Architecture
- **14 TypeScript modules** (8 core + 6 v2.1 enhancements)
- **~2,200 lines** of production code
- **9 dependencies** (5 core + 4 for advanced features)
- **Zero database** (in-memory processing)
- **Adaptive Processing**: Auto-switches to Knowledge Graph mode for large batches

### Data Flow

```
[Folder] → [File Discovery] → [Content Extraction] → [Law Filtering] →
[Adaptive: Standard/Knowledge Graph] → [Batch Processing] → 
[LLM Summarization] → [Fact Analysis] → [Conclusions] →
[Digest Generation] → [Quality Evaluation] → [digest.md]
```

### Core Modules (v1.0)

| Module | Purpose | Lines |
|--------|---------|-------|
| `types.ts` | Type definitions | ~144 |
| `config.ts` | Configuration & logging | ~107 |
| `file-discovery.ts` | File scanning | ~130 |
| `content-processor.ts` | Batch processing | ~190 |
| `llm-summarizer.ts` | LLM integration | ~252 |
| `digest-builder.ts` | Markdown generation | ~220 |
| `evaluator.ts` | Quality metrics | ~161 |
| `cli.ts` | CLI interface | ~154 |

### v2.1 Enhancement Modules

| Module | Purpose | Lines |
|--------|---------|-------|
| `content-filter.ts` | Law content filtering | ~241 |
| `fact-analyzer.ts` | Advanced fact analysis | ~195 |
| `graph-builder.ts` | Knowledge graph | ~198 |
| `semantic-clustering.ts` | Entity clustering | ~187 |
| `context-retriever.ts` | Context retrieval | ~144 |

### Architecture Diagrams

Detailed architecture documentation with Mermaid diagrams:

- 📐 [**Context Diagram**](docs/diagrams/01-context-diagram.md) - System overview and external dependencies
- 🏗️ [**Container Diagram**](docs/diagrams/02-container-diagram.md) - High-level architecture and modules
- 🔧 [**Component Diagram**](docs/diagrams/03-component-diagram.md) - Internal component structure
- 🔄 [**Sequence Diagram**](docs/diagrams/04-sequence-diagram.md) - Processing flow and interactions
- 🚀 [**Deployment Diagram**](docs/diagrams/05-deployment-diagram.md) - Deployment options and configurations

### Additional Documentation

- 📚 [**Architecture Guide**](docs/architecture/ARCHITECTURE.md) - Comprehensive architecture documentation
- 📖 [**API Reference**](docs/api/API_REFERENCE.md) - Complete API documentation
- 🚀 [**Deployment Guide**](docs/guides/DEPLOYMENT.md) - Production deployment instructions

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

## 📚 Documentation

### Quick Reference
- 🚀 [**Quick Start Guide**](docs/QUICKSTART.md) - Get started in 5 minutes
- 📋 [**Version History**](docs/VERSION.md) - Detailed changelog and release notes
- 📦 [**Implementation Summary**](docs/IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- 🤝 [**Handoff Guide**](docs/HANDOFF.md) - Project handoff and v2.1 roadmap

### Architecture & Design
- 📐 [**C4 Diagrams**](docs/diagrams/) - Visual architecture documentation
  - [Context Diagram](docs/diagrams/01-context-diagram.md)
  - [Container Diagram](docs/diagrams/02-container-diagram.md)
  - [Component Diagram](docs/diagrams/03-component-diagram.md)
  - [Sequence Diagram](docs/diagrams/04-sequence-diagram.md)
  - [Deployment Diagram](docs/diagrams/05-deployment-diagram.md)
- 🏗️ [**Architecture Guide**](docs/architecture/ARCHITECTURE.md) - Comprehensive architecture documentation
- 📖 [**API Reference**](docs/api/API_REFERENCE.md) - Complete API documentation

### Deployment & Operations
- 🚀 [**Deployment Guide**](docs/guides/DEPLOYMENT.md) - Production deployment instructions
- 🐳 **Docker**: Use `docker-compose up` for one-command deployment
- ☁️ **Cloud**: Supports AWS, GCP, Azure deployments

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

- **Repository**: https://github.com/abezr/files-summary
- **Issues**: https://github.com/abezr/files-summary/issues
- **Releases**: https://github.com/abezr/files-summary/releases
- **Latest Release**: [v2.1.0](https://github.com/abezr/files-summary/releases/tag/v2.1.0)
- **Documentation**: [docs/](docs/)
- **Google Gemini**: https://ai.google.dev/models/gemini
- **OpenAI Models**: https://platform.openai.com/docs/models

---

**Built with ❤️ for efficient text file analysis**

**TextDigest v2.1** - From text files to actionable insights with LLM-powered intelligence.
