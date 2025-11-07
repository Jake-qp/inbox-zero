"use client";

import { use, useState } from "react";
import { useBriefing } from "@/hooks/useBriefing";
import { LoadingContent } from "@/components/LoadingContent";
import { PageWrapper } from "@/components/PageWrapper";
import { AlertError } from "@/components/Alert";
import type { BriefingResponse } from "@/app/api/ai/briefing/route";
import type { ParsedMessage } from "@/utils/types";
import { BriefingHeader } from "@/components/briefing/BriefingHeader";
import { UrgentSection } from "@/components/briefing/UrgentSection";
import { AccountSection } from "@/components/briefing/AccountSection";
import { EmptyState } from "@/components/briefing/EmptyState";
import { BriefingLoading } from "@/components/briefing/BriefingLoading";
import { BriefingEmailModal } from "@/components/briefing/BriefingEmailModal";

export default function BriefingPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = use(props.searchParams);
  const currentDate = params.date || new Date().toISOString().split("T")[0];

  const { data, error, isLoading, refresh } = useBriefing(params.date);

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
      <LoadingContent
        loading={isLoading}
        error={error}
        loadingComponent={<BriefingLoading />}
      >
        {data ? (
          <BriefingContent
            data={data}
            currentDate={currentDate}
            params={params}
            refresh={refresh}
            isRefreshing={isLoading}
          />
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
  params,
  refresh,
  isRefreshing,
}: {
  data: BriefingResponse;
  currentDate: string;
  params: { date?: string };
  refresh: () => void;
  isRefreshing: boolean;
}) {
  // Modal state
  const [selectedEmail, setSelectedEmail] = useState<{
    email: ParsedMessage & { score: number };
    accountId: string;
    accountEmail: string;
    accountProvider: string;
    index: number;
  } | null>(null);

  // Calculate mode: inbox if no date param, history if date param exists
  const mode =
    currentDate === new Date().toISOString().split("T")[0] && !params.date
      ? "inbox"
      : "history";

  // Extract urgent emails (score >= 9) from all accounts
  const urgentEmails = data.accounts.flatMap((account) =>
    account.emails
      .filter((email) => email.score >= 9)
      .map((email) => ({
        ...email,
        accountEmail: account.account.email,
        accountId: account.account.id,
        accountProvider: account.account.provider,
      })),
  );

  // Flatten all emails for navigation
  const allEmails = data.accounts.flatMap((account) =>
    account.emails.map((email) => ({
      email,
      accountId: account.account.id,
      accountEmail: account.account.email,
      accountProvider: account.account.provider,
    })),
  );

  const handleViewEmail = (
    email: ParsedMessage & { score: number },
    accountId: string,
    accountEmail: string,
    accountProvider: string,
  ) => {
    const index = allEmails.findIndex((e) => e.email.id === email.id);
    setSelectedEmail({
      email,
      accountId,
      accountEmail,
      accountProvider,
      index,
    });
  };

  const handleNext = () => {
    if (!selectedEmail || selectedEmail.index >= allEmails.length - 1) return;
    const nextEmail = allEmails[selectedEmail.index + 1];
    setSelectedEmail({
      email: nextEmail.email,
      accountId: nextEmail.accountId,
      accountEmail: nextEmail.accountEmail,
      accountProvider: nextEmail.accountProvider,
      index: selectedEmail.index + 1,
    });
  };

  const handlePrevious = () => {
    if (!selectedEmail || selectedEmail.index <= 0) return;
    const prevEmail = allEmails[selectedEmail.index - 1];
    setSelectedEmail({
      email: prevEmail.email,
      accountId: prevEmail.accountId,
      accountEmail: prevEmail.accountEmail,
      accountProvider: prevEmail.accountProvider,
      index: selectedEmail.index - 1,
    });
  };

  // Show warning if urgent >= 20
  const showUrgentWarning = urgentEmails.length >= 20;

  // Check if no accounts
  const hasAccounts = data.accounts.length > 0;

  if (!hasAccounts) {
    return <EmptyState message="Connect an email account to get started" />;
  }

  return (
    <div className="space-y-4">
      <BriefingHeader
        totalScanned={data.totalScanned}
        totalShown={data.totalShown}
        currentDate={currentDate}
        mode={mode}
        refresh={refresh}
        isRefreshing={isRefreshing}
      />

      {showUrgentWarning && (
        <AlertError
          title="High Priority Alert"
          description={`You have ${urgentEmails.length} urgent emails requiring immediate attention.`}
        />
      )}

      {urgentEmails.length > 0 && (
        <UrgentSection emails={urgentEmails} onViewEmail={handleViewEmail} />
      )}

      <div className="space-y-3">
        {data.accounts.map((account) => (
          <AccountSection
            key={account.account.id}
            account={account.account}
            emails={account.emails}
            badge={account.badge}
            hasError={account.hasError}
            errorType={account.errorType}
            atLimit={account.atLimit}
            onViewEmail={handleViewEmail}
          />
        ))}
      </div>

      {data.totalShown === 0 && (
        <EmptyState message="All clear! No important emails today." />
      )}

      {/* Email Viewer Modal */}
      <BriefingEmailModal
        email={selectedEmail?.email || null}
        accountId={selectedEmail?.accountId || ""}
        accountEmail={selectedEmail?.accountEmail || ""}
        accountProvider={selectedEmail?.accountProvider || ""}
        onClose={() => setSelectedEmail(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        hasNext={
          selectedEmail ? selectedEmail.index < allEmails.length - 1 : false
        }
        hasPrevious={selectedEmail ? selectedEmail.index > 0 : false}
      />
    </div>
  );
}
