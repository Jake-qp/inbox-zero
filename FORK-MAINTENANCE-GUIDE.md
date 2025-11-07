# Fork Maintenance Guide

**Last Updated:** Nov 5, 2025 | **Automation:** ✅ Weekly checks (Mondays 9AM UTC)

## Quick Reference

**Fork:** https://github.com/Jake-qp/inbox-zero  
**Upstream:** https://github.com/elie222/inbox-zero  
**Status:** v2.17.39 + 1 custom commit | ✅ Up-to-date  
**Automation:** `.github/workflows/check-upstream-updates.yml`

### Commands
```bash
# Check updates
git fetch upstream && git log HEAD..upstream/main --oneline

# Sync
git merge upstream/main && pnpm install && pnpm prisma migrate dev && pnpm run build

# Deploy
git push origin main

# Undo
git reset --hard HEAD~1
```

---

## 🤖 Agent Workflows

### Workflow 1: Building New Custom Features

**ALWAYS use feature branches for new features to keep main stable.**

#### Plain Language Instructions for AI Agents

**BEFORE starting first task, tell the AI agent:**
```
We're building a new custom feature on a fork. To keep production stable:

1. Create a feature branch called "feature/daily-briefing"
2. Work on this branch, not main
3. After each task you complete, commit and push to this feature branch
4. Use commit message: "CUSTOM: Daily Briefing - Task X.X complete - [what you built]"
5. When I tell you the feature is complete, merge to main

Commands to run now:
git checkout main
git checkout -b feature/daily-briefing
```

**AFTER each task is complete, tell the AI agent:**
```
Good work on Task X.X. Now commit your changes:

1. Stage all your changes
2. Commit with message: "CUSTOM: Daily Briefing - Task X.X complete - [describe what you built]"
3. Push to the feature/daily-briefing branch (NOT main)

Commands to run:
git add .
git commit -m "CUSTOM: Daily Briefing - Task X.X complete - [description]"
git push origin feature/daily-briefing
```

**WHEN all tasks are done and tested, tell the AI agent:**
```
Feature is complete and tested. Now deploy to production:

1. Switch to main branch
2. Merge the feature branch
3. Push to main (this deploys to production)
4. Delete the feature branch

Commands to run:
git checkout main
git merge feature/daily-briefing
git push origin main
git branch -d feature/daily-briefing
```

#### Git Commands Reference

**Before Starting Any Feature:
```bash
# Make sure you're on main and it's clean
git checkout main
git status  # Should show "nothing to commit, working tree clean"

# Create feature branch
git checkout -b feature/[feature-name]
# Example: git checkout -b feature/daily-briefing
```

#### After Each Task in Feature:
```bash
# Save your work
git add .
git commit -m "CUSTOM: [Feature Name] - Task X.X complete - [what you built]"
# Example: git commit -m "CUSTOM: Daily Briefing - Task 1.1 complete - database schema"

# Push to feature branch (NOT main)
git push origin feature/[feature-name]
```

#### When Feature is 100% Complete and Tested:
```bash
# Switch back to main
git checkout main

# Merge your complete feature
git merge feature/[feature-name]

# Push to main (triggers production deployment)
git push origin main

# Optional: Delete feature branch (cleanup)
git branch -d feature/[feature-name]
git push origin --delete feature/[feature-name]
```

**Why this works:** Main branch stays stable. Feature branch is your safe workspace. Only deploy to production when everything works.

---

### Workflow 2: Syncing Upstream Updates

**ALWAYS sync on main branch, never on feature branches.**

#### High-Level Process
```
FETCH → CHECK → MERGE → TEST → DEPLOY
```

#### Key Rules
- ✅ ONLY merge `upstream/main` (official, reviewed code)
- ❌ NEVER merge feature/dev branches
- ✅ ALWAYS test locally before pushing
- ✅ ALWAYS document custom changes with "CUSTOM:" prefix
- ❌ NEVER use `--force` push or skip conflicts
- ✅ Sync on `main` branch only, not on feature branches

### Automation
- **Weekly checks:** GitHub Action creates issue when updates available
- **Manual trigger:** GitHub → Actions → "Check Upstream Updates"
- **Deploy:** Vercel auto-deploys on push to main

---

## 🤖 Agent Execution Guide

### Upstream Sync Process (9 Steps)

```yaml
1. Pre-flight: git status && git checkout main && git remote -v
   → Verify clean state, on main, remotes exist

2. Fetch: git fetch upstream
   → Get latest upstream changes

3. Check: git log --oneline HEAD..upstream/main
   → If empty: STOP. If commits: continue to step 4

4. Review: git log --stat HEAD..upstream/main | head -50
   → Present changes, wait for user approval

5. Merge: git merge upstream/main
   → Auto-merge or conflict (see below)

6. Dependencies: pnpm install
   → Update packages

7. Migrations: pnpm prisma migrate dev
   → Apply DB changes

8. Build: pnpm run build
   → Must succeed before deploy

9. Deploy: git push origin main
   → Vercel auto-deploys

Conflict Resolution:
  git status → identify files
  Edit files → remove <<<< ==== >>>> markers, resolve
  git add <files> → stage resolved
  git merge --continue → complete merge
  Continue from step 6
```

### Success Criteria
- Build successful
- Local tests pass
- Vercel deploys successfully

---

## 📝 Custom Changes

**Current:**
- b51e2cb14: Fix redirect loop on assistant page

**Commit message format:**
```bash
# For features (use feature branch):
git commit -m "CUSTOM: [Feature] - Task X.X - [description]"

# For hotfixes (direct to main):
git commit -m "CUSTOM: [description]"
```

**Examples:**
```bash
git commit -m "CUSTOM: Daily Briefing - Task 1.1 - Add database schema"
git commit -m "CUSTOM: Daily Briefing - Task 2.3 - Add BriefingHeader component"
git commit -m "CUSTOM: Fix typo in settings page"
```

---

## 🆘 Quick Troubleshooting

**Undo last action:**
```bash
git reset --hard HEAD~1
```

**Abort merge:**
```bash
git merge --abort
```

**Backup before risky operation:**
```bash
git branch backup-$(date +%Y%m%d)
```

**Check deployment status:** Vercel dashboard

---

## ⚠️ Critical Safety Rules

1. **NEW FEATURES:** Always use feature branches (`feature/name`)
2. **UPSTREAM SYNC:** Only merge `upstream/main` to your `main` branch
3. **TESTING:** Always test locally before merging to main
4. **CONFLICTS:** Never skip - resolve them properly
5. **LABELING:** All custom commits start with "CUSTOM:"
6. **TIMING:** Don't sync upstream while building a feature (finish feature first)
7. **DEPLOYMENT:** Only `main` branch deploys to production

**Links:** [Upstream](https://github.com/elie222/inbox-zero) | [Fork](https://github.com/Jake-qp/inbox-zero) | [Vercel](https://vercel.com/dashboard) | [Docs](https://docs.getinboxzero.com)

