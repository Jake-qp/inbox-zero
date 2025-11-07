"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedMessage } from "@/utils/types";
import { EmailCard } from "./EmailCard";

export function UrgentSection({
  emails,
}: {
  emails: Array<
    ParsedMessage & {
      score: number;
      accountEmail: string;
      accountId: string;
      accountProvider: string;
    }
  >;
}) {
  return (
    <Card className="border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 via-yellow-50/30 to-amber-50 dark:from-amber-950/10 dark:via-yellow-950/5 dark:to-amber-950/10 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-bold text-amber-800 dark:text-amber-300">
              URGENT
            </CardTitle>
            <p className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70">
              {emails.length}{" "}
              {emails.length === 1 ? "email requires" : "emails require"}{" "}
              immediate attention
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            accountId={email.accountId}
            accountEmail={email.accountEmail}
            accountProvider={email.accountProvider}
          />
        ))}
      </CardContent>
    </Card>
  );
}
