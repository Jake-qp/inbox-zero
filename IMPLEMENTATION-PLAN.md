# Daily Briefing - Implementation Plan

**Source:** PRD-DAILY-BRIEFING.md  
**Route:** `/briefing?date=YYYY-MM-DD` (user-level, all accounts, historical support)  
**Auth:** `withAuth` (not `withEmailAccount`)  
**Key Feature:** Historical snapshots - users can review past days' briefings

## Instructions for AI Agents
- Execute tasks sequentially within each phase
- After completing each task, update this plan: mark task as DONE, note any issues
- Study reference files before implementing
- Follow existing patterns exactly
- Keep code simple and readable
- DO NOT modify or break any existing code - only create new files or append to existing files as specified

---

## Phase 1: Backend

### Task 1.1: Database Schema [DONE]

**Do:**
1. Add to `apps/web/prisma/schema.prisma` in `EmailAccount` model:
   ```prisma
   briefingGuidance String? @db.Text
   ```

2. Add new model after User model:
   ```prisma
   model BriefingSnapshot {
     id        String   @id @default(cuid())
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     
     userId String
     user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
     
     date DateTime  // Start of day (YYYY-MM-DD 00:00:00)
     data Json      // Cached BriefingResponse as JSON
     
     @@unique([userId, date])
     @@index([userId, date])
   }
   ```

3. Add to User model relations: `briefingSnapshots BriefingSnapshot[]`

4. Run: `pnpm prisma migrate dev --name add_briefing_and_snapshots`

**Test:** Migration applies cleanly

**Update plan:** Mark DONE, note any issues

**Notes for next task:**
- Migration `20251107115107_add_briefing_and_snapshots` applied successfully
- All schema changes marked with `// Daily Briefing - Custom addition` comments for upstream safety
- Prisma Client regenerated - BriefingSnapshot model available in code
- EmailAccount.briefingGuidance field is nullable (String?) - defaults to null
- BriefingSnapshot.date stores DateTime (will be normalized to UTC midnight in API route)
- BriefingSnapshot.data uses Json type (Prisma auto-serializes/deserializes)

---

### Task 1.2: AI Scoring [DONE]

**Create:** `apps/web/utils/ai/briefing/score-importance.ts`

**Imports:**
```typescript
import type { ParsedMessage } from '@/utils/types';
import type { EmailAccountWithAI } from '@/utils/llms/types';
import { createGenerateText } from '@/utils/llms';
import { getModel } from '@/utils/llms/model';
import { createScopedLogger } from '@/utils/logger';
```

**Export 1: DEFAULT_BRIEFING_GUIDANCE**
```typescript
export const DEFAULT_BRIEFING_GUIDANCE = `
Important emails are:
- From people I know personally (not companies)
- Direct questions or requests to me
- Meeting invites needing a response
- Messages in active conversations
- Time-sensitive (mentions today, urgent, deadline)

Not important:
- Newsletters, receipts, automated, marketing, social
`.trim();
```

**Export 2: scoreEmailsBatch function**
```typescript
export async function scoreEmailsBatch(
  emails: ParsedMessage[],
  emailAccount: EmailAccountWithAI
): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();
  
  const logger = createScopedLogger('briefing');
  const guidance = emailAccount.briefingGuidance || DEFAULT_BRIEFING_GUIDANCE;
  
  // Batch in chunks of 50 to avoid token limits
  const CHUNK_SIZE = 50;
  const allScores = new Map<string, number>();
  
  // Create wrapped generateText for usage tracking
  const modelOptions = getModel(emailAccount.user);
  const generateText = createGenerateText({
    userEmail: emailAccount.email,
    label: 'Score briefing emails',
    modelOptions
  });
  
  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const emailList = chunk.map((e, idx) => 
      `${idx + 1}. From: ${e.headers.from}\n   Subject: ${e.headers.subject}\n   Preview: ${e.snippet?.slice(0, 150) || ''}`
    ).join('\n\n');
    
    const prompt = `You are scoring emails for a daily briefing.

User context: ${emailAccount.about || 'None'}

User's guidance:
${guidance}

Score these ${chunk.length} emails 1-10:
- 9-10: Critical/urgent, must see today
- 7-8: Important, should see soon
- 5-6: Relevant but not time-sensitive
- 3-4: Low priority
- 1-2: Not important

Emails:
${emailList}

Return format (one line per email, no explanation):
1: [score]
2: [score]
...`;

    try {
      const { text } = await generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.3
      });
      
      // Parse "1: 8\n2: 5" format
      text.trim().split('\n').forEach((line, idx) => {
        const match = line.match(/^\s*\d+\s*:\s*(\d+)/);
        if (match && chunk[idx]) {
          allScores.set(chunk[idx].id, Math.max(1, Math.min(10, parseInt(match[1]))));
        }
      });
    } catch (error) {
      logger.error('AI scoring failed for chunk', { error, chunkSize: chunk.length });
      // Default to 5 for this chunk
      chunk.forEach(e => allScores.set(e.id, 5));
    }
  }
  
  // Ensure all emails have scores
  emails.forEach(e => { if (!allScores.has(e.id)) allScores.set(e.id, 5); });
  
  return allScores;
}
```

