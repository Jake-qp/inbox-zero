# PRD: Daily Briefing - Multi-Account AI Email Dashboard

**Version:** 1.0  
**Status:** Ready for Implementation  
**Target:** AI agent to create implementation plan  
**Estimated Effort:** 3-4 days

---

## 1. Problem & Solution

### Problem
Users manage 4+ email accounts (Gmail/Outlook) receiving 100-200+ daily emails. Switching between accounts is time-consuming and risks missing critical messages.

### Solution
Unified Daily Briefing page that:
- Aggregates all accounts into single view
- AI scores emails 1-10 for importance
- Shows only important emails (score ≥6)
- Groups by account with visual hierarchy
- User customizes scoring via natural language guidance
- Stores historical snapshots for reviewing past days

### Success Metrics
- 15-30 important emails shown from 100+ total
- Zero missed critical emails (9-10 score)
- <3 second load time
- User customizes within 3 uses

---

## 2. User Stories

**Primary:**
As a user with multiple accounts, I want all important emails in one place, so I can triage efficiently without switching.

**Supporting:**
1. See emails grouped by account (know which inbox)
2. AI identifies urgent/important (don't miss critical)
3. Customize what's important (matches my priorities)
4. Take quick actions (reply/archive from briefing)
5. Ask questions about emails (chat integration - future)

---

## 3. Architecture

### Core Flow
```
User → /briefing?date=YYYY-MM-DD (defaults to today)
→ Check if snapshot exists for user + date
→ If exists and fresh: Return cached
→ If missing or stale: Generate (fetch + score + filter)
→ Store snapshot → Return data
→ Render urgent section + account sections
```

### Key Components
- **Backend:** Multi-account aggregation, AI scoring, snapshot storage
- **Frontend:** Briefing page, date navigation, account sections, email cards, settings
- **AI:** Batch email scoring with user guidance
- **Storage:** Historical snapshots (immutable daily records)

## 4. UI Design

### Main Briefing Page Layout
```
┌─────────────────────────────────────────────┐
│ 📧 Daily Briefing         [⚙️ Settings]     │
│ ← Nov 5  |  Nov 6, 2024  |  [Today]         │
│ ─────────────────────────────────────────── │
│                                              │
│ 🔥 URGENT (3) - Score 9-10                  │
│   • Server outage (work@company.com)        │
│   • Contract revision (client@outlook.com)  │
│   • Payment issue (personal@gmail.com)      │
│                                              │
│ ──────────────────────────────────────────  │
│                                              │
│ 🏢 work@company.com (Gmail)       [8 new]  │
│   • Meeting request - Score 8               │
│   • Q4 Report - Score 7                     │
│   • [...more]                               │
│                                              │
│ 👤 personal@gmail.com (Gmail)     [3 new]  │
│ 💼 client@outlook.com (Outlook)   [2 new]  │
│ 🚀 other@outlook.com (Outlook)    [1 new]  │
└─────────────────────────────────────────────┘
```

### Email Card Elements
- Score badge (color-coded: red=9-10, orange=7-8, yellow=6)
- Subject, from, account badge, time ago
- Snippet preview (2 lines)
- Quick actions: Reply, Archive, View Thread

### Settings Page
- Large textarea for natural language guidance
- Default placeholder with examples
- Save/Reset buttons
- Tips section for better prompts

**Navigation:** Add "Daily Briefing" link to existing sidebar

## 5. Technical Requirements

### 5.1 Database Schema

**Add to EmailAccount model:**
```prisma
briefingGuidance String? @db.Text  // Natural language AI scoring guidance
```

**Add new model for snapshots:**
```prisma
model BriefingSnapshot {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date DateTime  // Start of day (YYYY-MM-DD 00:00:00)
  data Json      // Cached BriefingResponse
  
  @@unique([userId, date])
  @@index([userId, date])
}
```

### 5.2 API Contracts

**GET /api/ai/briefing**
- Auth: `withAuth` middleware
- Query params: `date` (optional, defaults to today, format: YYYY-MM-DD)
- Returns: `{ accounts: [{ account, badge, emails }] }`
- Each email has: id, threadId, subject, from, date, snippet, score (1-10)
- Filter: Only show emails with score ≥ 6
- Snapshot logic:
  * Check if snapshot exists for user + date
  * If today and snapshot < 1hr old: Return cached
  * If today and stale/missing: Regenerate and update
  * If past day and exists: Return cached
  * If past day and missing: Generate and store permanently
- File: `apps/web/app/api/ai/briefing/route.ts`

**Server Action: updateBriefingGuidanceAction**
- Updates `EmailAccount.briefingGuidance`
- File: `apps/web/utils/actions/email-account.ts`
- Validation: `apps/web/utils/actions/email-account.validation.ts`

### 5.3 AI Scoring Logic

**Function: scoreEmailsBatch()**
- Location: `apps/web/utils/ai/briefing/score-importance.ts`
- Input: Array of emails, EmailAccount with guidance
- Output: Map of emailId → score (1-10)
- Uses: Existing `generateText()` from AI utils
- Temperature: 0.3 for consistency

**Default Guidance:**
```
Important: Personal contacts, direct questions, meeting invites,
active conversations, time-sensitive
Not important: Newsletters, receipts, automated, marketing
```

**Scoring Scale:**
- 9-10: Critical/urgent
- 7-8: Important
- 5-6: Relevant
- 3-4: Low priority
- 1-2: Noise

## 6. File Structure

```
apps/web/
├── app/(app)/briefing/
│   ├── page.tsx              # Main briefing page
│   ├── loading.tsx           # Loading skeleton
│   ├── error.tsx             # Error boundary
│   └── settings/page.tsx     # Settings page
│
├── app/api/ai/briefing/
│   └── route.ts              # GET endpoint
│
├── components/briefing/
│   ├── BriefingHeader.tsx
│   ├── UrgentSection.tsx
│   ├── AccountSection.tsx
│   ├── EmailCard.tsx
│   └── EmptyState.tsx
│
├── hooks/
│   └── useBriefing.ts        # SWR data fetching
│
├── utils/ai/briefing/
│   └── score-importance.ts   # AI scoring
│
└── utils/actions/
    ├── email-account.ts      # updateBriefingGuidanceAction
    └── email-account.validation.ts
```

---

## 7. Implementation Phases

**Phase 1: Backend (Day 1)**
- Add database schema + migration
- Implement AI scoring function
- Create API route (fetch + score + filter)
- Add server action for guidance updates

**Phase 2: Main UI (Day 2)**
- Create briefing page with SWR hook
- Build urgent section + account sections
- Build email cards with actions
- Add to existing sidebar navigation

**Phase 3: Settings (Day 3)**
- Settings page with guidance editor
- Save/reset functionality
- Link from main page

**Phase 4: Polish (Day 4)**
- Loading/error/empty states
- Responsive design
- Performance testing

## 8. User Flows

**Primary Flow: View Briefing**
1. Click "Daily Briefing" in sidebar (defaults to today)
2. Page loads (skeleton state)
3. Scan urgent section (3 sec)
4. Review account sections
5. Take actions (reply/archive/view)
6. Done in 2-5 minutes

**Historical Review Flow:**
1. User hasn't checked in 3 days
2. Opens briefing → sees today's emails
3. Clicks "← Previous" → sees yesterday's briefing
4. Clicks "← Previous" → sees day before
5. Reviews each day's important emails
6. Catches up on missed items

**Settings Flow: Customize**
1. Notice irrelevant emails
2. Click settings gear
3. Edit guidance textarea
4. Save (toast confirmation)
5. Next briefing reflects changes
6. Iterate over 3-5 days

---

## 9. Edge Cases

**No important emails:** Empty state with positive message  
**All urgent (20+):** Warning banner, suggest refining guidance  
**Account API fails:** Show error for that account only, others work  
**AI fails:** Fallback to score=5, show warning banner  
**0 accounts:** Onboarding message  
**New user:** Use default guidance, show customization tip  
**Future date:** Disable navigation beyond today  
**Very old date (>90 days):** Show "Snapshot not available" or generate on-demand  
**Invalid/expired tokens:** Auto-detect, clear tokens, show "Reconnect" button (preserves all user data)  
**Token decryption fails:** Same as expired tokens - graceful reconnect flow

## 10. Performance & Technical Constraints

**Performance Targets:**
- Page load: <3 seconds (today), <1 second (cached past days)
- Email fetch: Limit 100/account, parallel, 10s timeout
- AI scoring: Batch 50 emails, ~2-3s, temp=0.3
- Snapshot storage: Today refreshes hourly, past days cached permanently
- Date range: Support last 90 days (older snapshots can be purged)

**Error Handling:**
- Account fetch fails → Continue with other accounts
- AI scoring fails → Default score=5
- UI errors → Error boundaries per section
- All errors logged with `createScopedLogger`
- Token errors → Auto-cleanup + show reconnect UI (using existing `cleanupInvalidTokens()` utility)

**Security:**
- Use existing `withAuth` middleware
- Verify account ownership
- Email content never stored (only scores/metadata)
- Follow existing rate limiting patterns

---

## 11. Key Dependencies

**Leverage Existing Code:**
- `utils/email/provider.ts` - EmailProvider, createEmailProvider
- `utils/ai/` - getModel, generateText, createScopedLogger
- `utils/middleware.ts` - withAuth
- `components/ui/` - Card, Button, Badge, Skeleton, Textarea
- `utils/actions/` - actionClient pattern
- SWR patterns from existing hooks

**Reference Implementations:**
- Email list: `app/(app)/[emailAccountId]/mail/page.tsx`
- AI email processing: `utils/ai/digest/summarize-email-for-digest.ts`
- Multi-provider fetch: `app/api/threads/route.ts`
- Server actions: `utils/actions/rule.ts`

---

## 12. Success Criteria

**MVP Launch:**
✅ Shows all accounts in unified view  
✅ AI scoring 80%+ accurate  
✅ User customization works  
✅ <5s load time  
✅ Zero critical bugs  

**30-Day Goals:**
- 80% daily adoption
- <5% missed important emails
- <3 min avg triage time
- 60% customize guidance

---

---

## 13. Token Management & Reconnect Flow

### Problem
Existing users may have corrupted/expired OAuth tokens from:
- Old merge flow bug (fixed in account linking callbacks)
- Token encryption key mismatches
- Normal OAuth token expiration

### Solution: Auto-Heal Without Data Loss

**Phase 1: One-Time Migration (Pre-Launch)**
- Script: `apps/web/scripts/fix-broken-briefing-tokens.ts`
- Scans all accounts, detects decryption failures
- Clears broken tokens (sets access_token, refresh_token, expires_at to NULL)
- Run once: `pnpm tsx apps/web/scripts/fix-broken-briefing-tokens.ts`

**Phase 2: Smart Detection (Briefing API)**
- Detect token errors: "No refresh token", "invalid_grant", decryption failures
- Use existing `cleanupInvalidTokens()` utility from `utils/auth/cleanup-invalid-tokens.ts`
- Return `errorType: 'AUTH_REQUIRED'` in response
- Preserves account data, only clears tokens

**Phase 3: Reconnect UI (User-Friendly)**
- AccountSection shows: "Authentication expired → [Reconnect] button"
- One-click OAuth flow (Google: `signIn.social()`, Microsoft: `signIn.social()`)
- After reconnect: Fresh tokens saved, cache auto-invalidated, briefing regenerates
- Zero data loss: All rules, labels, settings preserved
- Auto-cache invalidation: `handleLinkAccount()` clears today's snapshot after OAuth success

### Files Modified
- `apps/web/app/api/google/linking/callback/route.ts` - Fixed merge flow to save tokens
- `apps/web/app/api/outlook/linking/callback/route.ts` - Fixed merge flow to save tokens  
- `apps/web/app/api/ai/briefing/route.ts` - Detect token errors, call `cleanupInvalidTokens()`
- `apps/web/components/briefing/AccountSection.tsx` - Show reconnect button for AUTH_REQUIRED
- `apps/web/app/(app)/briefing/page.tsx` - Pass errorType to AccountSection
- `apps/web/utils/auth.ts` - Auto-invalidate briefing cache after OAuth in `handleLinkAccount()`
- `apps/web/scripts/fix-broken-briefing-tokens.ts` - One-time cleanup script

### Success Criteria
✅ Existing users with 3-4 accounts don't need to delete/re-add  
✅ Clear "Reconnect" button when tokens invalid  
✅ One click per account to fix  
✅ All setup (rules, labels, settings) preserved  
✅ Works for future token expirations too  
✅ Auto-cache invalidation after reconnect (no manual refresh needed)  

---

**END OF PRD**

*AI Agent: Use this PRD to create detailed implementation plan with atomic tasks.*

