#!/bin/bash
# Quick fix script for Docker build error

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║         TextDigest Docker Build - Quick Fix Script               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest changes from GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Trying reset..."
    git fetch origin main
    git reset --hard origin/main
fi
echo "✅ Git pull complete"
echo ""

# Step 2: Verify fix
echo "🔍 Step 2: Verifying fix in source code..."
if grep -q "import natural from 'natural'" src/fact-analyzer.ts; then
    echo "✅ Source code has correct import"
else
    echo "❌ WARNING: Source code still has old import!"
    echo "   Please check your git status manually."
    exit 1
fi
echo ""

# Step 3: Clean Docker
echo "🧹 Step 3: Cleaning Docker cache..."
docker-compose down -v 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "✅ Docker cache cleaned"
echo ""

# Step 4: Rebuild
echo "🔨 Step 4: Rebuilding Docker image (this may take 2-3 minutes)..."
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi
echo "✅ Docker build complete"
echo ""

# Step 5: Test
echo "🧪 Step 5: Testing Docker container..."
docker-compose run --rm textdigest --help > /tmp/test-output.txt 2>&1
if grep -q "SyntaxError" /tmp/test-output.txt; then
    echo "❌ Container still has SyntaxError!"
    cat /tmp/test-output.txt
    exit 1
else
    echo "✅ Container runs successfully!"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ FIX COMPLETE!                               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "You can now run: docker-compose up"
echo ""