**Key:** 
- Process in 50-email chunks to avoid token limits and costs
- Use `createGenerateText` wrapper (not direct import from 'ai') for usage tracking
- Import EmailAccountWithAI from `@/utils/llms/types` (not user/get)

**Reference:** 
- `apps/web/utils/ai/digest/summarize-email-for-digest.ts` - AI patterns
- `apps/web/utils/ai/reply/reply-context-collector.ts` - createGenerateText usage

**Update plan:** Mark DONE

**Notes for next task:**
- File created: `apps/web/utils/ai/briefing/score-importance.ts`
- Function accepts `EmailAccountWithAI & { briefingGuidance?: string | null }` to support accessing briefingGuidance field
- When fetching emailAccount in API route (Task 1.3), include `briefingGuidance: true` in Prisma select
- Function processes emails in chunks of 50, defaults to score 5 on errors
- Returns Map<emailId, score> where scores are clamped to 1-10 range
- Uses `createGenerateText` wrapper for proper usage tracking

---

### Task 1.3: API Route with Snapshots [DONE]

**Create:** `apps/web/app/api/ai/briefing/route.ts`

**Do:**
1. Import: `NextResponse`, `withAuth`, `prisma`, `createEmailProvider`, `scoreEmailsBatch`, `createScopedLogger`, `z` from zod
2. Validate date param:
   ```typescript
   const dateParam = searchParams.get('date');
   const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
   const { data: validDate } = dateSchema.safeParse(dateParam);
   const targetDate = validDate || new Date().toISOString().split('T')[0];
   ```
3. Validate date constraints:
   - If date > today: Return `NextResponse.json({ error: "Cannot view future dates", errorCode: "FUTURE_DATE" }, { status: 400 })`
   - If date > 90 days ago: Return `NextResponse.json({ error: "Snapshot not available for dates older than 90 days", errorCode: "OLD_DATE" }, { status: 400 })`
4. Calculate date range (UTC normalized):
   ```typescript
   const startOfDay = new Date(targetDate + 'T00:00:00.000Z');  // Force UTC midnight
   const endOfDay = new Date(targetDate + 'T23:59:59.999Z');   // Force UTC end of day
   ```
5. Check snapshot:
   ```typescript
   const snapshot = await prisma.briefingSnapshot.findUnique({
     where: { userId_date: { userId, date: startOfDay } }
   });
   ```
6. Return cached if valid:
   - If past day AND snapshot exists: Return `NextResponse.json(snapshot.data)` (Prisma Json type auto-parses)
   - If today AND snapshot exists AND `Date.now() - snapshot.updatedAt.getTime() < 3600000`: Return `NextResponse.json(snapshot.data)`
7. Generate if needed:
   - Fetch emails: `getMessagesWithPagination({ after: startOfDay, before: endOfDay, maxResults: 100 })`
   - Score, filter (>=6), sort
   - Build BriefingResponse object
   - Upsert snapshot: `prisma.briefingSnapshot.upsert({ where: { userId_date: { userId, date: startOfDay } }, create: { userId, date: startOfDay, data: briefingResponse }, update: { data: briefingResponse, updatedAt: new Date() } })`
   - Return `NextResponse.json(briefingResponse)`
8. Export BriefingResponse type

**Critical:**
- Use BOTH `after` AND `before` for date range (past days need bounded range)
- Date formatting: Use native `new Date().toISOString().split('T')[0]` (no external libs)
- UTC normalization: MUST use `new Date(targetDate + 'T00:00:00.000Z')` to force UTC (prevents timezone duplicates)
- Prisma Json type: No manual parsing needed - `snapshot.data` returns as object, store as object
- Snapshot storage: `data: briefingResponseObject` (Prisma auto-serializes to JSONB)

**Reference:** `apps/web/app/api/user/email-accounts/route.ts`

**Update plan:** Mark DONE

**Notes for next task:**
- File created: `apps/web/app/api/ai/briefing/route.ts`
- API route uses `withAuth` middleware (not `withEmailAccount`) - accesses `request.auth.userId`
- BriefingResponse type exported for use in frontend hooks and components
- Route handles date validation, snapshot caching, and multi-account email fetching/scoring
- Accounts processed in parallel with `Promise.allSettled` - errors handled per account with `hasError` flag
- Snapshot logic: past days always cached, today cached if <1hr old, otherwise regenerates
- Date range uses both `after` and `before` parameters for bounded queries
- UTC normalization prevents timezone issues by forcing UTC midnight/end-of-day

