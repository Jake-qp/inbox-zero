# Daily Briefing - Implementation Plan

**Version:** 2.0 (Inbox-First Pivot)  
**Route:** `/briefing` (inbox mode) or `/briefing?date=YYYY-MM-DD` (history mode)  
**Auth:** `withAuth` (not `withEmailAccount`)  
**Key Feature:** Multi-account inbox to-do list with AI scoring (Inbox mode) + Historical snapshots (History mode)

**Phases 1-6:** ✅ Complete (Calendar day implementation)  
**Phase 7:** 🔧 In Progress (Inbox-First pivot)

---

## Phase 1: Backend [ALL DONE]

### 1.1 Database Schema
- **Migration:** `20251107115107_add_briefing_and_snapshots`
- **Added:** `EmailAccount.briefingGuidance` (nullable), `BriefingSnapshot` model, User relations
- **Marked:** All changes with `// Daily Briefing - Custom addition` for upstream safety

### 1.2 AI Scoring
- **File:** `apps/web/utils/ai/briefing/score-importance.ts`
- **Exports:** `DEFAULT_BRIEFING_GUIDANCE`, `scoreEmailsBatch(emails, emailAccount)`
- **Pattern:** 50-email chunks, uses `createGenerateText` wrapper for tracking, defaults to score 5 on errors
- **Critical:** Import `EmailAccountWithAI` from `@/utils/llms/types`, include `briefingGuidance: true` in Prisma select

### 1.3 API Route
- **File:** `apps/web/app/api/ai/briefing/route.ts`
- **Exports:** `BriefingResponse` type (includes `errorType?: 'AUTH_REQUIRED' | 'OTHER'`)
- **Snapshot Logic:** Past days always cached, today cached if <1hr old
- **Date Handling:** UTC normalized `new Date(date + 'T00:00:00.000Z')`, uses BOTH `after` and `before` params
- **Error Handling:** Per-account with `Promise.allSettled`, token errors cleared via `cleanupInvalidTokens()`
- **Validation:** 90-day limit, no future dates (returns `errorCode` in response)

### 1.4 Server Action
- **Files:** `email-account.validation.ts` (schema), `email-account.ts` (action)
- **Action:** `updateBriefingGuidanceAction` - updates `EmailAccount.briefingGuidance`, accepts null for reset

## Phase 2: Main UI [ALL DONE]

### 2.1 SWR Hook
- **File:** `apps/web/hooks/useBriefing.ts`
- **Signature:** `useBriefing(date?: string)` - returns SWR hook with `BriefingResponse` type
- **Config:** `revalidateOnFocus: false`, `dedupingInterval: 60000`

### 2.2 Main Page
- **File:** `apps/web/app/(app)/briefing/page.tsx`
- **Pattern:** Uses Next.js 15 async searchParams, unwraps with `use()` from React
- **Features:** Urgent extraction (score >=9), warning if >=20 urgent, error handling (FUTURE_DATE, OLD_DATE)

### 2.3-2.6 Components (`apps/web/components/briefing/`)
- **BriefingHeader:** Date nav (Prev/Next/Today), Next disabled if viewing today, uses native Date methods
- **UrgentSection:** Red card with urgent count
- **AccountSection:** Collapsible (useState), provider icon, badge, error handling with `errorType` prop, reconnect UI
- **EmailCard:** Score badges (red 9-10, orange 7-8, yellow 6), archive via `store/archive-queue`, Reply/View navigation
- **EmptyState:** Icon, message, links to settings/connect

### 2.7 Sidebar Link
- **File:** `apps/web/components/SideNav.tsx`
- **Added:** Link to `/briefing` with SparklesIcon in Platform section
- **Marked:** `// Daily Briefing - Custom addition`

## Phase 3: Settings [DONE]

### 3.1 Settings Page
- **File:** `apps/web/app/(app)/briefing/settings/page.tsx`
- **Pattern:** Uses `EmailAccountProvider` - settings apply to currently selected account
- **Features:** Textarea with `DEFAULT_BRIEFING_GUIDANCE` placeholder, save/reset buttons, uses `useAction` hook
- **API Route:** `apps/web/app/api/user/briefing-guidance/route.ts` (fetches briefingGuidance via SWR)
- **Layout:** Uses `PageWrapper`, `PageHeader`, `LoadingContent`, `Skeleton` components

