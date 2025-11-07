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
    <div className="space-y-4 pb-6 border-b border-violet-100 dark:border-violet-900/30">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageHeading className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Daily Briefing
          </PageHeading>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
            {mode === "inbox" ? (
              totalShown !== undefined && (
                <>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {totalShown}
                  </span>{" "}
                  important emails in your inbox
                </>
              )
            ) : (
              <>
                Showing emails for{" "}
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  {formattedDate}
                </span>
              </>
            )}
          </p>
        </div>

        {mode === "history" && (
          <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/30 rounded-xl p-1 border border-violet-200 dark:border-violet-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              aria-label="Previous day"
              className="h-8 w-8 p-0 hover:bg-white dark:hover:bg-violet-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              aria-label="Today"
              className="h-8 px-3 text-xs font-medium hover:bg-white dark:hover:bg-violet-900"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={isToday}
              aria-label="Next day"
              className="h-8 w-8 p-0 hover:bg-white dark:hover:bg-violet-900 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={mode} className="w-full">
        <TabsList className="h-10 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-1">
          <TabsTrigger
            value="inbox"
            onClick={handleInboxTab}
            className="text-sm font-medium px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-violet-900 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm"
          >
            Inbox
          </TabsTrigger>
          <TabsTrigger
            value="history"
            onClick={handleHistoryTab}
            className="text-sm font-medium px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-violet-900 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm"
          >
            History
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            onClick={handleSettingsTab}
            className="text-sm font-medium px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-violet-900 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm"
          >
            Settings
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
