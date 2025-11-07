"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateBriefingGuidanceAction } from "@/utils/actions/email-account";
import { toastSuccess, toastError } from "@/components/Toast";
import { DEFAULT_BRIEFING_GUIDANCE } from "@/utils/ai/briefing/constants";
import { useAction } from "next-safe-action/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";

export function BriefingSettingsForm({
  emailAccountId,
  emailAccountEmail,
}: {
  emailAccountId: string;
  emailAccountEmail: string;
}) {
  // Start with default guidance pre-filled so it's immediately editable
  const [guidance, setGuidance] = useState(DEFAULT_BRIEFING_GUIDANCE);

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
  // If no custom guidance exists, keep the default; otherwise use custom
  useEffect(() => {
    if (guidanceData?.briefingGuidance !== undefined) {
      // If briefingGuidance is null or empty, keep default; otherwise use custom
      setGuidance(guidanceData.briefingGuidance || DEFAULT_BRIEFING_GUIDANCE);
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
    // If guidance equals default or is empty, save as null to use default
    const trimmedGuidance = guidance.trim();
    const guidanceToSave =
      trimmedGuidance === "" || trimmedGuidance === DEFAULT_BRIEFING_GUIDANCE
        ? null
        : trimmedGuidance;
    execute({ briefingGuidance: guidanceToSave });
  };

  const handleReset = () => {
    // Reset to default guidance (pre-filled so user can edit)
    setGuidance(DEFAULT_BRIEFING_GUIDANCE);
  };

  if (guidanceLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor={`briefing-guidance-${emailAccountId}`}
          className="text-sm font-medium mb-2 block"
        >
          Custom Guidance
        </label>
        <Textarea
          id={`briefing-guidance-${emailAccountId}`}
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder={DEFAULT_BRIEFING_GUIDANCE}
          rows={15}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Default guidance is pre-filled above. Edit it to customize, or click
          Reset to start over.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isExecuting}>
          {isExecuting ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isExecuting}>
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
  );
}
