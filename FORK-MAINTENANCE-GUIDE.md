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

## 🤖 Agent Workflow

### High-Level Process
```
FETCH → CHECK → MERGE → TEST → DEPLOY
```

### Key Rules
- ✅ ONLY merge `upstream/main` (official, reviewed code)
- ❌ NEVER merge feature/dev branches
- ✅ ALWAYS test locally before pushing
- ✅ ALWAYS document custom changes with "CUSTOM:" prefix
- ❌ NEVER use `--force` push or skip conflicts

### Automation
- **Weekly checks:** GitHub Action creates issue when updates available
- **Manual trigger:** GitHub → Actions → "Check Upstream Updates"
- **Deploy:** Vercel auto-deploys on push to main

---

## 🤖 Agent Execution Guide

### Sync Process (9 Steps)

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

**Track new changes with "CUSTOM:" prefix:**
```bash
git commit -m "CUSTOM: Description of change"
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

1. **ONLY** merge `upstream/main` (never feat/dev branches)
2. **ALWAYS** test locally before pushing
3. **NEVER** skip conflict resolution
4. **ALWAYS** label custom commits with "CUSTOM:"
5. Sync before starting new features
6. Don't sync mid-feature or before deadlines

**Links:** [Upstream](https://github.com/elie222/inbox-zero) | [Fork](https://github.com/Jake-qp/inbox-zero) | [Vercel](https://vercel.com/dashboard) | [Docs](https://docs.getinboxzero.com)

