# 🔧 Docker Build Fix - Step by Step Instructions

## Problem
Docker container fails with:
```
SyntaxError: Named export 'TfIdf' not found. The requested module 'natural' 
is a CommonJS module
```

## Root Cause
Your local repository is **out of sync** with the remote. The fix has been pushed to GitHub, but your local machine hasn't pulled it yet.

---

## ✅ Solution - Follow These Steps EXACTLY

### Step 1: Navigate to Your Repository
```bash
cd /c/my/files-summary
```

### Step 2: Verify Current Status
```bash
git status
git log --oneline -3
```

**Expected Output:** You should see older commits, NOT the latest fixes.

### Step 3: Pull Latest Changes from GitHub
```bash
git pull origin main
```

**Expected Output:**
```
Updating c66d134..a72fe45
Fast-forward
 src/content-filter.ts | 4 +++-
 1 file changed, 3 insertions(+), 1 deletion(-)
```

### Step 4: Verify Fix Was Pulled
Check that the fix is now in your local code:

```bash
head -20 src/fact-analyzer.ts | grep "import"
```

**Expected Output:**
```typescript
import natural from 'natural';
import type { FileSummary, AnalyzedFact, Logger } from './types.js';
```

**NOT:**
```typescript
import { TfIdf } from 'natural';  // ❌ OLD VERSION
```

### Step 5: Remove Old Docker Images and Containers
```bash
# Stop and remove old container
docker-compose down -v

# Remove old image (force rebuild)
docker rmi textdigest:latest

# Or remove all textdigest images
docker images | grep textdigest | awk '{print $3}' | xargs docker rmi -f
```

### Step 6: Clean Docker Build Cache (Important!)
```bash
docker builder prune -af
```

**This ensures Docker doesn't use cached layers with the old code.**

### Step 7: Rebuild Docker Image (No Cache)
```bash
docker-compose build --no-cache
```

**Expected Output:** Build should complete without errors. Look for:
```
Successfully tagged textdigest:latest
```

### Step 8: Run Docker Container
```bash
docker-compose up
```

**Expected Result:**
✅ Container starts without SyntaxError
✅ Shows help text or processes files
✅ No "Named export 'TfIdf' not found" error

---

## 🔍 Verification Checklist

After pulling and rebuilding, verify:

```bash
# 1. Check local source code
grep "import natural from" src/fact-analyzer.ts
# Should return: import natural from 'natural';

# 2. Check git log
git log --oneline -1
# Should show: a72fe45 fix: Ensure legal terms matching is case-insensitive

# 3. Check Docker image was rebuilt
docker images textdigest
# Should show recent creation time (not days ago)

# 4. Test container
docker-compose run textdigest --help
# Should show help without errors
```

---

## 🚨 If Pull Fails or Conflicts Occur

If `git pull` shows conflicts or errors:

```bash
# Save your local changes (if any)
git stash

# Reset to remote state
git fetch origin main
git reset --hard origin/main

# Restore your local changes (if needed)
git stash pop
```

---

## 🐳 Alternative: Use Docker Compose V2

If `docker-compose` command is not found, use:

```bash
# Build
docker compose build --no-cache

# Run
docker compose up
```

(Note: No hyphen in `docker compose`)

---

## 📊 Expected Git Log After Pull

```bash
$ git log --oneline -3
a72fe45 fix: Ensure legal terms matching is case-insensitive with proper regex escaping
c66d134 docs: Add Ukrainian support link to README
c52dcdc feat: Complete Ukrainian language support verification
```

If you see these commits, the pull was successful.

---

## 💡 Why This Happened

1. **Fixes were pushed to GitHub** (commits a518109, a72fe45)
2. **Your local repository** is on older commit (c66d134 or earlier)
3. **Docker builds from local source**, not GitHub
4. **Docker cached the old build** with broken imports
5. **Solution:** Pull latest + force rebuild with no cache

---

## ✅ Quick Command Summary

```bash
# All-in-one fix:
cd /c/my/files-summary
git pull origin main
docker-compose down -v
docker builder prune -af
docker-compose build --no-cache
docker-compose up
```

---

## 📞 Still Not Working?

If the error persists after following all steps:

1. **Verify you pulled:** `git log --oneline -1` should show `a72fe45`
2. **Check source code:** `head -20 src/fact-analyzer.ts` should show `import natural from 'natural';`
3. **Check Docker didn't use cache:** Look for "Downloading" or "Building" output, not "Using cache"
4. **Try manual build:**
   ```bash
   cd /c/my/files-summary
   npm install
   npm run build
   head -20 dist/fact-analyzer.js  # Should show correct import
   docker-compose build --no-cache
   ```

---

## 🎉 Success Indicators

After successful fix:

✅ `git pull` downloads new commits
✅ `src/fact-analyzer.ts` has `import natural from 'natural';`
✅ Docker build completes without errors
✅ Container runs without SyntaxError
✅ TextDigest processes files successfully

---

**Repository:** https://github.com/abezr/files-summary  
**Latest Commit:** a72fe45  
**Status:** ✅ Fixed on GitHub, needs local pull
