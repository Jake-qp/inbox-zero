"use client";

import { use } from "react";
import { useBriefing } from "@/hooks/useBriefing";
import { LoadingContent } from "@/components/LoadingContent";
import { PageWrapper } from "@/components/PageWrapper";
import { AlertError } from "@/components/Alert";
import type { BriefingResponse } from "@/app/api/ai/briefing/route";
import { BriefingHeader } from "@/components/briefing/BriefingHeader";
import { UrgentSection } from "@/components/briefing/UrgentSection";
import { AccountSection } from "@/components/briefing/AccountSection";
import { EmptyState } from "@/components/briefing/EmptyState";

export default function BriefingPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = use(props.searchParams);
  const currentDate = params.date || new Date().toISOString().split("T")[0];

  const { data, error, isLoading } = useBriefing(params.date);

  // Handle API errors
  const apiError = error as
    | (Error & { info?: { errorCode?: string; error?: string } })
    | undefined;
  if (apiError?.info?.errorCode === "FUTURE_DATE") {
    return (
      <PageWrapper>
        <AlertError
          title="Cannot view future dates"
          description="You can only view briefings for today or past dates."
        />
      </PageWrapper>
    );
  }
  if (apiError?.info?.errorCode === "OLD_DATE") {
    return (
      <PageWrapper>
        <AlertError
          title="Briefing not available"
          description="Briefing not available for dates older than 90 days."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LoadingContent loading={isLoading} error={error}>
        {data ? (
          <BriefingContent data={data} currentDate={currentDate} />
        ) : (
          <EmptyState message="No briefing data available." />
        )}
      </LoadingContent>
    </PageWrapper>
  );
}

function BriefingContent({
  data,
  currentDate,
}: {
  data: BriefingResponse;
  currentDate: string;
}) {
  // Extract urgent emails (score >= 9) from all accounts
  const urgentEmails = data.accounts.flatMap((account) =>
    account.emails
      .filter((email) => email.score >= 9)
      .map((email) => ({
        ...email,
        accountEmail: account.account.email,
        accountId: account.account.id,
      })),
  );

  // Show warning if urgent >= 20
  const showUrgentWarning = urgentEmails.length >= 20;

  // Check if no accounts
  const hasAccounts = data.accounts.length > 0;

  if (!hasAccounts) {
    return <EmptyState message="Connect an email account to get started" />;
  }

  return (
    <div className="space-y-6">
      <BriefingHeader
        totalScanned={data.totalScanned}
        totalShown={data.totalShown}
        currentDate={currentDate}
      />

      {showUrgentWarning && (
        <AlertError
          title="High Priority Alert"
          description={`You have ${urgentEmails.length} urgent emails requiring immediate attention.`}
        />
      )}

      {urgentEmails.length > 0 && <UrgentSection emails={urgentEmails} />}

      {data.accounts.map((account) => (
        <AccountSection
          key={account.account.id}
          account={account.account}
          emails={account.emails}
          badge={account.badge}
          hasError={account.hasError}
          errorType={account.errorType}
        />
      ))}

      {data.totalShown === 0 && (
        <EmptyState message="All clear! No important emails today." />
      )}
    </div>
  );
}
