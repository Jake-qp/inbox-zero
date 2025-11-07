"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeading } from "@/components/Typography";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BriefingHeader({
  totalScanned,
  totalShown,
  currentDate,
  mode,
}: {
  totalScanned?: number;
  totalShown?: number;
  currentDate: string;
  mode: "inbox" | "history";
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const isToday = currentDate === today;

  // Parse current date
  const date = new Date(`${currentDate}T00:00:00.000Z`);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Navigate to previous day
  const handlePrevious = () => {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];
    router.push(`/briefing?date=${prevDateStr}`);
  };

  // Navigate to next day
  const handleNext = () => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split("T")[0];
    router.push(`/briefing?date=${nextDateStr}`);
  };

  // Navigate to today (returns to Inbox mode)
  const handleToday = () => {
    router.push("/briefing");
  };

  // Tab navigation handlers
  const handleInboxTab = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push("/briefing");
  };

  const handleHistoryTab = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push(`/briefing?date=${today}`);
  };

  const handleSettingsTab = () => {
    router.push("/briefing/settings");
  };

  return (
    <Tabs defaultValue={mode} className="border-b border-border pb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageHeading>Daily Briefing</PageHeading>
          <div className="mt-2 flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="inbox" onClick={handleInboxTab}>
                Inbox
              </TabsTrigger>
              <TabsTrigger value="history" onClick={handleHistoryTab}>
                History
              </TabsTrigger>
              <TabsTrigger value="settings" onClick={handleSettingsTab}>
                Settings
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="mt-2 flex items-center gap-4">
            {mode === "history" ? (
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            ) : (
              totalShown !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {totalShown} important emails in inbox
                </p>
              )
            )}
            {mode === "history" &&
              totalScanned !== undefined &&
              totalShown !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {totalShown} of {totalScanned} emails shown
                </p>
              )}
          </div>
        </div>

        {mode === "history" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                aria-label="Today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={isToday}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4">
        {mode === "inbox" ? (
          <p className="text-sm text-muted-foreground">
            Shows: All important inbox emails
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Showing emails for {formattedDate}
          </p>
        )}
      </div>
    </Tabs>
  );
}
