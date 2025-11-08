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
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
        <Mail className="h-5 w-5 text-white" />
      </div>
    );
  }
  if (isMicrosoftProvider(provider)) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40">
        <Mail className="h-5 w-5 text-white" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
      <Mail className="h-5 w-5 text-white" />
    </div>
  );
}

export function AccountSection({
  account,
  emails,
  badge,
  hasError,
  errorType,
  atLimit,
  onViewEmail,
  onArchive,
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
  atLimit?: boolean;
  onViewEmail?: (
    email: ParsedMessage & { score: number },
    accountId: string,
    accountEmail: string,
    accountProvider: string,
  ) => void;
  onArchive?: (threadId: string) => void;
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
        // Uses regular OAuth flow (not linking flow) to refresh tokens for existing account
        // Provider config already forces consent prompt, so tokens will be refreshed
      });
    } else if (isMicrosoft) {
      await signIn.social({
        provider: "microsoft",
        callbackURL: "/briefing",
        // Uses regular OAuth flow (not linking flow) to refresh tokens for existing account
        // Provider config already forces consent prompt, so tokens will be refreshed
      });
    }
  };

  return (
    <Card className="border border-violet-100 dark:border-violet-900/30 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="p-4 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-indigo-50/50 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-indigo-950/20 border-b border-violet-100 dark:border-violet-900/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              {getProviderIcon(account.provider)}
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {account.email}
              </CardTitle>
              {badge.count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={badge.hasUrgent ? "destructive" : "default"}
                    className="h-5 text-xs px-2 font-medium shadow-sm bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-0"
                  >
                    {badge.count} {badge.count === 1 ? "email" : "emails"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand account" : "Collapse account"}
            className="flex-shrink-0 h-10 px-3 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors gap-2 border border-violet-200 dark:border-violet-800"
          >
            {isCollapsed ? (
              <>
                <span className="text-xs font-medium">Expand</span>
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="text-xs font-medium">Collapse</span>
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-2 p-4">
          {hasError && errorType === "AUTH_REQUIRED" && (
            <Alert
              variant="destructive"
              className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 py-3"
            >
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <span className="text-amber-800 dark:text-amber-200">
                  Authentication expired for this account
                </span>
                <Button
                  onClick={handleReconnect}
                  size="sm"
                  variant="default"
                  className="h-8 px-3 text-xs shadow-sm"
                >
                  Reconnect
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {hasError && errorType !== "AUTH_REQUIRED" && (
            <Alert
              variant="destructive"
              className="border-red-200 dark:border-red-800 py-3"
            >
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <span>Failed to load emails for this account</span>
                <Button
                  variant="link"
                  onClick={() => window.location.reload()}
                  className="h-8 px-3 text-xs"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {atLimit && !hasError && (
            <Alert
              variant="destructive"
              className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 py-3"
            >
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                This account has 100+ inbox emails. Archive emails to see all
                important items.
              </AlertDescription>
            </Alert>
          )}
          {emails.length > 0
            ? emails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  accountId={account.id}
                  accountEmail={account.email}
                  accountProvider={account.provider}
                  onView={(e) =>
                    onViewEmail?.(
                      e,
                      account.id,
                      account.email,
                      account.provider,
                    )
                  }
                  onArchive={onArchive}
                />
              ))
            : !hasError && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-500">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No important emails</p>
                  <p className="text-xs mt-1 text-slate-400">
                    All clear for this account
                  </p>
                </div>
              )}
        </CardContent>
      )}
    </Card>
  );
}
