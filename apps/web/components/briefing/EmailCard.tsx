"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reply, Archive, Eye } from "lucide-react";
import { extractNameFromEmail } from "@/utils/email";
import { formatShortDate } from "@/utils/date";
import type { ParsedMessage } from "@/utils/types";
import { archiveEmails } from "@/store/archive-queue";
import { toastSuccess, toastError } from "@/components/Toast";

export function EmailCard({
  email,
  accountId,
}: {
  email: ParsedMessage & { score: number };
  accountId: string;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const fromName = extractNameFromEmail(email.headers.from);
  const emailDate = new Date(email.headers.date);
  const snippet = email.snippet || "";

  // Score badge color: red 9-10, orange 7-8, yellow 6
  const getScoreBadgeVariant = (
    score: number,
  ): "destructive" | "default" | "secondary" => {
    if (score >= 9) return "destructive"; // red
    if (score >= 7) return "default"; // orange (using default variant)
    return "secondary"; // yellow (using secondary variant)
  };

  const handleReply = () => {
    router.push(`/${accountId}/mail?threadId=${email.threadId}&reply=true`);
  };

  const handleView = () => {
    router.push(`/${accountId}/mail?threadId=${email.threadId}`);
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveEmails({
        threadIds: [email.threadId],
        onSuccess: () => {
          toastSuccess({ description: "Email archived" });
        },
        onError: () => {
          toastError({ description: "Failed to archive email" });
        },
        emailAccountId: accountId,
      });
    } catch (error) {
      toastError({ description: "Failed to archive email" });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Card className="p-3 md:p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getScoreBadgeVariant(email.score)}>
              {email.score}
            </Badge>
            <h4 className="font-medium text-sm truncate">
              {email.headers.subject}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{fromName}</span>
            <span>•</span>
            <time dateTime={email.headers.date}>
              {formatShortDate(emailDate)}
            </time>
          </div>
          {snippet && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {snippet}
            </p>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReply}
            aria-label="Reply"
            className="h-8 w-8 md:h-9 md:w-9 p-0"
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            disabled={isArchiving}
            aria-label="Archive"
            className="h-8 w-8 md:h-9 md:w-9 p-0"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            aria-label="View"
            className="h-8 w-8 md:h-9 md:w-9 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
