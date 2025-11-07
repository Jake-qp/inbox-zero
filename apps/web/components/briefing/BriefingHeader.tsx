"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import { PageHeading } from "@/components/Typography";

export function BriefingHeader({
  totalScanned,
  totalShown,
  currentDate,
}: {
  totalScanned?: number;
  totalShown?: number;
  currentDate: string;
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

  // Navigate to today
  const handleToday = () => {
    router.push("/briefing");
  };

  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex-1">
        <PageHeading>Daily Briefing</PageHeading>
        <div className="mt-2 flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
          {totalScanned !== undefined && totalShown !== undefined && (
            <p className="text-sm text-muted-foreground">
              {totalShown} of {totalScanned} emails shown
            </p>
          )}
        </div>
      </div>

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
        <Button variant="outline" size="sm" asChild>
          <Link href="/briefing/settings">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
