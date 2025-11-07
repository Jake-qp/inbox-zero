"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reply, Archive, Eye } from "lucide-react";
import { extractNameFromEmail } from "@/utils/email";
import { formatShortDate } from "@/utils/date";
import type { ParsedMessage } from "@/utils/types";

export function EmailCard({
  email,
  accountId,
}: {
  email: ParsedMessage & { score: number };
  accountId: string;
}) {
  const router = useRouter();
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
    // TODO: Implement archive action - will be enhanced in later tasks
    // For now, just navigate to view
    handleView();
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReply}
            aria-label="Reply"
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            aria-label="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
