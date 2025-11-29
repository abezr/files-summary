# TextDigest - Deployment Guide

**Version**: 1.0.0  
**Date**: 2025-11-29

---

## 📦 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring](#monitoring)

---

## ✅ Prerequisites

### Required Software
- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher (comes with Node.js)
- **Docker**: Version 20.x or higher (for Docker deployment)
- **Docker Compose**: Version 2.x or higher

### Required API Keys
You need **at least one** of the following:
- **Google Gemini API Key**: Get from https://ai.google.dev/
- **OpenAI API Key**: Get from https://platform.openai.com/api-keys

### System Requirements
| Deployment Type | CPU | RAM | Disk |
|----------------|-----|-----|------|
| Local Development | 2 cores | 2GB | 500MB |
| Docker Container | 2 cores | 512MB | 200MB |
| Production | 4 cores | 4GB | 1GB |

---

## 🖥️ Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/abezr/files-summary.git
cd files-summary
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 356 packages in 15s
```

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your API keys
nano .env  # or use your preferred editor
```

Add your keys:
```env
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional fallback
LOG_LEVEL=info
```

### Step 4: Build TypeScript

```bash
npm run build
```

**Expected output:**
```
> textdigest@1.0.0 build
> tsc
```

### Step 5: Test Installation

```bash
# Test CLI help
node dist/cli.js --help

# Test with sample data
node dist/cli.js \
  --folder ./tests/fixtures/sample-logs \
  --output ./output/test-digest.md
```

### Step 6: Run on Your Data

```bash
# Set API key (if not in .env)
export GOOGLE_API_KEY=your_key_here

# Run digest generation
node dist/cli.js \
  --folder /path/to/your/files \
  --days 6 \
  --output ./output/digest.md
```

---

## 🐳 Docker Deployment

### Step 1: Build Docker Image

```bash
docker-compose build
```

**Expected output:**
```
Building textdigest
[+] Building 45.2s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 => [internal] load .dockerignore
 => [1/6] FROM docker.io/library/node:20-alpine
 ...
 => => naming to docker.io/library/textdigest:latest
```

### Step 2: Configure Environment

```bash
# Set API keys in environment
export GOOGLE_API_KEY=your_google_api_key_here
export OPENAI_API_KEY=your_openai_api_key_here  # Optional
```

### Step 3: Prepare Data Volumes

```bash
# Create folders for input/output
mkdir -p data output

# Copy your files to data folder
cp /path/to/your/files/* data/
```

### Step 4: Run Container

```bash
docker-compose up
```

**Expected output:**
```
Creating textdigest-cli ... done
Attaching to textdigest-cli
textdigest-cli | {"level":"info","service":"textdigest-cli","event":"textdigest_started","timestamp":"2025-11-29T..."}
...
textdigest-cli | ✅ Digest generated successfully!
textdigest-cli exited with code 0
```

### Step 5: View Output

```bash
cat output/digest.md
```

---

## 🚀 Production Deployment

### Option 1: Standalone Server

#### Setup Script
```bash
#!/bin/bash
# deploy-textdigest.sh

# 1. Clone and build
git clone https://github.com/abezr/files-summary.git /opt/textdigest
cd /opt/textdigest
npm ci --omit=dev
npm run build

# 2. Configure
cat > /opt/textdigest/.env << EOF
GOOGLE_API_KEY=${GOOGLE_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
LOG_LEVEL=info
EOF

# 3. Create systemd service
cat > /etc/systemd/system/textdigest.service << EOF
[Unit]
Description=TextDigest Scheduled Run
After=network.target

[Service]
Type=oneshot
User=textdigest
Group=textdigest
WorkingDirectory=/opt/textdigest
Environment="NODE_ENV=production"
EnvironmentFile=/opt/textdigest/.env
ExecStart=/usr/bin/node dist/cli.js --folder /data/logs --output /data/output/digest.md

[Install]
WantedBy=multi-user.target
EOF

# 4. Create timer (run daily at 9 AM)
cat > /etc/systemd/system/textdigest.timer << EOF
[Unit]
Description=Run TextDigest daily

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 5. Enable and start
systemctl daemon-reload
systemctl enable textdigest.timer
systemctl start textdigest.timer
```

#### Run Deployment
```bash
chmod +x deploy-textdigest.sh
sudo ./deploy-textdigest.sh
```

### Option 2: Docker Swarm

#### Stack File
```yaml
# docker-stack.yml
version: '3.8'

services:
  textdigest:
    image: textdigest:latest
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 512M
        reservations:
          cpus: '1'
          memory: 256M
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=info
    volumes:
      - /data/logs:/data:ro
      - /data/output:/output
    command: ["--folder", "/data", "--days", "6", "--output", "/output/digest.md"]
```

#### Deploy to Swarm
```bash
# Initialize swarm (if not already)
docker swarm init

# Deploy stack
docker stack deploy -c docker-stack.yml textdigest

# Check status
docker stack ps textdigest
```

### Option 3: Kubernetes

#### Kubernetes Manifests
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: textdigest-config
data:
  LOG_LEVEL: "info"
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: textdigest-secrets
type: Opaque
stringData:
  GOOGLE_API_KEY: "your_google_api_key_here"
  OPENAI_API_KEY: "your_openai_api_key_here"
