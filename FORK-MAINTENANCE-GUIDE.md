# Fork Maintenance Guide for Inbox Zero

**Last Updated:** November 5, 2025  
**Automation Status:** ✅ Enabled (Weekly checks via GitHub Actions)

## 📋 Overview

This is your private fork of the open-source Inbox Zero project. This guide helps you keep your version up-to-date with improvements from the original project while keeping your custom features.

## 🤖 For AI Agents & Automation

### High-Level Workflow
```
1. FETCH → Get latest from upstream (github.com/elie222/inbox-zero)
2. CHECK → Compare upstream/main with local main branch
3. MERGE → Integrate official changes (from main branch ONLY)
4. TEST → Verify build and functionality
5. DEPLOY → Push to origin, auto-deploy via Vercel
```

### Key Principles
- **Source of truth:** `upstream/main` = official, reviewed code only
- **Never merge:** Feature branches, dev branches, or unmerged PRs
- **Custom changes:** Track separately, preserve during merges
- **Safety first:** Always test locally before deploying

### Automation Status
- ✅ **Weekly checks:** GitHub Actions runs every Monday at 9 AM UTC
- ✅ **Auto-notification:** Creates GitHub issue when updates available
- ⏸️ **Manual merge:** Requires human review and approval
- ✅ **Auto-deploy:** Vercel deploys automatically after git push

### Current State
- **Fork:** https://github.com/Jake-qp/inbox-zero
- **Upstream:** https://github.com/elie222/inbox-zero
- **Last sync:** v2.17.39
- **Custom commits:** 1 (redirect loop fix)

---

## ✅ Already Set Up (One-Time - Done)

These items are already configured and don't need to be done again:

- [x] **Git repository cloned** - Your local copy exists at `/Users/jra/Documents/Cursor Projects/inbox-zero`
- [x] **Vercel deployment** - Your app is hosted on Vercel
- [x] **Environment variables** - Your `.env.local` file has your API keys and secrets
- [x] **Dependencies installed** - Project packages are installed
- [x] **Upstream remote added** - Connected to original project for updates

---

## 🤖 Automation Setup

### GitHub Actions - Automatic Update Checker ✅

**Location:** `.github/workflows/check-upstream-updates.yml`

**What it does:**
- Runs every Monday at 9 AM UTC
- Fetches latest from upstream
- Checks if new commits are available
- Creates a GitHub issue if updates found
- Provides summary of changes and instructions

**How to use:**
1. ✅ **Already configured** - File created and ready
2. Push to GitHub to activate: `git push origin main`
3. Wait for Monday, or trigger manually in GitHub Actions tab
4. Check GitHub Issues for update notifications

**Manual trigger:**
- Go to GitHub → Actions → "Check Upstream Updates"
- Click "Run workflow"

---

## 🔧 One-Time Setup (Already Complete!)

~~These needed to be done once to enable automatic updates~~ ✅ Done!

### Step 1: Add Upstream Remote ✅

This connects your fork to the original repository so you can pull updates.

**How to do it:**
1. Open Terminal/Command Prompt
2. Navigate to your project folder:
   ```bash
   cd "/Users/jra/Documents/Cursor Projects/inbox-zero"
   ```
3. Add the original repository as "upstream":
   ```bash
   git remote add upstream https://github.com/elie222/inbox-zero.git
   ```
4. Verify it worked:
   ```bash
   git remote -v
   ```
   
   You should see:
   - `origin` = your fork
   - `upstream` = the original Inbox Zero repo

**Status:** ✅ Completed

---

## 🔄 Regular Maintenance (Do This Weekly or Before Deploying)

Follow these steps each time you want to sync with the original project:

### Step 2: Check for Updates

See what's new in the original project before pulling changes.

**How to do it:**
```bash
cd "/Users/jra/Documents/Cursor Projects/inbox-zero"
git fetch upstream
git log HEAD..upstream/main --oneline
```

**What this shows:** A list of new commits/features from the original project

**Current Status (Nov 5, 2025):**
- ✅ Checked - You're up-to-date with upstream v2.17.39
- ✅ You have 1 custom commit ahead
- ✅ No new updates available to pull right now

