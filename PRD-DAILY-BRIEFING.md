# PRD: Daily Briefing - Multi-Account AI Email Dashboard

**Version:** 2.0  
**Status:** Ready for Implementation (Inbox-First Pivot)  
**Target:** AI agent to create implementation plan  
**Estimated Effort:** 3-4 days

---

## 1. Problem & Solution

### Problem
Users manage 4+ email accounts (Gmail/Outlook) receiving 100-200+ daily emails. Switching between accounts is time-consuming and risks missing critical messages. Need a unified actionable to-do list, not just a historical record.

### Solution
Unified Daily Briefing with **two modes**:

**PRIMARY: Inbox Mode (Default)**
- Shows all important emails currently in inbox across all accounts
- No time limit - emails stay until you archive or reply
- Live view that updates as you work (archive/reply removes items)
- AI scores emails 1-10, shows only ≥6
- Mental model: "My multi-account email to-do list"

**SECONDARY: History Mode**
- Calendar day snapshots for reviewing specific past dates
- Cached permanently for "what happened on Nov 3rd?" queries
- Accessed via "View History" button

### Core Principle
**"If it's in your inbox and important (score ≥6), you see it. Archive to remove."**

This simple rule works across all providers without special cases for read/unread, starred/flagged, or snoozed states. The AI scoring handles priority, the inbox location signals actionability.

### Success Metrics
- 15-30 important emails shown from 100+ total
- Zero missed critical emails (9-10 score)
- <3 second load time (Inbox - fetches all inbox emails), <1s (History cache)
- 70%+ users stay in Inbox mode (validates primary use case)

---

## 2. User Stories

**Primary (Inbox Mode):**
As a user with multiple accounts, I want a single actionable list of all important emails currently in my inbox, so I can triage efficiently without switching accounts. Emails stay visible until I act on them.

**Supporting:**
1. See emails grouped by account with AI importance scores
2. Archive/reply removes emails from my briefing (live updates)
3. Customize scoring with natural language guidance
4. Review past days via History mode when needed
5. Clear mental model: "This is my email to-do list"

---

## 3. Architecture

### Core Flow

**Inbox Mode (Default):**
```
User → /briefing (no params, defaults to Inbox)
→ Fetch all inbox emails across all accounts (no time limit)
→ AI score batch, filter ≥6
→ Return live data (no caching)
→ Render urgent section + account sections
→ User archives → Email removed from view
```

**History Mode:**
```
User → /briefing?date=YYYY-MM-DD
→ Check if snapshot exists for user + date
→ If exists: Return cached
→ If missing: Generate + cache permanently
→ Render historical view with date navigation
```

### Key Components
- **Backend:** Multi-account aggregation, AI scoring, inbox filtering for Inbox mode, snapshots for History
- **Frontend:** Mode toggle, account sections, email cards, date navigation (History only)
- **AI:** Batch scoring with user guidance
- **Storage:** Snapshots for History mode only (Inbox always live)

## 4. UI Design