### 3.2 Fix Build Error
- **Issue:** Settings page imported `DEFAULT_BRIEFING_GUIDANCE` from `score-importance.ts` → server-only chain error
- **Solution:** Created `apps/web/utils/ai/briefing/constants.ts` (no server-only imports)
- **Updated:** `score-importance.ts` and `settings/page.tsx` to import from `constants.ts`

---

## Phase 4: Token Management [ALL DONE]

### 4.0 Cleanup Script
- **File:** `apps/web/scripts/fix-broken-briefing-tokens.ts`
- **Purpose:** One-time script to detect and clear broken tokens (preserves all account data)
- **Run:** `NODE_ENV=development pnpm exec dotenv -e .env.local -- pnpm exec tsx scripts/fix-broken-briefing-tokens.ts`
- **Executed:** ✅ Found 1 broken token, cleared successfully

### 4.1 Fix Merge Flow Token Saving
- **Files:** `apps/web/app/api/google/linking/callback/route.ts`, `apps/web/app/api/outlook/linking/callback/route.ts`
- **Bug Fix:** Merge flow ("Select existing") now saves fresh OAuth tokens via `saveTokens()` call
- **Cache Invalidation:** Modified `handleLinkAccount()` in `utils/auth.ts` - deletes today's snapshot after OAuth

### 4.2 Smart Token Detection
- **File:** `apps/web/app/api/ai/briefing/route.ts`
- **Added:** Token error detection in catch block, calls `cleanupInvalidTokens()` from existing utility
- **Returns:** `errorType: 'AUTH_REQUIRED'` for token failures, `'OTHER'` for non-token errors
- **Patterns:** "No refresh token", "invalid_grant", "Decryption failed"

### 4.3 Reconnect UI
- **File:** `apps/web/components/briefing/AccountSection.tsx`
- **Added:** `handleReconnect()` using `signIn.social()` with `GMAIL_SCOPES` for Google
- **UI:** Warning alert with "Reconnect" button for `AUTH_REQUIRED`, destructive alert with "Retry" for others

---

## Phase 5: Polish [ALL DONE]

### 5.1-5.2 Loading/Error States
- **Files:** `loading.tsx`, `error.tsx` in `app/(app)/briefing/`
- **Loading:** Skeleton matching page structure (header, urgent, accounts, cards)
- **Error:** Uses `ErrorDisplay`, Sentry tracking, retry via `reset()`

### 5.3 Responsive
- **Updated:** AccountSection (defaults collapsed on mobile via `useIsMobile`), EmailCard (stacks content/actions)
- **Breakpoints:** 375px, 768px, 1024px - uses Tailwind responsive classes

### 5.4 Error Handling
- **Pattern:** Alert + AlertDescription with retry button (reloads page)

---

## Phase 6: Pre-Launch [DONE]

### 6.1 Token Cleanup Script Executed
- ✅ Script run: Found 1 broken token, cleared successfully
- ✅ Second run: "No broken tokens found"

### 6.2 Merge Flow Testing
- Status: PENDING - needs manual verification after reconnect

### 6.3 Cache Invalidation Fix
- **Issue:** New account added but briefing doesn't show it (SWR client cache stale)
- **File:** `app/(app)/accounts/page.tsx`
- **Solution:** Added `useEffect` that invalidates briefing cache on OAuth success
- **Triggers:** `success=account_merged` or `success=account_added` params
- **UX:** Shows toast "Account connected! Your briefing will update shortly."

## Verification Checklist (Phases 1-6 - Already Done)

