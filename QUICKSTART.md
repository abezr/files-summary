# TextDigest - Quick Start Guide

Get started with TextDigest in **under 5 minutes**! 🚀

---

## Prerequisites

- **Node.js** 20+ (or Docker)
- **API Key**: Google Gemini OR OpenAI (at least one required)

---

## 🎯 Option 1: Docker (Easiest)

### Step 1: Get an API Key

**Google Gemini (Recommended)**:
1. Visit: https://ai.google.dev/
2. Click "Get API Key"
3. Copy your key

**OR OpenAI (Fallback)**:
1. Visit: https://platform.openai.com/api-keys
2. Create new key
3. Copy your key

### Step 2: Set Environment Variable

```bash
# For Google Gemini
export GOOGLE_API_KEY=your_google_api_key_here

# OR for OpenAI
export OPENAI_API_KEY=your_openai_api_key_here

# (You can set both for automatic fallback)
```

### Step 3: Prepare Your Files

```bash
# Create input folder and add your text files
mkdir -p data
cp /path/to/your/logs/*.log data/
cp /path/to/your/notes/*.md data/
```

### Step 4: Run TextDigest

```bash
docker-compose up
```

### Step 5: View Results

```bash
cat output/digest.md
```

**Done!** 🎉

---

## 🖥️ Option 2: Local Installation

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build TypeScript

```bash
npm run build
```

### Step 3: Set API Key

```bash
export GOOGLE_API_KEY=your_key_here
```

### Step 4: Run on Sample Data

```bash
node dist/cli.js \
  --folder ./tests/fixtures/sample-logs \
  --output ./output/digest.md
```

### Step 5: View Results

```bash
cat output/digest.md
```

---

## 📖 Usage Examples

### Basic Usage

```bash
# Scan folder for files from last 6 days
textdigest --folder ./logs

# Custom time window (14 days)
textdigest --folder ./documents --days 14

# Custom output location
textdigest --folder ./logs --output ./reports/weekly-digest.md
```

### Advanced Usage

```bash
# Combine all options
textdigest \
  --folder /path/to/project/logs \
  --days 30 \
  --output /path/to/reports/monthly-digest.md
```

### Docker Usage

```bash
# Custom folder mapping
docker run -it --rm \
  -v /path/to/your/files:/data:ro \
  -v /path/to/output:/output \
  -e GOOGLE_API_KEY=your_key \
  textdigest:latest \
  --folder /data --output /output/digest.md
```

---

## 🧪 Testing with Sample Data

We've included 3 sample files for testing:

```bash
# 1. Run on sample data
node dist/cli.js \
  --folder ./tests/fixtures/sample-logs \
  --output ./test-digest.md

# 2. View the generated digest
cat test-digest.md

# 3. Check the quality metrics in output
grep "Quality Metrics" test-digest.md
```

**Sample files include**:
- `app.log` - Application logs with errors
- `notes.md` - Sprint notes with metrics
- `debug.txt` - Debug session documentation

---

## 📊 Understanding the Output

The generated `digest.md` contains:

### 1. Executive Summary
Top insights across all files:
```markdown
1. Database connection pool increased from 10 to 20 [source: debug.txt]
2. Payment gateway fallback implemented [source: app.log:8]
```

### 2. Statistics
```markdown
- Total Files: 3
- Total Size: 2.1 KB
- Date Range: 2025-11-23 to 2025-11-29
```

### 3. Per-File Summaries
Detailed summaries with:
- Key facts (with line numbers)
- Insights
- Extracted statistics

### 4. Source Index
Clickable links to all processed files

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required (at least one)
export GOOGLE_API_KEY=your_google_key
export OPENAI_API_KEY=your_openai_key

# Optional
export LOG_LEVEL=info  # debug, info, warn, error
```

### CLI Options

```bash
textdigest --help

Options:
  -f, --folder <path>   Folder to scan for text files (required)
  -d, --days <number>   Number of days to look back (default: 6)
  -o, --output <path>   Output path for digest.md (default: ./output/digest.md)
  -h, --help           Display help information
  -V, --version        Display version number
