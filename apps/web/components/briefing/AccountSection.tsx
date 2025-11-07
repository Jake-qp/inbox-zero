"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ParsedMessage } from "@/utils/types";
import { EmailCard } from "./EmailCard";
import {
  isGoogleProvider,
  isMicrosoftProvider,
} from "@/utils/email/provider-types";
import { useIsMobile } from "@/hooks/use-mobile";
import { signIn } from "@/utils/auth-client";
import { SCOPES as GMAIL_SCOPES } from "@/utils/gmail/scopes";

function getProviderIcon(provider: string) {
  // Simple icon display - can be enhanced with brand-specific icons later
  if (isGoogleProvider(provider)) {
    return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
  if (isMicrosoftProvider(provider)) {
    return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
  return <Mail className="h-4 w-4 text-muted-foreground" />;
}

export function AccountSection({
  account,
  emails,
  badge,
  hasError,
  errorType,
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
  errorType?: "AUTH_REQUIRED" | "OTHER";
}) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  const handleReconnect = async () => {
    const isGoogle = isGoogleProvider(account.provider);
    const isMicrosoft = isMicrosoftProvider(account.provider);

    if (isGoogle) {
      await signIn.social({
        provider: "google",
        callbackURL: "/briefing",
        scopes: GMAIL_SCOPES,
      });
    } else if (isMicrosoft) {
      await signIn.social({
        provider: "microsoft",
        callbackURL: "/briefing",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getProviderIcon(account.provider)}
            <CardTitle className="text-base truncate">
              {account.email}
            </CardTitle>
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
            className="flex-shrink-0"
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
        <CardContent className="space-y-2 p-4 md:p-6 pt-0">
          {hasError && errorType === "AUTH_REQUIRED" && (
            <Alert variant="warning" className="mt-2">
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                <span>Authentication expired for this account.</span>
                <Button onClick={handleReconnect} size="sm" variant="default">
                  Reconnect
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {hasError && errorType !== "AUTH_REQUIRED" && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                <span>Failed to load emails for this account.</span>
                <Button variant="link" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
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
