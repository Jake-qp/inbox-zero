"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Settings } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyState({
  message = "All clear! No important emails today.",
}: {
  message?: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Mail className="h-8 w-8" />
        </EmptyMedia>
        <EmptyTitle>No Emails</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <div className="flex gap-2 justify-center mt-4">
        <Button variant="outline" asChild>
          <Link href="/briefing/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/accounts">
            <Mail className="h-4 w-4 mr-2" />
            Connect Account
          </Link>
        </Button>
      </div>
    </Empty>
  );
}
