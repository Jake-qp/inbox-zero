"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function BriefingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center p-8">
        <ErrorDisplay error={{ error: error?.message }} />
        <Button variant="outline" className="mt-4" onClick={() => reset()}>
          <AlertCircle className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    </PageWrapper>
  );
}