---

### Task 1.4: Server Action [ ]

**Update:** `apps/web/utils/actions/email-account.validation.ts`
- Add: `updateBriefingGuidanceBody` Zod schema

**Update:** `apps/web/utils/actions/email-account.ts`
- Add: `updateBriefingGuidanceAction` 
- Updates `EmailAccount.briefingGuidance`

**Reference:** Existing actions in same files

**Test:** Action updates database

**Update plan:** Mark DONE

## Phase 2: Main UI

### Task 2.1: SWR Hook [ ]

**Create:** `apps/web/hooks/useBriefing.ts`

**Implementation:**
```typescript
import useSWR from 'swr';
import type { BriefingResponse } from '@/app/api/ai/briefing/route';

export function useBriefing(date?: string) {
  const url = date ? `/api/ai/briefing?date=${date}` : '/api/ai/briefing';
  return useSWR<BriefingResponse>(url, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
```

**Reference:** `apps/web/hooks/useThreads.ts`

**Update plan:** Mark DONE

---

### Task 2.2: Main Page [ ]

**Create:** `apps/web/app/(app)/briefing/page.tsx`

**Do:**
- Accept searchParams: `Promise<{ date?: string }>` (Next.js 15 pattern)
- Unwrap with `use()` from React: `const params = use(searchParams)`
- Pass date to `useBriefing(params.date)` hook
- Determine currentDate: `params.date || new Date().toISOString().split('T')[0]`
- Extract urgent emails (score >= 9) from all accounts
- Show warning Alert if urgent >= 20
- Render: Header (pass currentDate) → Urgent → Accounts → Empty
- Handle API errors (check error.info.errorCode):
  * `errorCode: "FUTURE_DATE"` → Show Alert "Cannot view future dates"
  * `errorCode: "OLD_DATE"` → Show Alert "Briefing not available for dates older than 90 days"
- If no accounts: EmptyState with "Connect account" message

**Reference:** `apps/web/app/(app)/[emailAccountId]/mail/page.tsx`

**Update plan:** Mark DONE

---

### Task 2.3-2.6: Components [ ]

**Create 5 components in `apps/web/components/briefing/`:**

**1. BriefingHeader.tsx**
- Props: `totalScanned?: number`, `totalShown?: number`, `currentDate: string`
- Display: Title, formatted date, stats, settings link
- Date navigator:
  * Previous: Subtract 1 day from currentDate, navigate to `/briefing?date=${YYYY-MM-DD}`
  * Next: Add 1 day to currentDate, navigate to `/briefing?date=${YYYY-MM-DD}`
  * Next disabled if: `currentDate >= new Date().toISOString().split('T')[0]`
  * "Today" button → `/briefing` (no date param, always enabled)
- Use `useRouter().push()` for navigation
- Date math: Native JS Date methods (add/subtract days, format with toISOString)

**2. UrgentSection.tsx**
- Props: `emails: Array<ParsedMessage & { score, accountEmail, accountId }>`
- Display: Red Card, "URGENT ({count})", map to EmailCard components

**3. AccountSection.tsx**
- Props: Match BriefingResponse type structure:
  * `account: { id: string; email: string; provider: string; name: string | null; image: string | null }`
  * `emails: Array<ParsedMessage & { score: number }>`
  * `badge: { count: number; hasUrgent: boolean }`
  * `hasError?: boolean`
- Features: Collapsible (useState), provider icon, email count badge
- If hasError: Show Alert with "Failed to load" message
- Reference: `components/AccountSwitcher.tsx` for provider icons

**4. EmailCard.tsx**
- Props: `email: ParsedMessage & { score }`, `accountId: string`
- Display: Score badge (red 9-10, orange 7-8, yellow 6), subject, from, time ago, snippet (2 lines)
- Time formatting: Use `formatShortDate()` from `@/utils/date` or find existing time utility
- From parsing: `email.headers.from` (extract name if present)
- Actions: 
  * Reply → `router.push(\`/${accountId}/mail?threadId=${email.threadId}&reply=true\`)`
  * Archive → Search codebase for "archiveThread" action or use inline archive (agents decide based on existing pattern)
  * View → `router.push(\`/${accountId}/mail?threadId=${email.threadId}\`)`
- Reference: `components/email-list/EmailListItem.tsx`

**5. EmptyState.tsx**
- Props: `message?: string` (default: "All clear! No important emails today.")
- Display: Icon, message, link to settings, link to mail inbox
- If no accounts: "Connect an email account to get started"

**Update plan:** Mark DONE after all 5 created

---

### Task 2.7: Sidebar Link [ ]

**Find sidebar navigation:**
- Search codebase for "app-sidebar" component
- Or check `app/(app)/layout.tsx`
- Or look in `components/` for sidebar/nav files

