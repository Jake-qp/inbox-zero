import type { ParsedMessage } from "@/utils/types";
import type { ReplyingToEmail } from "@/app/(app)/[emailAccountId]/compose/ComposeEmailForm";
import { createReplyContent } from "@/utils/gmail/reply";
import { forwardEmailHtml, forwardEmailSubject } from "@/utils/gmail/forward";
import { extractEmailReply } from "@/utils/parse/extract-reply.client";

/**
 * Prepares reply metadata for composing a reply to an email
 */
export function prepareReplyingToEmail(
  message: ParsedMessage,
  content = "",
): ReplyingToEmail {
  const sentFromUser = message.labelIds?.includes("SENT");

  const { html } = createReplyContent({ message });

  return {
    // If following an email from yourself, use original recipients, otherwise reply to sender
    to: sentFromUser ? message.headers.to : message.headers.from,
    // If following an email from yourself, don't add "Re:" prefix
    subject: sentFromUser
      ? message.headers.subject
      : `Re: ${message.headers.subject}`,
    headerMessageId: message.headers["message-id"]!,
    threadId: message.threadId!,
    // Keep original CC
    cc: message.headers.cc,
    // Keep original BCC if available
    bcc: sentFromUser ? message.headers.bcc : "",
    references: message.headers.references,
    draftHtml: content || "",
    quotedContentHtml: html,
  };
}

/**
 * Prepares forward metadata for composing a forwarded email
 */
export function prepareForwardingEmail(
  message: ParsedMessage,
): ReplyingToEmail {
  return {
    to: "",
    subject: forwardEmailSubject(message.headers.subject),
    headerMessageId: "",
    threadId: message.threadId!,
    cc: "",
    references: "",
    draftHtml: forwardEmailHtml({ content: "", message }),
    quotedContentHtml: "",
  };
}

/**
 * Prepares reply metadata from a draft message
 */
export function prepareDraftReplyEmail(draft: ParsedMessage): ReplyingToEmail {
  const splitHtml = extractEmailReply(draft.textHtml || "");

  return {
    to: draft.headers.to,
    subject: draft.headers.subject,
    headerMessageId: draft.headers["message-id"]!,
    threadId: draft.threadId!,
    cc: draft.headers.cc,
    bcc: draft.headers.bcc,
    references: draft.headers.references,
    draftHtml: splitHtml.draftHtml,
    quotedContentHtml: splitHtml.originalHtml,
  };
}
