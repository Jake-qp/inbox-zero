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
    }
  >;
}) {
  return (
    <Card className="border-red-500 bg-red-50/50 dark:bg-red-950/20">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">
          URGENT ({emails.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {emails.map((email) => (
          <EmailCard key={email.id} email={email} accountId={email.accountId} />
        ))}
      </CardContent>
    </Card>
  );
}
