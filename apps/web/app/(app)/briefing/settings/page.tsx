"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/providers/EmailAccountProvider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateBriefingGuidanceAction } from "@/utils/actions/email-account";
import { toastSuccess, toastError } from "@/components/Toast";
import { DEFAULT_BRIEFING_GUIDANCE } from "@/utils/ai/briefing/score-importance";
import { useAction } from "next-safe-action/hooks";
import { PageWrapper } from "@/components/PageWrapper";
import { PageHeader } from "@/components/PageHeader";
import { LoadingContent } from "@/components/LoadingContent";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";

export default function BriefingSettings() {
  const {
    emailAccount,
    emailAccountId,
    isLoading: accountLoading,
  } = useAccount();
  const [guidance, setGuidance] = useState("");

  // Fetch briefing guidance
  const {
    data: guidanceData,
    isLoading: guidanceLoading,
    mutate: mutateGuidance,
  } = useSWR<{
    briefingGuidance: string | null;
  }>(
    emailAccountId
      ? `/api/user/briefing-guidance?emailAccountId=${emailAccountId}`
      : null,
  );

  // Initialize guidance when it loads
  useEffect(() => {
    if (guidanceData?.briefingGuidance !== undefined) {
      setGuidance(guidanceData.briefingGuidance || "");
    }
  }, [guidanceData?.briefingGuidance]);

  const { execute, isExecuting } = useAction(
    updateBriefingGuidanceAction.bind(null, emailAccountId),
    {
      onSuccess: () => {
        toastSuccess({
          description: "Saved! Next briefing will use this guidance.",
        });
        // Refetch guidance to update UI
        mutateGuidance();
      },
      onError: (error) => {
        toastError({
          description:
            error.error.serverError || "Failed to save briefing guidance",
        });
      },
    },
  );

  const handleSave = async () => {
    if (!emailAccountId) return;
    execute({ briefingGuidance: guidance || null });
  };

  const handleReset = () => {
    setGuidance("");
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Briefing Settings"
        description={`Customize AI scoring for ${emailAccount?.email || "your account"}`}
      />

      <LoadingContent
        loading={accountLoading || guidanceLoading}
        loadingComponent={<Skeleton className="h-96 w-full" />}
      >
        {emailAccount && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <label
                htmlFor="briefing-guidance"
                className="text-sm font-medium mb-2 block"
              >
                Custom Guidance
              </label>
              <Textarea
                id="briefing-guidance"
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder={DEFAULT_BRIEFING_GUIDANCE}
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Leave empty to use default guidance
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isExecuting}>
                {isExecuting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isExecuting}
              >
                Reset to Default
              </Button>
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
        )}
      </LoadingContent>
    </PageWrapper>
  );
}