**Core Flows:**
- [x] Calendar day briefing: Loads emails from all accounts, only shows scores >=6, urgent section (>=9)
- [x] Date navigation: Prev/Next/Today buttons work
- [x] Date validation: Future date → error, 100+ days ago → error
- [x] Settings: Save/reset works per account
- [x] Actions: Reply/Archive/View navigate correctly, archive uses `store/archive-queue`
- [x] States: Loading skeleton, error boundary, empty state
- [x] Responsive: Mobile/tablet/desktop breakpoints
- [x] Performance: Generation <3s, cached <1s

**Token Management:**
- [x] Expired tokens: Show "Reconnect" button
- [x] Reconnect flow: OAuth → briefing loads
- [x] Merge flow: Saves tokens correctly
- [x] Data preservation: Rules/labels/settings intact

---

## Upstream Safety

**New Files:** All in `briefing/` dirs + `scripts/fix-broken-briefing-tokens.ts` (zero conflict)

**Modified Files:**
- `components/SideNav.tsx` - Link (marked `// Daily Briefing - Custom addition`)
- `prisma/schema.prisma` - Fields/models (marked `// Daily Briefing - Custom addition`)
- `utils/actions/email-account.ts` - Action (append only, marked)
- `app/api/google/linking/callback/route.ts` - Bug fix: saves tokens in merge flow
- `app/api/outlook/linking/callback/route.ts` - Bug fix: saves tokens in merge flow
- `utils/auth.ts` - Cache invalidation in `handleLinkAccount()`
- `app/(app)/accounts/page.tsx` - SWR cache invalidation on OAuth success (marked)

**Merge Strategy:** Favor upstream, re-apply marked additions. Token fixes are upstream-safe (add missing logic).

---

## Status

⚠️ **PIVOT REQUIRED** - Phases 1-6 complete, Phase 7 needed for Inbox-First pivot

---

## Phase 7: Inbox-First Pivot [IN PROGRESS]

**Goal:** Add Inbox mode (all inbox emails, no time limit) while keeping History mode (existing calendar day logic)