**Status:** ✅ Completed (check again weekly)

---

### Step 3: Pull Updates from Original Project

Merge the latest **official, reviewed** changes into your version.

**IMPORTANT SAFETY NOTE:**
- You are syncing with `upstream/main` ONLY
- This branch contains ONLY code that the main developer has reviewed and merged
- You will NOT get experimental or unreviewed code from feature branches
- This protects you from pulling in work-in-progress changes

**How to do it:**
```bash
git checkout main
git merge upstream/main
```

**What happens:**
- ✅ If no conflicts: Updates merge automatically
- ⚠️ If conflicts: You'll need to resolve them (see Step 4)

**Status:** ⏳ Need to do regularly

---

### Step 4: Resolve Conflicts (If Any)

If you've customized code that the original project also changed, you'll see conflicts.

**How to identify conflicts:**
- Git will list conflicted files
- Open each file in your editor
- Look for sections marked with:
  ```
  <<<<<<< HEAD
  Your custom code
  =======
  Original project's code
  >>>>>>> upstream/main
  ```

**How to resolve:**
1. Decide which version to keep (yours, theirs, or combine both)
2. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Save the file
4. Mark as resolved:
   ```bash
   git add <filename>
   ```
5. Complete the merge:
   ```bash
   git merge --continue
   ```

**Status:** ⏳ Only needed if conflicts occur

---

### Step 5: Test Everything

Before deploying, make sure everything still works.

**How to do it:**
```bash
# Install any new dependencies
pnpm install

# Run database migrations (if any new ones)
pnpm prisma migrate dev

# Build the project
pnpm run build

# Start locally to test
pnpm run dev
```

**What to test:**
- [ ] App loads at http://localhost:3000
- [ ] Login works
- [ ] Your custom features still work
- [ ] New features from upstream work

**Status:** ⏳ Do after every sync

---

### Step 6: Deploy to Vercel

Push your updated code and deploy.

**How to do it:**
```bash
# Push to your repository
git push origin main
```

**What happens automatically:**
- ✅ Vercel detects the push
- ✅ Vercel builds and deploys automatically
- ✅ You'll get a deployment notification

**Check deployment:**
- Visit your Vercel dashboard
- Verify the deployment succeeded
- Test your live site

**Status:** ⏳ Do after testing locally

---

## 🎯 Best Practices

### When Making Custom Changes

1. **Always sync first** - Get latest updates before adding features
2. **Label custom commits** - Start commit messages with "CUSTOM:" 
   ```bash
   git commit -m "CUSTOM: Add internal analytics dashboard"
   ```
3. **Document changes** - Keep notes on what you've customized
4. **Test before deploying** - Always run locally first

### Maintenance Schedule

#### Automated (Hands-off)
- **Weekly:** GitHub Action checks for updates (every Monday)
- **Notifications:** Automatic GitHub issue creation when updates available

#### Manual (When notified)
- **Review issue:** Read what changed in upstream
- **Sync:** Follow Steps 2-6 (should take ~15 minutes)
- **Before big features:** Sync first to avoid conflicts
- **After major releases:** Sync within 24-48 hours

---

## ⚠️ Important: What NOT To Do

### NEVER Sync with Feature Branches

When you fetched upstream, you saw hundreds of branches like:
- `upstream/feat/new-feature`
- `upstream/dev`
- `upstream/cursor/something`

**DO NOT merge these branches!** They contain:
- Work-in-progress code
- Unreviewed changes
- Experimental features
- Code that may never make it into the main app

**Always use:** `git merge upstream/main`
**Never use:** `git merge upstream/feat-whatever` or any other branch

### Only Sync When You're Ready

- Don't sync in the middle of building a feature
- Don't sync right before a critical deadline
- Always have time to test after syncing

---

## 🆘 Troubleshooting

### "I messed up and want to undo"

```bash
# See recent commits
git log --oneline

# Go back to a previous state
git reset --hard <commit-id>
```

### "Merge conflicts are too complicated"

1. Create a backup branch first:
   ```bash
   git branch backup-before-merge
   ```