### Inbox Mode (Default View)
```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Daily Briefing                                           │
│ [📍 Inbox] [📅 History] [⚙️ Settings]                       │
│ 14 important emails in inbox                                │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ 🔥 URGENT (3) - Needs immediate attention                   │
│                                                              │
│   🚨 Server outage - Score 10                               │
│   work@company.com • 30 mins ago                            │
│   [Reply] [Archive] [View Thread]                           │
│                                                              │
│   🚨 Contract revision - Score 9                            │
│   client@outlook.com • 1 hour ago                           │
│   [Reply] [Archive] [View Thread]                           │
│                                                              │
│ ──────────────────────────────────────────────────────────  │
│                                                              │
│ 🏢 work@company.com (Gmail)                           [8]  │
│                                                              │
│   📧 Meeting request                            Score: 8    │
│   From: Sarah Chen • 2 hours ago                            │
│   Can we sync on Q4 strategy tomorrow at 2pm?               │
│   [Reply] [Archive] [View Thread]                           │
│                                                              │
│   📧 Q4 Report                                  Score: 7    │
│   From: Finance Team • 5 hours ago                          │
│   Attached: Q4_Summary.pdf - Please review...               │
│   [Reply] [Archive] [View Thread]                           │
│                                                              │
│ ──────────────────────────────────────────────────────────  │
│                                                              │
│ 👤 personal@gmail.com (Gmail)                         [3]  │
│                                                              │
│   📧 Bank statement                             Score: 7    │
│   From: Chase Bank • 1 hour ago                             │
│   Your November statement is ready                          │
│   [Reply] [Archive] [View Thread]                           │
│                                                              │
│ ──────────────────────────────────────────────────────────  │
│                                                              │
│ ℹ️ Shows: All important inbox emails                        │
│   Updates: Archive/reply removes items                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Clean, distraction-free list of important emails
- Quick action buttons on each email card
- Archive/reply actions remove from view immediately
- Live updates as you work through emails
- Footer explains inbox behavior

### Mode Switching & Navigation

**Inbox Tab (Default):**
- URL: `/briefing` (no date parameter)
- Shows all important emails currently in inbox (any age)
- No date navigation controls visible
- Active by default on first load

**History Tab:**
- URL: `/briefing?date=YYYY-MM-DD`
- Shows date navigation: ← Nov 5 | Nov 6 | Nov 7 →
- Prev/Next buttons change date parameter
- "Today" button returns to `/briefing` (Inbox mode)

**Tab State:**
- Active tab determined by URL
- No date param → Inbox tab highlighted
- Date param present → History tab highlighted

**Archive Behavior:**
- Inbox mode: Archive removes email from inbox → disappears from briefing
- History mode: Archive doesn't affect historical snapshot

**The Simple Rule:**
> "Your briefing shows all important emails (score ≥6) currently in your inbox. Archive to remove."

No special handling for read/unread, starred/flagged, or snoozed. If it's in inbox and important, you see it.

### History Mode (Click "History" Tab)
```
┌─────────────────────────────────────────────┐
│ 📧 Daily Briefing                           │
│ [📍 Inbox] [📅 History*] [⚙️ Settings]      │
│ ← Nov 5  |  Nov 6, 2024  |  Nov 7 →         │
│ ─────────────────────────────────────────── │
│                                              │
│ 📊 Nov 6 Snapshot: 18 important emails      │
│                                              │
│ 🔥 URGENT (2) - That day's urgent items     │
│                                              │
│ [Account sections same as Inbox mode]       │
│                                              │
│ Note: Historical snapshot, no live updates  │
└─────────────────────────────────────────────┘
```

### Email Card Elements
Each email card displays:
- **Subject line** - Email subject
- **Score badge** (color-coded: red=9-10, orange=7-8, yellow=6)
- **From** - Sender name
- **Time ago** - Relative time (e.g., "2 hours ago")
- **Snippet** - First ~100 characters of email body (2 lines max)
- **Action buttons** - Three quick actions (see below)

### Quick Action Buttons
Each email card has three action buttons:

1. **[Reply]**
   - Opens compose window for that email/thread
   - Pre-populates recipient and subject with "Re:"
   - Navigates to: `/[emailAccountId]/mail?threadId=[threadId]&reply=true`
   - **Result:** Email is removed from Inbox briefing after reply is sent (when user returns to briefing)

2. **[Archive]**
   - Archives the email/thread in Gmail/Outlook
   - Immediate action (no confirmation needed)
   - **Result:** Email disappears from Inbox briefing immediately (live update)
   - Uses existing `store/archive-queue` pattern

3. **[View Thread]**
   - Opens full thread view in main email interface
   - Navigates to: `/[emailAccountId]/mail?threadId=[threadId]`
   - **Result:** Email stays in Inbox briefing (viewing doesn't remove it)
   - Useful for reading full context before deciding to archive/reply

### Urgent Section Behavior
- Shows emails with score ≥9 from all accounts
- Same action buttons as regular emails
- Emails appear in BOTH urgent section AND their account section
- Red/urgent visual styling to draw attention
- If urgent email is archived → removed from both sections

### Settings Page
- Large textarea for natural language guidance (per account)
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
- Query params: 
  * `date` (optional): YYYY-MM-DD format
- Returns: `{ accounts: [{ account, badge, emails, atLimit }] }`
- Each email has: id, threadId, subject, from, date, snippet, score (1-10)
- Filter: Only show emails with score ≥ 6
- Each account includes: `atLimit: boolean` (true if account returned 100 emails)

**Mode Detection:**
- No date param → Inbox mode
- Date param present → History mode

**Inbox Mode (no date param):**
- Fetches all emails currently in inbox (no time limit)
- Query behavior differs by provider (see Provider-Specific Queries below)
- No caching (always fresh)
- Live view updates as user archives/replies
- Maximum 100 emails per account

**Provider-Specific Queries:**

**Gmail:**
- Query: `in:inbox -in:trash -in:spam`
- Includes: All inbox tabs (Primary, Social, Promotions)
- Excludes: Trash, Spam
- Note: Snoozed emails automatically reappear in inbox when unsnoozed
- AI scoring naturally filters promotional/social content (score <6)

**Outlook:**
- Query: Inbox folder only
- Includes: Both Focused Inbox and Other
- Note: AI scoring filters less important items regardless of Focused Inbox categorization

**Limit Handling:**
- Fetch maximum 100 emails per account
- If account has 100+ emails, show warning message:
  "This account has 100+ inbox emails. Archive emails to see all important items."
- Encourages inbox hygiene (feature, not bug)

**History Mode (date=YYYY-MM-DD):**
- Fetches emails for specific calendar day (00:00 → 23:59 UTC)
- Includes all emails from that day (even if archived later)
- Snapshot logic:
  * If snapshot exists: Return cached
  * If missing: Generate, cache permanently, return
- Date validation: No future dates, max 90 days back
- Maximum 100 emails per account (same as Inbox mode)

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
- Update API route: Detect mode from date parameter presence
- Implement provider-specific inbox queries:
  * Gmail: `in:inbox -in:trash -in:spam`
  * Outlook: Inbox folder filter only
- Set maxResults to 100 per account
- Add logic to detect when account returns 100 emails (at limit)
- Keep existing date-based snapshot logic for History mode

**Phase 2: Main UI - Inbox Mode (Day 2)**
- Add mode toggle: Inbox / History / Settings tabs
- Update briefing page to default to Inbox mode (no date param)
- Update header to show email count instead of date/time window
- Add footer explanatory text
- Show warning banner when account has 100+ emails:
  "This account has 100+ inbox emails. Archive emails to see all important items."
- Update email cards to show action buttons: [Reply] [Archive] [View Thread]
- Wire up action buttons to navigate/archive correctly
- Add SWR revalidation after archive action (mutate call)
- Keep existing account sections structure

**Phase 3: History Mode (Day 3)**
- Add History tab with date navigation
- Reuse existing date-based logic (already implemented)
- Show "Snapshot" indicator in History mode
- Add "Switch to Inbox" convenience button

**Phase 4: Polish (Day 4)**
- Update empty states for both modes
- Test mode switching UX
- Verify archive/reply behavior in Inbox mode
- Performance testing (Inbox <3s, History <1s)

## 8. User Flows

**Primary Flow: Inbox Triage (Default)**
1. Click "Daily Briefing" in sidebar → Opens Inbox mode
2. Page loads (skeleton state, <3s)
3. Scan urgent section (emails with score ≥9)
4. Review account sections for all inbox emails
5. For each email, choose action:
   - **[Reply]** → Opens compose, sends reply, email disappears from briefing
   - **[Archive]** → Archives email, disappears immediately
   - **[View Thread]** → Opens full thread to read context (stays in briefing)
6. Done in 2-5 minutes
7. Come back later → See only remaining important emails (archived ones are gone)

**Historical Review Flow:**
1. User needs to check "what happened last Tuesday?"
2. Click "History" tab → Switches to History mode
3. Use date navigation: ← Nov 5 | Nov 6 | Nov 7 →
4. View that day's snapshot (cached, instant load)
5. Click "Inbox" to return to current actionable items

**Settings Flow: Customize**
1. Notice irrelevant emails in Inbox
2. Click Settings tab
3. Edit guidance textarea (per account)
4. Save (toast confirmation)
5. Refresh Inbox → See improved scoring
6. Iterate over 3-5 days until accurate

---

## 9. Edge Cases

**Inbox Mode:**
- No important emails in inbox: Empty state "All caught up! 🎉"
- Account has 100+ emails: Warning banner "This account has 100+ inbox emails. Archive emails to see all important items."
- All urgent (20+): Warning banner, suggest refining guidance
- User archives all emails: Empty state "Great work! All emails triaged."
- Account API fails: Show error for that account only, others work
- AI fails: Fallback to score=5, show warning banner

**History Mode:**
- Future date requested: Disable, show "Cannot view future" error
- Very old date (>90 days): Show "Snapshot not available" error
- No snapshot exists: Generate on first view, cache permanently

**General:**
- 0 accounts connected: Onboarding message with "Connect Account" CTA
- New user: Use default guidance, show customization tip
- Invalid/expired tokens: Auto-detect, clear tokens, show "Reconnect" button (preserves all user data)
- Token decryption fails: Same as expired tokens - graceful reconnect flow

## 10. Performance & Technical Constraints

**Performance Targets:**
- Inbox mode: <3 seconds (always fresh, no cache)
- History mode: <1 second (cached permanently)
- Email fetch: Maximum 100 emails per account, parallel, 10s timeout
- AI scoring: Batch 50 emails, ~2-3s, temp=0.3
- Snapshot storage: History mode only, past 90 days
- Query filter: Provider-specific inbox queries (Gmail: `in:inbox -in:trash -in:spam`, Outlook: Inbox folder)

**Technical Constraints:**
- 100 email limit per account prevents performance issues with AI scoring
- Users with 100+ inbox emails see warning to encourage archiving
- Limit applies to raw email fetch before AI scoring
- After AI filtering (score ≥6), typical user sees 15-30 emails total

**Known Limitations:**
- **Gmail:** Shows all inbox tabs (Primary, Social, Promotions) - AI scoring filters low-priority
- **Outlook:** Shows both Focused and Other inbox - AI scoring filters low-priority
- **Archived-but-starred/flagged:** Not shown (archive signals completion)
- **Emails in subfolders:** Not shown (only main inbox)
- **100+ email accounts:** Shows first 100, warning displayed to encourage archiving

**SWR Revalidation Strategy:**
- After archive: Call `mutate('/api/ai/briefing')` to trigger immediate refetch
- After reply: Natural revalidation occurs when user navigates back to `/briefing`
- Refetch includes: Fetch inbox emails + AI scoring (~2-3 seconds)
- No optimistic updates in v1 (keep implementation simple)
- Archived emails won't return (no longer in inbox)

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
✅ Inbox mode shows all accounts in unified inbox view (all important emails)  
✅ AI scoring 80%+ accurate  
✅ Archive/reply actions work (live updates)  
✅ <3s Inbox load, <1s History load  
✅ Both Gmail and Outlook accounts work  
✅ Zero critical bugs  

**30-Day Goals:**
- 80% daily adoption (70%+ stay in Inbox mode)
- <5% missed critical emails (score 9-10)
- <3 min avg triage time
- 60% customize guidance within first week
- History mode used <20% of time (validates Inbox-first approach)

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
- After reconnect: Fresh tokens saved, briefing regenerates automatically
- Zero data loss: All rules, labels, settings preserved
- Auto-cache invalidation: `handleLinkAccount()` clears History mode snapshots after OAuth (Inbox always fresh)

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
✅ Briefing regenerates automatically after reconnect (no manual refresh)  

---

## 14. Why Inbox-First (Design Rationale)

**Problem with Calendar Day Approach:**
- User opens briefing → Only sees emails from current calendar day
- Misses important emails from previous days still in inbox
- Mental model mismatch: Users want "what needs attention NOW" not "what arrived today"
- Less useful than Gmail Priority Inbox or Superhuman Important

**Inbox-First Benefits:**
- Natural mental model: "My email to-do list across all accounts"
- Shows all important inbox emails regardless of age
- Live updates when archiving/replying feel responsive
- Emails persist until acted upon (true to-do list behavior)
- Solves core use case: Never miss important emails in your inbox
- History mode still available for "what happened on specific day" queries

**Competitive Position:**
- Superhuman: Single account only, $30/mo
- Hey: Requires screening every sender first
- Gmail Priority: Per-account only
- **Ours: Multi-account, AI-scored, persistent to-do list** ← Unique value

**Expected Usage:**
- 80% of time: Inbox mode (actionable items)
- 20% of time: History mode (specific day lookup)

---

**END OF PRD v2.0 - Inbox-First Pivot**

*AI Agent: Use this PRD to create implementation plan. Core backend/UI exists, need to add inbox filtering (in:inbox query) and mode detection from date parameter.*

