"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";
import { BriefingSettingsForm } from "./BriefingSettingsForm";
import { LoadingContent } from "@/components/LoadingContent";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";
import type { GetEmailAccountsResponse } from "@/app/api/user/email-accounts/route";
import {
  isGoogleProvider,
  isMicrosoftProvider,
} from "@/utils/email/provider-types";

function getProviderIcon(provider: string) {
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

export function BriefingSettings() {
  const { data, isLoading, error } = useSWR<GetEmailAccountsResponse>(
    "/api/user/email-accounts",
  );

  const [openAccounts, setOpenAccounts] = useState<Set<string>>(new Set());

  const toggleAccount = (accountId: string) => {
    setOpenAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Briefing Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize AI scoring guidance for each email account
        </p>
      </div>

      <LoadingContent
        loading={isLoading}
        error={error}
        loadingComponent={<Skeleton className="h-96 w-full" />}
      >
        {data?.emailAccounts && data.emailAccounts.length > 0 ? (
          <div className="space-y-3">
            {data.emailAccounts.map((emailAccount) => {
              const isOpen = openAccounts.has(emailAccount.id);
              return (
                <Collapsible
                  key={emailAccount.id}
                  open={isOpen}
                  onOpenChange={() => toggleAccount(emailAccount.id)}
                >
                  <Card className="border border-violet-100 dark:border-violet-900/30 bg-white dark:bg-slate-900 shadow-sm">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="p-4 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-indigo-50/50 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-indigo-950/20 border-b border-violet-100 dark:border-violet-900/30 cursor-pointer hover:bg-violet-50/70 dark:hover:bg-violet-950/30 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {getProviderIcon(emailAccount.account.provider)}
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {emailAccount.email}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {emailAccount.account.provider === "google"
                                  ? "Gmail"
                                  : emailAccount.account.provider ===
                                      "microsoft"
                                    ? "Outlook"
                                    : emailAccount.account.provider}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6">
                        <BriefingSettingsForm
                          emailAccountId={emailAccount.id}
                          emailAccountEmail={emailAccount.email}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No email accounts</p>
            <p className="text-xs mt-1 text-muted-foreground">
              Connect an email account to customize briefing settings
            </p>
          </Card>
        )}
      </LoadingContent>
    </div>
  );
}
