# Docker Deployment Guide for TextDigest

## Quick Start

### 1. Basic Usage (Default)

```bash
# Set API key
export GOOGLE_API_KEY=your_key_here

# Run with docker-compose
docker-compose up

# Output will be in ./output/digest.md
```

### 2. With v2.1 Features

```bash
# Set API keys
export GOOGLE_API_KEY=your_key_here
export OPENAI_API_KEY=your_fallback_key  # Optional

# Run with v2.1 features (conclusions, law filtering)
docker-compose -f docker-compose.v2.1.yml up

# Or build and run manually
docker build -t textdigest:2.1.0 .
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --days 6 --output /output/digest.md --include-conclusions
```

---

## Docker Compose Configurations

### Default Configuration (`docker-compose.yml`)

Basic configuration for standard use:
- Scans `./data` folder
- Processes files from last 6 days
- Outputs to `./output/digest.md`
- Default law filtering (excludes legal documents)

```bash
docker-compose up
```

### v2.1 Configuration (`docker-compose.v2.1.yml`)

Advanced configuration with three profiles:

#### 1. Default (with conclusions)
```bash
docker-compose -f docker-compose.v2.1.yml up
```

Features:
- Includes LLM conclusions and recommendations
- Law content filtering enabled
- Processes `./data` folder

#### 2. Large Batch Processing
```bash
docker-compose -f docker-compose.v2.1.yml --profile large-batch up textdigest-large
```

Features:
- Knowledge Graph mode for 800+ files
- 30-day lookback period
- Adaptive processing
- Processes `./large-data` folder

#### 3. Legal Documents Analysis
```bash
docker-compose -f docker-compose.v2.1.yml --profile legal up textdigest-legal
```

Features:
- Law filtering DISABLED (includes legal content)
- Conclusions enabled
- Processes `./legal-docs` folder

---

## Manual Docker Commands

### Build Image

```bash
# Build with tag
docker build -t textdigest:2.1.0 .

# Build with custom name
docker build -t my-textdigest:latest .
```

### Run Container

#### Basic Run
```bash
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --days 6 --output /output/digest.md
```

#### With v2.1 Features
```bash
# Include conclusions
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --include-conclusions --output /output/digest.md

# No law filtering
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --no-exclude-law --output /output/digest.md

# Custom legal terms
docker run -v ./data:/data:ro -v ./output:/output \
  -v ./my-legal-terms.json:/config/legal-terms.json:ro \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --legal-terms /config/legal-terms.json --output /output/digest.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes* | - | Google Gemini API key |
| `OPENAI_API_KEY` | No | - | OpenAI API key (fallback) |
| `GOOGLE_MODEL` | No | `gemini-2.0-flash-exp` | Gemini model name |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |

*At least one of GOOGLE_API_KEY or OPENAI_API_KEY is required.

### Setting Environment Variables

#### Linux/macOS
```bash
export GOOGLE_API_KEY=your_key_here
export OPENAI_API_KEY=your_fallback_key
```

#### Windows (PowerShell)
```powershell
$env:GOOGLE_API_KEY="your_key_here"
$env:OPENAI_API_KEY="your_fallback_key"
```

#### Windows (CMD)
```cmd
set GOOGLE_API_KEY=your_key_here
set OPENAI_API_KEY=your_fallback_key
```

#### .env File
Create a `.env` file in the project root:
```env
GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_fallback_key
GOOGLE_MODEL=gemini-2.0-flash-exp
OPENAI_MODEL=gpt-4o-mini
LOG_LEVEL=info
```

Then docker-compose will automatically load it.

---

## Volume Mounts

### Data Folder (Input)
```bash
-v ./data:/data:ro
```
- Mount local `./data` folder to container `/data`
- `:ro` = read-only (recommended for input)

### Output Folder
```bash
-v ./output:/output
```
- Mount local `./output` folder to container `/output`
- Read-write access for digest.md output

### Custom Legal Terms (Optional)
```bash
-v ./my-legal-terms.json:/config/legal-terms.json:ro
```
- Mount custom legal terms configuration
- Use with `--legal-terms /config/legal-terms.json` flag

---

## Troubleshooting

### Issue: "Authentication failed" or "API key not found"

**Solution**: Ensure API key is set correctly
```bash
# Check if variable is set
echo $GOOGLE_API_KEY