**Add (mark with comment):**
```typescript
// Daily Briefing - Custom addition
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link href="/briefing">
      <Sparkles />
      <span>Daily Briefing</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Position:** Near existing "Mail" or "Inbox" link

**Update plan:** Mark DONE

---

## Phase 3: Settings

### Task 3.1: Settings Page [ ]

**Create:** `apps/web/app/(app)/briefing/settings/page.tsx`

**Important:** This route works because:
- User arrives via sidebar settings link
- EmailAccountProvider reads active account from sidebar dropdown
- Settings apply to whichever account is currently selected
- User switches account → settings update for that account

**Implementation:**
```typescript
"use client";

import { useState } from 'react';
import { useAccount } from '@/providers/EmailAccountProvider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { updateBriefingGuidanceAction } from '@/utils/actions/email-account';
import { toastSuccess } from '@/components/Toast';
import { DEFAULT_BRIEFING_GUIDANCE } from '@/utils/ai/briefing/score-importance';

export default function BriefingSettings() {
  const { emailAccount } = useAccount();
  const [guidance, setGuidance] = useState(emailAccount?.briefingGuidance || '');
  
  const handleSave = async () => {
    await updateBriefingGuidanceAction({ briefingGuidance: guidance });
    toastSuccess({ description: 'Saved! Next briefing will use this guidance.' });
  };
  
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Briefing Settings</h1>
        <p className="text-muted-foreground">
          Customize AI scoring for {emailAccount?.email}
        </p>
      </div>
      
      <Textarea
        value={guidance}
        onChange={e => setGuidance(e.target.value)}
        placeholder={DEFAULT_BRIEFING_GUIDANCE}
        rows={15}
      />
      
      <div className="flex gap-2">
        <Button onClick={handleSave}>Save Changes</Button>
        <Button variant="outline" onClick={() => setGuidance('')}>Reset to Default</Button>
      </div>
      
      <Card className="p-4 bg-muted">
        <h3 className="font-semibold mb-2">Tips</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Be specific: "Emails from @client.com are priority"</li>
          <li>Define noise: "Newsletters, receipts under $100"</li>
          <li>Use examples: "Like yesterday's email from Sarah"</li>
        </ul>
      </Card>
    </div>
  );
}
```

**Reference:** `apps/web/app/(app)/[emailAccountId]/settings/` pages

**Update plan:** Mark DONE

---

## Phase 4: Polish

### Task 4.1-4.2: States [ ]

**Create:**
- `app/(app)/briefing/loading.tsx` - Skeleton
- `app/(app)/briefing/error.tsx` - Error with retry

**Reference:** Other loading/error files in app

**Update plan:** Mark DONE

---

### Task 4.3: Responsive [ ]

**Update:** AccountSection, EmailCard components
- Mobile: Collapse accounts, stack actions
- Use `useIsMobile` hook

**Test:** 375px, 768px, 1024px widths

**Update plan:** Mark DONE

---

### Task 4.4: Error Handling [ ]

**Update:** AccountSection component (add hasError prop handling)

**Add to component:**
```typescript
{hasError && (
  <Alert variant="destructive" className="mt-2">
    <AlertDescription>
      Failed to load emails for this account. 
      <Button variant="link" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Update plan:** Mark DONE

## Final Verification

**After all tasks complete, test end-to-end:**
- [ ] Today's briefing loads, shows emails from all 4 accounts
- [ ] Navigate to previous day (Nov 5) → shows ONLY Nov 5 emails (not Nov 5+6+7)
- [ ] Navigate to past day never viewed → generates and caches instantly next time
- [ ] Navigate back to today → fresh data (regenerates if >1hr old)
- [ ] Previous/Next buttons work correctly
- [ ] "Today" button jumps to current day from any date
- [ ] Next button disabled when viewing today
- [ ] Try future date URL manually → shows error "Cannot view future"
- [ ] Try 100-day-old date → shows error "Not available"
- [ ] Invalid date format → shows error or defaults to today
- [ ] Only scores >=6 shown, urgent section shows >=9
- [ ] Settings save/reset works per account
- [ ] Empty/loading/error states work
- [ ] Reply/Archive/View navigate to correct account pages
- [ ] 20+ urgent shows warning banner
- [ ] Mobile responsive at 375px
- [ ] Performance: Today generation <3s, cached past <1s
- [ ] No TypeScript/linter errors

---

## Upstream Safety

**New files (zero conflict):** All in `briefing/` directories  
**Modified files:** Sidebar nav, schema.prisma, email-account actions (append only, mark with comments)  
**Merge strategy:** Favor upstream, re-apply additions at end

---

## Success Criteria

Feature DONE when all tasks marked DONE, tests pass, works with 4 accounts, no errors.

