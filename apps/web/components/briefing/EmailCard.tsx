"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Archive, Eye, Sparkles } from "lucide-react";
import { extractNameFromEmail } from "@/utils/email";
import { formatShortDate } from "@/utils/date";
import type { ParsedMessage } from "@/utils/types";
import { archiveEmails } from "@/store/archive-queue";
import { toastSuccess, toastError } from "@/components/Toast";
import { decodeSnippet } from "@/utils/gmail/decode";
import { getEmailUrlForMessage } from "@/utils/url";

export function EmailCard({
  email,
  accountId,
  accountEmail,
  accountProvider,
  onView,
  onArchive,
}: {
  email: ParsedMessage & { score: number };
  accountId: string;
  accountEmail: string;
  accountProvider: string;
  onView?: (email: ParsedMessage & { score: number }) => void;
  onArchive?: (threadId: string) => void;
}) {
  const [isArchiving, setIsArchiving] = useState(false);
  const fromName = extractNameFromEmail(email.headers.from);
  const emailDate = new Date(email.headers.date);
  const snippet = decodeSnippet(email.snippet);

  const getScoreBadgeStyle = (
    score: number,
  ): {
    variant: "destructive" | "default" | "secondary";
    className: string;
  } => {
    if (score >= 9)
      return {
        variant: "destructive",
        className: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
      };
    if (score >= 7)
      return {
        variant: "default",
        className: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
      };
    return {
      variant: "secondary",
      className: "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
    };
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 9) return "Critical/Urgent";
    if (score >= 7) return "Important";
    return "Relevant";
  };

  const handleView = () => {
    if (onView) {
      onView(email);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);

    // Call parent's onArchive for optimistic update
    onArchive?.(email.threadId);

    try {
      await archiveEmails({
        threadIds: [email.threadId],
        onSuccess: () => {
          toastSuccess({ description: "Email archived" });
        },
        onError: () => {
          toastError({ description: "Failed to archive email" });
          setIsArchiving(false);
        },
        emailAccountId: accountId,
      });
    } catch (error) {
      toastError({ description: "Failed to archive email" });
      setIsArchiving(false);
    }
  };

  return (
    <Card
      className="group relative overflow-hidden border border-violet-100 dark:border-violet-900/30 bg-white dark:bg-slate-900 hover:border-violet-200 dark:hover:border-violet-800/50 hover:shadow-lg hover:shadow-violet-100/50 dark:hover:shadow-violet-900/20 transition-all duration-200 cursor-pointer"
      onClick={handleView}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Priority Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
              <div className="relative">
                <Badge
                  variant={getScoreBadgeStyle(email.score).variant}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold border-0 shadow-sm ${getScoreBadgeStyle(email.score).className}`}
                >
                  {email.score}
                </Badge>
                <div className="absolute -top-1 -right-1">
                  <Sparkles
                    className={`h-3 w-3 drop-shadow-sm ${
                      email.score >= 9
                        ? "text-rose-300"
                        : email.score >= 7
                          ? "text-amber-300"
                          : "text-purple-300"
                    }`}
                  />
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-violet-600 dark:bg-violet-500 text-white border-0 shadow-xl"
          >
            <div className="text-center">
              <div className="font-semibold text-sm">
                AI Priority: {email.score}/10
              </div>
              <div className="text-xs mt-1 opacity-90">
                {getScoreLabel(email.score)}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Email Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight">
            {email.headers.subject}
          </h4>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium truncate max-w-[200px]">
              {fromName}
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <time dateTime={email.headers.date} className="flex-shrink-0">
              {formatShortDate(emailDate)}
            </time>
          </div>
          {snippet && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {snippet}
            </p>
          )}
        </div>

        {/* Action Buttons - Always Visible */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive();
                }}
                disabled={isArchiving}
                aria-label="Archive"
                className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 transition-colors"
              >
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-0 shadow-lg"
            >
              <p className="text-xs">Archive in email system</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView();
                }}
                aria-label="View"
                className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-0 shadow-lg"
            >
              <p className="text-xs">Open in email client</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