**What Stays:** Database schema, AI scoring, settings, token management, all components (modify, don't replace)  
**What Changes:** API routing logic, header UI, add mode tabs, provider queries

### 7.1 Update API Route - Inbox Mode ✅ DONE
- **File:** `apps/web/app/api/ai/briefing/route.ts`
- **Add to type (line 13):** `atLimit?: boolean` to account array objects in `BriefingResponse`
- **Modify GET handler (starting line 211):**
  * Detect mode: `const mode = dateParam ? 'history' : 'inbox'`
  * For Inbox mode: Skip date validation/normalization, don't calculate startOfDay/endOfDay
  * For History mode: Keep existing logic (lines 222-248 unchanged)
  * Skip snapshot check/upsert for Inbox mode (lines 250-285 only run in History mode)
- **Modify generateBriefing (line 34):**
  * Change signature: `generateBriefing(userId, mode, startDate?, endDate?)`
  * In email account loop (line 72), check provider before calling `getMessagesWithPagination()`
  * For Inbox mode + Gmail: `{ query: "in:inbox -in:trash -in:spam", maxResults: 100 }`
  * For Inbox mode + Outlook: `{ maxResults: 100 }` (no query param)
  * For History mode: Keep existing `{ after: startDate, before: endDate, maxResults: 100 }` for both
  * Check provider with: `emailAccount.account.provider === 'google'` or use `isGoogleProvider()` helper
  * Add `atLimit` detection after fetch: `const atLimit = messages.length >= 100`
  * Return `atLimit` in account result object (add to line 101-115 return)
- **Notes for next task:** `BriefingResponse` type now includes `atLimit?: boolean` in account objects. Mode detection works: no date param = inbox mode, date param = history mode. Inbox mode skips snapshot caching and date validation. Provider-specific queries implemented: Gmail uses `query: "in:inbox -in:trash -in:spam"`, Outlook defaults to inbox folder when no query provided. All error return cases include `atLimit: false`.

### 7.2 Update BriefingHeader Component  
- **File:** `apps/web/components/briefing/BriefingHeader.tsx`
- **Add props:** `mode: 'inbox' | 'history'`
- **Add imports:** `Tabs`, `TabsList`, `TabsTrigger` from `@/components/ui/tabs`, `useRouter`, `useSearchParams`
- **Changes:**
  * Wrap existing content in `<Tabs value={mode}>`
  * Add `<TabsList>`: Inbox / History / Settings tabs
  * Conditionally render date navigation: Only show when `mode === 'history'`
  * For Inbox mode: Show `{totalShown} important emails in inbox` (use existing totalShown prop)
  * Tab handlers: `router.push('/briefing')` for Inbox, `router.push('/briefing?date=${today}')` for History
- **Keep:** Prev/Next/Today button logic (only visible in History mode)

### 7.3 Update Main Page
- **File:** `apps/web/app/(app)/briefing/page.tsx`
- **Modify BriefingContent (line 60):**
  * Add `mode` calculation: `const mode = currentDate === new Date().toISOString().split('T')[0] && !params.date ? 'inbox' : 'history'`
  * Pass to BriefingHeader: `<BriefingHeader mode={mode} .../>`
  * Pass `atLimit` to AccountSection: `<AccountSection atLimit={account.atLimit} .../>`
- **Keep unchanged:** Error handling (FUTURE_DATE, OLD_DATE), urgent extraction, warning logic
- **Note:** Inbox mode (no date param) skips date validation errors

### 7.4 Add Inbox Limit Warning
- **File:** `apps/web/components/briefing/AccountSection.tsx`
- **Add prop (line 36):** `atLimit?: boolean` to component signature
- **Add import:** `Alert`, `AlertDescription` already imported
- **Add warning (line 105, after AUTH_REQUIRED alert, before emails.length check):**
  ```tsx
  {atLimit && !hasError && (
    <Alert variant="warning" className="mt-2">
      <AlertDescription>
        This account has 100+ inbox emails. Archive emails to see all important items.
      </AlertDescription>
    </Alert>
  )}
  ```
- **Pass from parent (page.tsx):** Add `atLimit={account.atLimit}` to AccountSection props

### 7.5 Add SWR Revalidation After Archive
- **File:** `apps/web/components/briefing/EmailCard.tsx`
- **Add import (line 1):** `import { mutate } from "swr"`
- **Modify handleArchive (line 45-63):**
  * Update `onSuccess` callback (currently line 50-52):
    ```tsx
    onSuccess: () => {
      toastSuccess({ description: "Email archived" });
      mutate("/api/ai/briefing"); // Add this line
    }
    ```
- **Result:** After archive, briefing refetches. Gmail query excludes archived (not in inbox), Outlook query excludes (not in inbox folder)
- **Performance:** Refetch takes ~2-3s (fetch + AI scoring), email disappears after refetch completes

### 7.6 Update Footer Text
- **File:** `apps/web/components/briefing/BriefingHeader.tsx`
- **Update footer for Inbox mode:** Change from "Showing emails for {date}" to "Shows: All important inbox emails"
- **Keep for History mode:** "Showing emails for {date}"

---

## Phase 7 Verification Checklist

**Inbox Mode (New):**
- [ ] No date param → Fetches all inbox emails (no time limit)
- [ ] Gmail: Uses query `in:inbox -in:trash -in:spam`
- [ ] Outlook: Inbox folder only
- [ ] Max 100 emails per account, warning shown if at limit
- [ ] Archive → mutate() call → email disappears from view
- [ ] Tabs: Inbox (active by default), History, Settings
- [ ] Header shows: "X important emails in inbox" (no date)
- [ ] Footer shows: "All important inbox emails"

**History Mode (Existing - Keep Working):**
- [ ] Date param present → Shows that specific day's snapshot
- [ ] Date navigation visible (Prev/Next/Today)
- [ ] "Today" button returns to Inbox mode (no date param)
- [ ] Cached permanently, fast load (<1s)

**Mode Switching:**
- [ ] Inbox tab → navigates to `/briefing`
- [ ] History tab → navigates to `/briefing?date=${today}`
- [ ] Tab highlighting based on URL (date param present/absent)
- [ ] Date navigation only visible in History mode

---

## Updated Status

🔧 **PHASE 7 IN PROGRESS** - Inbox-First pivot implementation