```

---

## 🔍 Supported File Types

TextDigest processes:
- ✅ `.txt` - Plain text files
- ✅ `.md` - Markdown documents
- ✅ `.log` - Log files

**Files larger than 10MB** are automatically skipped with a warning.

---

## 📈 Quality Metrics Explained

After each run, you'll see quality metrics:

```
📈 Quality Metrics:
   - Source Linking: 95.2% (threshold: 90.0%)
   - File Coverage: 100.0% (threshold: 80.0%)
   - Confidence: 87.3% (threshold: 75.0%)

✅ Quality Gate: PASSED
```

**What they mean**:
- **Source Linking**: % of facts with `[source: file:line]` tags
- **File Coverage**: % of input files referenced in digest
- **Confidence**: Average confidence score from LLM

**Quality Gate**: System automatically validates output quality!

---

## 🐛 Troubleshooting

### "Missing API keys" Error
```bash
Error: Missing API keys. Set GOOGLE_API_KEY or OPENAI_API_KEY
```

**Fix**: Set at least one API key:
```bash
export GOOGLE_API_KEY=your_key_here
```

### "No files found" Warning
```bash
⚠️  No files found to process
```

**Possible causes**:
1. Wrong folder path
2. No files modified in last N days
3. No .txt/.md/.log files in folder

**Fix**: Check folder path or increase `--days`:
```bash
textdigest --folder ./logs --days 30
```

### Docker Permission Issues
```bash
Error: Cannot write to /output
```

**Fix**: Ensure output folder is writable:
```bash
chmod 777 output/
```

---

## 💡 Tips & Best Practices

### 1. API Key Selection
- **Use Google Gemini** for cost-effectiveness and speed
- **Use OpenAI** as fallback for reliability
- **Set both** for automatic fallback on failures

### 2. Time Window
- **6 days** (default): Good for weekly digests
- **14 days**: Good for bi-weekly reviews
- **30 days**: Good for monthly summaries

### 3. File Organization
- Keep related files in same folder
- Use descriptive filenames
- Maintain consistent file types (.log for logs, .md for notes)

### 4. Output Management
- Create separate digests for different projects
- Use date in output filename: `digest-2025-11-29.md`
- Archive old digests for historical reference

---

## 📚 Next Steps

### Explore the Documentation
- **README.md**: Comprehensive feature guide
- **VERSION.md**: Implementation details
- **IMPLEMENTATION_SUMMARY.md**: Technical overview

### Customize Configuration
- Edit `docker-compose.yml` for Docker settings
- Create `.env` file from `.env.example`
- Adjust batch size in `src/config.ts` (advanced)

### Integrate with Your Workflow
```bash
# Add to cron for daily digests
0 9 * * * cd /path/to/textdigest && ./run-daily-digest.sh

# Use in CI/CD pipeline
npm run build
node dist/cli.js --folder ./build-logs --output ./artifacts/digest.md
```

---

## 🎯 Common Use Cases

### 1. Daily Log Analysis
```bash
# Analyze yesterday's logs
textdigest --folder ./logs --days 1 --output ./daily-digest.md
```

### 2. Sprint Summary
```bash
# Summarize last 2 weeks
textdigest --folder ./project-notes --days 14 --output ./sprint-summary.md
```

### 3. Incident Review
```bash
# Review logs from last 24 hours
textdigest --folder ./incident-logs --days 1 --output ./incident-report.md
```

### 4. Documentation Digest
```bash
# Summarize recent documentation changes
textdigest --folder ./docs --days 7 --output ./doc-changes.md
```

---

## 🆘 Need Help?

- **Documentation**: See README.md
- **Issues**: https://github.com/abezr/pdf-summarize/issues
- **Examples**: Check tests/fixtures/sample-logs/

---

## ✅ Quick Verification

Run this to verify your installation:

```bash
# 1. Check CLI works
node dist/cli.js --help

# 2. Test with sample data
node dist/cli.js --folder ./tests/fixtures/sample-logs --output ./test.md

# 3. Verify output
ls -lh test.md
cat test.md | head -20
```

**Expected**: You should see a formatted digest with executive summary and statistics.

---

**You're ready to generate text file digests!** 🚀

For detailed documentation, see [README.md](README.md)