# Re-export if empty
export GOOGLE_API_KEY=your_key_here
```

### Issue: "No files found to process"

**Solution**: Check data folder path and contents
```bash
# Verify data folder has files
ls -la ./data

# Check file modification dates
find ./data -name "*.txt" -o -name "*.md" -o -name "*.log" -mtime -6
```

### Issue: Docker build fails

**Solution**: Ensure package-lock.json exists
```bash
# Regenerate package-lock.json if needed
npm install

# Clean build
docker-compose build --no-cache
```

### Issue: "Permission denied" for output folder

**Solution**: Ensure output folder has correct permissions
```bash
# Create output folder with correct permissions
mkdir -p ./output
chmod 755 ./output
```

---

## Performance Optimization

### For Large Batches (800+ files)

1. **Increase Docker resources**:
   - Memory: 2 GB+
   - CPU: 4+ cores

2. **Use v2.1 configuration**:
   - Automatic Knowledge Graph mode
   - Efficient clustering

3. **Adjust command**:
```bash
docker run -m 2g --cpus 4 \
  -v ./large-data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:2.1.0 \
  --folder /data --days 30 --include-conclusions --output /output/digest.md
```

---

## Image Details

### Multi-stage Build

The Dockerfile uses multi-stage build for optimization:

1. **Builder Stage**: Compiles TypeScript
2. **Production Stage**: Only production dependencies + compiled code

### Image Size
- **Builder stage**: ~400 MB (includes dev dependencies)
- **Production stage**: ~180 MB (optimized)

### Layers
- Base: node:20-alpine (~40 MB)
- Dependencies: ~100 MB
- Application: ~40 MB

---

## Advanced Usage

### Custom Dockerfile

Create `Dockerfile.custom`:
```dockerfile
FROM textdigest:2.1.0
# Add custom legal terms
COPY my-legal-terms.json /app/config/legal-terms.json
```

Build and run:
```bash
docker build -f Dockerfile.custom -t textdigest:custom .
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  textdigest:custom \
  --folder /data --legal-terms /app/config/legal-terms.json
```

### Scheduled Execution (Cron)

Create a cron job to run daily:
```bash
# Edit crontab
crontab -e

# Add daily execution at 8 AM
0 8 * * * cd /path/to/textdigest && docker-compose up >> /var/log/textdigest.log 2>&1
```

---

## Docker Hub / GitHub Container Registry

### Push Image

```bash
# Tag for Docker Hub
docker tag textdigest:2.1.0 yourusername/textdigest:2.1.0
docker push yourusername/textdigest:2.1.0

# Tag for GitHub Container Registry
docker tag textdigest:2.1.0 ghcr.io/yourusername/textdigest:2.1.0
docker push ghcr.io/yourusername/textdigest:2.1.0
```

### Pull and Run

```bash
# From Docker Hub
docker pull yourusername/textdigest:2.1.0
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  yourusername/textdigest:2.1.0

# From GitHub Container Registry
docker pull ghcr.io/yourusername/textdigest:2.1.0
docker run -v ./data:/data:ro -v ./output:/output \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  ghcr.io/yourusername/textdigest:2.1.0
```

---

## Security Best Practices

1. **Never hardcode API keys** in Dockerfile or docker-compose.yml
2. **Use environment variables** or secrets management
3. **Mount data as read-only** (`:ro`) when possible
4. **Run as non-root user** (already configured in image)
5. **Keep image updated** with latest security patches

---

## Quick Reference

```bash
# Build
docker build -t textdigest:2.1.0 .

# Run basic
docker-compose up

# Run with v2.1 features
docker-compose -f docker-compose.v2.1.yml up

# Run large batch
docker-compose -f docker-compose.v2.1.yml --profile large-batch up

# Run legal analysis
docker-compose -f docker-compose.v2.1.yml --profile legal up

# Clean up
docker-compose down
docker system prune -a
```

---

For more information, see:
- [README.md](README.md) - Main documentation
- [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) - Detailed deployment guide
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Quick start guide