2. Ask for help in developer community
3. Or reset and try again later:
   ```bash
   git merge --abort
   ```

### "Vercel deployment failed"

1. Check Vercel dashboard for error logs
2. Common issues:
   - Missing environment variables
   - Build errors (check locally first with `pnpm run build`)
   - Database migration issues

---

## 📝 Custom Changes Log

Track your custom modifications here:

### Custom Features Added
- [x] **Fix redirect loop on assistant page** (commit: b51e2cb14) - Fixes first-time user redirect issue

### Current Sync Status
- **Your version:** Based on upstream v2.17.39 + 1 custom commit
- **Last synced:** Before November 5, 2025
- **Status:** ✅ Up-to-date with official releases

### Custom Environment Variables
- [ ] _Document any custom env vars you add_

### Modified Files
- [ ] _Track files you've significantly customized_

---

## 🔗 Important Links

- **Original Project:** https://github.com/elie222/inbox-zero
- **Your Fork:** https://github.com/Jake-qp/inbox-zero
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Documentation:** https://docs.getinboxzero.com

---

## ✨ Quick Command Reference

```bash
# Check for updates
git fetch upstream && git log HEAD..upstream/main --oneline

# Sync with original
git checkout main && git merge upstream/main

# Test locally
pnpm install && pnpm run build && pnpm run dev

# Deploy
git push origin main

# Emergency undo
git reset --hard HEAD~1
```

---

## 🤖 Agent Execution Guide

When an AI agent needs to sync the fork, follow this structured process:

### Pre-flight Checks
```bash
# Verify git status is clean
git status

# Ensure on main branch
git checkout main

# Verify remotes exist
git remote -v | grep -E "(origin|upstream)"
```

### Sync Process
```yaml
Step 1: Fetch upstream
  Command: git fetch upstream
  Expected: Success, shows fetched branches/tags
  On failure: Check network, verify upstream remote exists

Step 2: Check for updates
  Command: git log --oneline HEAD..upstream/main
  Expected: List of commits (empty if up-to-date)
  Decision: If empty → STOP (no updates). If commits → CONTINUE

Step 3: Review changes
  Command: git log --stat HEAD..upstream/main | head -50
  Action: Present summary to user for approval
  Wait for: User confirmation to proceed

Step 4: Merge upstream
  Command: git merge upstream/main
  Expected: "Fast-forward" or "Merge made"
  On conflict: See conflict resolution section

Step 5: Install dependencies
  Command: pnpm install
  Expected: Success, dependencies updated
  On failure: Check package.json, resolve manually

Step 6: Run migrations
  Command: pnpm prisma migrate dev
  Expected: Migrations applied or "Already up to date"
  On failure: Review migration errors, may need manual intervention

Step 7: Build test
  Command: pnpm run build
  Expected: "Compiled successfully"
  On failure: Review build errors, fix before deploying

Step 8: Local test
  Command: pnpm run dev &
  Action: Test critical paths (login, main features)
  Wait for: User confirmation tests pass

Step 9: Deploy
  Command: git push origin main
  Expected: Push succeeds, Vercel auto-deploys
  Monitor: Vercel deployment status
```

### Conflict Resolution
```yaml
When merge conflicts occur:
  1. List conflicted files: git status
  2. For each file:
     - Open file
     - Find conflict markers (<<<<<<< ======= >>>>>>>)
     - Decide: keep ours, theirs, or combine
     - Remove markers
     - Save file
     - git add <filename>
  3. Complete merge: git merge --continue
  4. Proceed to Step 5
```

### Safety Rules
- ✅ ONLY merge from `upstream/main`
- ❌ NEVER merge from feature branches
- ✅ ALWAYS test locally before pushing
- ❌ NEVER use `--force` push
- ✅ ALWAYS document custom changes
- ❌ NEVER skip conflict resolution

### Success Criteria
- Build completes without errors
- Tests pass locally
- User confirms functionality works
- Vercel deployment succeeds
- No console errors on production site

---

**Current Status:**
- ✅ Automation configured
- ✅ Up-to-date with upstream v2.17.39
- ✅ Ready for automated weekly checks

