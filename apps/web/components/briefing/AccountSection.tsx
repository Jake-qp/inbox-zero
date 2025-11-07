"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertError } from "@/components/Alert";
import type { ParsedMessage } from "@/utils/types";
import { EmailCard } from "./EmailCard";
function getProviderIcon(_provider: string) {
  // This will be enhanced in later tasks - for now return null
  return null;
}

export function AccountSection({
  account,
  emails,
  badge,
  hasError,
}: {
  account: {
    id: string;
    email: string;
    provider: string;
    name: string | null;
    image: string | null;
  };
  emails: Array<ParsedMessage & { score: number }>;
  badge: {
    count: number;
    hasUrgent: boolean;
  };
  hasError?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getProviderIcon(account.provider)}
            <CardTitle className="text-base">{account.email}</CardTitle>
            {badge.count > 0 && (
              <Badge variant={badge.hasUrgent ? "destructive" : "default"}>
                {badge.count}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-2">
          {hasError && (
            <AlertError
              title="Failed to load"
              description="Failed to load emails for this account."
            />
          )}
          {emails.length > 0
            ? emails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  accountId={account.id}
                />
              ))
            : !hasError && (
                <p className="text-sm text-muted-foreground">
                  No important emails for this account.
                </p>
              )}
        </CardContent>
      )}
    </Card>
  );
}
