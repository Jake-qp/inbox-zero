"use client";

import { useState, useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Archive,
  Reply,
  Mail,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import type { ParsedMessage } from "@/utils/types";
import { HtmlEmail, PlainEmail } from "@/components/email-list/EmailContents";
import { ComposeEmailForm } from "@/app/(app)/[emailAccountId]/compose/ComposeEmailForm";
import type { ReplyingToEmail } from "@/app/(app)/[emailAccountId]/compose/ComposeEmailForm";
import { prepareReplyingToEmail } from "@/utils/email/reply-helpers";
import { buildReplyAllRecipients } from "@/utils/email/reply-all";
import { archiveEmails, deleteEmails } from "@/store/archive-queue";
import { markReadThreadAction } from "@/utils/actions/mail";
import { toastSuccess, toastError } from "@/components/Toast";
import { extractNameFromEmail } from "@/utils/email";
import { formatShortDate } from "@/utils/date";
import { decodeSnippet } from "@/utils/gmail/decode";
import { getEmailUrlForMessage } from "@/utils/url";
import { mutate } from "swr";

export function BriefingEmailModal({
  email,
  accountId,
  accountEmail,
  accountProvider,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: {
  email: (ParsedMessage & { score: number }) | null;
  accountId: string;
  accountEmail: string;
  accountProvider: string;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}) {
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingUnread, setIsMarkingUnread] = useState(false);
  const [showFullHeaders, setShowFullHeaders] = useState(false);

  // Auto-mark email as read when viewing in modal
  useEffect(() => {
    if (email?.threadId && accountId) {
      // Mark as read silently (no toast notification needed for expected behavior)
      const markAsRead = async () => {
        try {
          const result = await markReadThreadAction(accountId, {
            threadId: email.threadId,
            read: true,
          });

          if (result?.serverError) {
            console.error("Failed to mark email as read:", result.serverError);
          }
        } catch (error) {
          // Silent failure - don't interrupt user experience
          console.error("Failed to mark email as read:", error);
        }
      };

      markAsRead();
    }
  }, [email?.threadId, accountId]);

  // Prepare reply data based on mode
  const replyingToEmail: ReplyingToEmail | undefined =
    email && replyMode
      ? (() => {
          const baseReply = prepareReplyingToEmail(email);

          if (replyMode === "replyAll") {
            const replyAllRecipients = buildReplyAllRecipients(
              email.headers,
              undefined,
              accountEmail,
            );
            return {
              ...baseReply,
              to: replyAllRecipients.to,
              cc: replyAllRecipients.cc.join(", "),
            };
          }

          return baseReply;
        })()
      : undefined;

  const handleArchive = useCallback(async () => {
    if (!email) return;

    setIsArchiving(true);
    await archiveEmails({
      threadIds: [email.threadId],
      onSuccess: () => {
        toastSuccess({ description: "Email archived" });
        onClose();
        mutate("/api/ai/briefing");
      },
      onError: () => {
        toastError({ description: "Failed to archive email" });
        setIsArchiving(false);
      },
      emailAccountId: accountId,
    });
  }, [email, accountId, onClose]);

  const handleDelete = useCallback(async () => {
    if (!email) return;

    setIsDeleting(true);
    await deleteEmails({
      threadIds: [email.threadId],
      onSuccess: () => {
        toastSuccess({ description: "Email deleted" });
        onClose();
        mutate("/api/ai/briefing");
      },
      onError: () => {
        toastError({ description: "Failed to delete email" });
        setIsDeleting(false);
      },
      emailAccountId: accountId,
    });
  }, [email, accountId, onClose]);

  const handleMarkUnread = useCallback(async () => {
    if (!email) return;

    setIsMarkingUnread(true);
    try {
      const result = await markReadThreadAction(accountId, {
        threadId: email.threadId,
        read: false,
      });

      if (result?.serverError) {
        toastError({ description: "Failed to mark as unread" });
      } else {
        toastSuccess({ description: "Marked as unread" });
        onClose();
        mutate("/api/ai/briefing");
      }
    } catch (error) {
      toastError({ description: "Failed to mark as unread" });
    } finally {
      setIsMarkingUnread(false);
    }
  }, [email, onClose]);

  const handleOpenInEmailClient = useCallback(() => {
    if (!email) return;

    const url = getEmailUrlForMessage(
      email.id,
      email.threadId,
      accountEmail,
      accountProvider,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }, [email, accountEmail, accountProvider]);

  const handleReplySent = useCallback(() => {
    toastSuccess({ description: "Reply sent!" });
    setReplyMode(null);
    onClose();
    mutate("/api/ai/briefing");
  }, [onClose]);

  // Keyboard shortcuts
  useHotkeys("e", () => !replyMode && handleArchive(), [
    handleArchive,
    replyMode,
  ]);
  useHotkeys("u", () => !replyMode && handleMarkUnread(), [
    handleMarkUnread,
    replyMode,
  ]);
  useHotkeys("r", () => !replyMode && setReplyMode("reply"), [replyMode]);
  useHotkeys("j", () => !replyMode && onNext?.(), [onNext, replyMode]);
  useHotkeys("k", () => !replyMode && onPrevious?.(), [onPrevious, replyMode]);
  useHotkeys("escape", () => {
    if (replyMode) {
      setReplyMode(null);
    } else {
      onClose();
    }
  }, [replyMode, onClose]);

  if (!email) return null;

  const fromName = extractNameFromEmail(email.headers.from);
  const emailDate = new Date(email.headers.date);

  // Parse recipients
  const toRecipients =
    email.headers.to
      ?.split(",")
      .map((r) => r.trim())
      .filter(Boolean) || [];
  const ccRecipients =
    email.headers.cc
      ?.split(",")
      .map((r) => r.trim())
      .filter(Boolean) || [];
  const bccRecipients =
    email.headers.bcc
      ?.split(",")
      .map((r) => r.trim())
      .filter(Boolean) || [];
  const hasMultipleRecipients =
    toRecipients.length > 1 ||
    ccRecipients.length > 0 ||
    bccRecipients.length > 0;

  const getScoreBadgeStyle = (score: number) => {
    if (score >= 9)
      return "bg-gradient-to-br from-rose-500 to-pink-600 text-white";
    if (score >= 7)
      return "bg-gradient-to-br from-amber-500 to-orange-600 text-white";
    return "bg-gradient-to-br from-violet-500 to-purple-600 text-white";
  };

  return (
    <Dialog open={!!email} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header - Fixed at top */}
        <DialogHeader className="space-y-3 px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Account Badge */}
              <Badge variant="outline" className="text-xs">
                {accountEmail}
              </Badge>

              {/* Priority Badge */}
              <Badge
                className={`${getScoreBadgeStyle(email.score)} border-0 shadow-sm flex items-center gap-1`}
              >
                <Sparkles className="h-3 w-3" />
                {email.score}/10
              </Badge>
            </div>
          </div>

          {/* Email Header */}
          <div className="space-y-2">
            <DialogTitle className="text-xl font-semibold leading-tight">
              {email.headers.subject}
            </DialogTitle>

            {/* From and Date Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {fromName}
                  </span>
                  {hasMultipleRecipients && (
                    <button
                      onClick={() => setShowFullHeaders(!showFullHeaders)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      {showFullHeaders ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Collapsed view - show first recipient only */}
                {!showFullHeaders && (
                  <div className="text-xs text-muted-foreground mt-1">
                    to{" "}
                    {extractNameFromEmail(toRecipients[0] || email.headers.to)}
                    {hasMultipleRecipients && (
                      <button
                        onClick={() => setShowFullHeaders(true)}
                        className="ml-1 hover:underline"
                        type="button"
                      >
                        {ccRecipients.length > 0
                          ? `+${toRecipients.length - 1 + ccRecipients.length} more`
                          : toRecipients.length > 1
                            ? `+${toRecipients.length - 1} more`
                            : ""}
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded view - show all recipients */}
                {showFullHeaders && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-10 shrink-0">
                        from:
                      </span>
                      <span className="text-foreground">
                        {email.headers.from}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-10 shrink-0">
                        to:
                      </span>
                      <span className="text-foreground break-words">
                        {toRecipients.join(", ")}
                      </span>
                    </div>
                    {ccRecipients.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-10 shrink-0">
                          cc:
                        </span>
                        <span className="text-foreground break-words">
                          {ccRecipients.join(", ")}
                        </span>
                      </div>
                    )}
                    {bccRecipients.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-10 shrink-0">
                          bcc:
                        </span>
                        <span className="text-foreground break-words">
                          {bccRecipients.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatShortDate(emailDate)}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Email Body */}
          <div className="pb-4">
            {email.textHtml ? (
              <HtmlEmail html={email.textHtml} />
            ) : (
              <PlainEmail text={email.textPlain || ""} />
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="py-2">
              <div className="text-sm font-medium mb-2">
                Attachments ({email.attachments.length})
              </div>
              <div className="space-y-1">
                {email.attachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-muted-foreground flex items-center gap-2 p-2 bg-muted rounded"
                  >
                    <span className="font-medium">{attachment.filename}</span>
                    <span>({Math.round(attachment.size / 1024)}KB)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply Box */}
          {replyMode && replyingToEmail && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {replyMode === "reply" ? "Reply" : "Reply All"}
                </div>
                <ComposeEmailForm
                  replyingToEmail={replyingToEmail}
                  onSuccess={handleReplySent}
                  onDiscard={() => setReplyMode(null)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer - Sticky at bottom */}
        <DialogFooter className="flex flex-row items-center justify-between gap-2 px-6 py-4 border-t bg-background shrink-0 sm:justify-between">
          {/* Left: Primary actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleArchive}
              disabled={isArchiving || !!replyMode}
              size="sm"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                E
              </kbd>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={!!replyMode}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                  <ChevronDown className="h-3 w-3 ml-1" />
                  <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    R
                  </kbd>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setReplyMode("reply")}>
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReplyMode("replyAll")}>
                  Reply All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleMarkUnread}
              disabled={isMarkingUnread || !!replyMode}
              variant="ghost"
              size="sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Mark as unread
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                U
              </kbd>
            </Button>
          </div>

          {/* Right: Secondary actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleDelete}
              disabled={isDeleting || !!replyMode}
              variant="ghost"
              size="icon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button onClick={handleOpenInEmailClient} variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in {accountProvider === "google" ? "Gmail" : "Outlook"}
            </Button>

            <Separator orientation="vertical" className="h-8" />

            <Button
              onClick={onPrevious}
              disabled={!hasPrevious || !!replyMode}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
              <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                K
              </kbd>
            </Button>

            <Button
              onClick={onNext}
              disabled={!hasNext || !!replyMode}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="h-4 w-4" />
              <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                J
              </kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