---
# k8s/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: textdigest
spec:
  schedule: "0 9 * * *"  # Daily at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: textdigest
            image: textdigest:latest
            args:
              - "--folder"
              - "/data"
              - "--days"
              - "6"
              - "--output"
              - "/output/digest.md"
            env:
            - name: GOOGLE_API_KEY
              valueFrom:
                secretKeyRef:
                  name: textdigest-secrets
                  key: GOOGLE_API_KEY
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: textdigest-secrets
                  key: OPENAI_API_KEY
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: textdigest-config
                  key: LOG_LEVEL
            volumeMounts:
            - name: data
              mountPath: /data
              readOnly: true
            - name: output
              mountPath: /output
            resources:
              requests:
                memory: "256Mi"
                cpu: "500m"
              limits:
                memory: "512Mi"
                cpu: "2000m"
          volumes:
          - name: data
            hostPath:
              path: /data/logs
          - name: output
            hostPath:
              path: /data/output
          restartPolicy: OnFailure
```

#### Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/cronjob.yaml

# Check status
kubectl get cronjobs
kubectl get jobs
```

---

## ⚙️ Environment Configuration

### Complete Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes* | - | Google Gemini API key |
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key (fallback) |
| `LOG_LEVEL` | No | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | No | `development` | Environment: `development`, `production` |

*At least one API key required

### Security Best Practices

#### 1. Store Secrets Securely
```bash
# Use environment files with restricted permissions
chmod 600 .env

# Or use secret management tools
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
# - Google Secret Manager
```

#### 2. Rotate API Keys Regularly
```bash
# Set expiration reminder
echo "Rotate API keys every 90 days" >> /etc/cron.monthly/remind-key-rotation
```

#### 3. Use Read-Only Mounts
```yaml
# docker-compose.yml
volumes:
  - ./data:/data:ro  # Read-only
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: "Missing API keys" Error
**Symptom:**
```
Error: Missing API keys. Set GOOGLE_API_KEY or OPENAI_API_KEY
```

**Solution:**
```bash
# Check if environment variable is set
echo $GOOGLE_API_KEY

# If empty, set it
export GOOGLE_API_KEY=your_key_here

# Verify it's set
echo $GOOGLE_API_KEY
```

#### Issue 2: "No files found" Warning
**Symptom:**
```
⚠️  No files found to process
```

**Solution:**
```bash
# Check folder path
ls -la /path/to/folder

# Check modification dates
find /path/to/folder -type f -mtime -6  # Last 6 days

# Increase days
node dist/cli.js --folder ./logs --days 14
```

#### Issue 3: Docker Build Fails
**Symptom:**
```
ERROR: failed to solve: failed to compute cache key
```

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### Issue 4: Out of Memory
**Symptom:**
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solution:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" node dist/cli.js ...

# Or in Docker
docker run --memory=2g textdigest:latest ...
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with verbose output
node dist/cli.js --folder ./logs 2>&1 | tee debug.log

# Analyze logs
grep "ERROR" debug.log
```

---

## 📊 Monitoring

### Log Analysis

#### Structured Logs (JSON)
```bash
# View all logs
tail -f textdigest.log

# Filter by level
cat textdigest.log | jq 'select(.level == "error")'

# Count events
cat textdigest.log | jq '.event' | sort | uniq -c
```

#### Key Metrics to Monitor

| Metric | Command | Threshold |
|--------|---------|-----------|
| **Processing Time** | `grep "textdigest_completed" \| jq '.processingTimeSeconds'` | < 180s |
| **Error Rate** | `grep "level.*error" \| wc -l` | < 5% |
| **Quality Score** | `grep "evaluation_completed" \| jq '.scores'` | > 0.85 |
| **Memory Usage** | `docker stats textdigest-cli` | < 512MB |

### Health Checks

```bash
# Create health check script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
# Check if digest was generated in last 24 hours
if [ -f output/digest.md ]; then
  age=$(( $(date +%s) - $(stat -c %Y output/digest.md) ))
  if [ $age -lt 86400 ]; then
    echo "✅ HEALTHY: Digest generated recently"
    exit 0
  fi
fi
echo "❌ UNHEALTHY: Digest is stale or missing"
exit 1
EOF

chmod +x healthcheck.sh
```

### Alerting

```bash
# Example: Send alert if digest generation fails
#!/bin/bash
node dist/cli.js --folder ./logs --output ./output/digest.md

if [ $? -ne 0 ]; then
  # Send alert (example: email)
  echo "TextDigest failed to generate digest" | mail -s "Alert: TextDigest Failure" admin@example.com
  
  # Or Slack webhook
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -d '{"text":"TextDigest failed to generate digest"}'
fi
```

---

## 🔄 Updates & Maintenance

### Updating TextDigest

```bash
# Pull latest changes
cd /opt/textdigest
git pull origin main

# Install new dependencies
npm ci --omit=dev

# Rebuild
npm run build

# Restart service
sudo systemctl restart textdigest
```

### Backup & Restore

```bash
# Backup configuration
tar -czf textdigest-backup.tar.gz .env output/

# Restore configuration
tar -xzf textdigest-backup.tar.gz
```

---

## 📚 Additional Resources

- **Documentation**: `/docs/`
- **API Reference**: `/docs/api/API_REFERENCE.md`
- **Architecture**: `/docs/architecture/ARCHITECTURE.md`
- **Quick Start**: `/QUICKSTART.md`

---

**Last Updated**: 2025-11-29  
**Version**: 1.0.0
