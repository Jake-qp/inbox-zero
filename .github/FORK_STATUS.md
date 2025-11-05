# Fork Status Summary

**Last Updated:** November 5, 2025

## Quick Status

| Aspect | Status | Details |
|--------|--------|---------|
| Fork Repository | ✅ Active | https://github.com/Jake-qp/inbox-zero |
| Upstream Repository | ✅ Connected | https://github.com/elie222/inbox-zero |
| Current Version | ✅ v2.17.39 | Plus 1 custom commit |
| Automation | ✅ Enabled | Weekly checks every Monday |
| Behind Upstream | ✅ 0 commits | Up-to-date |
| Ahead of Upstream | ✅ 1 commit | Custom fix |

## Custom Commits

1. **b51e2cb14** - Fix redirect loop on assistant page for first-time users
   - Status: Active
   - Impact: Bug fix for onboarding flow
   - Safe to keep: Yes

## Automation

- **GitHub Action:** `.github/workflows/check-upstream-updates.yml`
- **Schedule:** Every Monday at 9 AM UTC
- **Action:** Creates GitHub issue when updates available
- **Next Run:** Next Monday

## Quick Commands

```bash
# Check status
git fetch upstream
git log --oneline HEAD..upstream/main

# See your custom commits
git log --oneline upstream/main..HEAD

# Full sync process
git checkout main
git merge upstream/main
pnpm install
pnpm prisma migrate dev
pnpm run build
pnpm run dev  # Test locally
git push origin main  # Deploy
```

## Deployment

- **Platform:** Vercel
- **Auto-deploy:** Yes (on push to main)
- **Environment:** Production

## Documentation

- **Main Guide:** [FORK-MAINTENANCE-GUIDE.md](../FORK-MAINTENANCE-GUIDE.md)
- **Agent Guide:** See "Agent Execution Guide" section in main guide
- **Workflow:** [check-upstream-updates.yml](workflows/check-upstream-updates.yml)

## Contact & Resources

- **Original Project:** [Inbox Zero Docs](https://docs.getinboxzero.com)
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Actions:** Check Actions tab for automation status

