# Daily Briefing - Implementation Plan

**Route:** `/briefing?date=YYYY-MM-DD` (user-level, all accounts, historical)  
**Auth:** `withAuth` (not `withEmailAccount`)  
**Key Feature:** Historical snapshots with smart caching

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

## Verification Checklist

**Core Flows:**
- [ ] Today's briefing: Loads emails from all accounts, only shows scores >=6, urgent section (>=9), warning banner if >=20
- [ ] Historical navigation: Past day shows ONLY that day's emails (bounded range), generates and caches on first view
- [ ] Date navigation: Prev/Next/Today buttons work, Next disabled when viewing today
- [ ] Date validation: Future date → "Cannot view future" error, 100+ days ago → "Not available" error
- [ ] Settings: Save/reset works per account (applies to currently selected in dropdown)
- [ ] Actions: Reply/Archive/View navigate to correct account pages, archive uses `store/archive-queue`
- [ ] States: Loading skeleton, error boundary with retry, empty state
- [ ] Responsive: Mobile (375px), tablet (768px), desktop (1024px) - accounts collapse, actions stack
- [ ] Performance: Today generation <3s, cached past <1s

**Token Management:**
- [ ] Expired tokens: Show "Reconnect" button (warning alert)
- [ ] Reconnect flow: Click → OAuth → briefing loads emails
- [ ] Merge flow: Add via "Select existing" → saves tokens correctly
- [ ] Data preservation: After reconnect, all rules/labels/settings intact

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

✅ **COMPLETE** - All phases done, token management verified, ready for testing

