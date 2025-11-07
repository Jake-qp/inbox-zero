import type { ParsedMessage } from "@/utils/types";
import type { EmailAccountWithAI } from "@/utils/llms/types";
import { createGenerateText } from "@/utils/llms";
import { getModel } from "@/utils/llms/model";
import { createScopedLogger } from "@/utils/logger";
import { DEFAULT_BRIEFING_GUIDANCE } from "./constants";

export async function scoreEmailsBatch(
  emails: ParsedMessage[],
  emailAccount: EmailAccountWithAI & { briefingGuidance?: string | null },
): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();

  const logger = createScopedLogger("briefing");
  const guidance = emailAccount.briefingGuidance || DEFAULT_BRIEFING_GUIDANCE;

  // Batch in chunks of 50 to avoid token limits
  const CHUNK_SIZE = 50;
  const allScores = new Map<string, number>();

  // Create wrapped generateText for usage tracking
  const modelOptions = getModel(emailAccount.user);
  const generateText = createGenerateText({
    userEmail: emailAccount.email,
    label: "Score briefing emails",
    modelOptions,
  });

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const emailList = chunk
      .map(
        (e, idx) =>
          `${idx + 1}. From: ${e.headers.from}\n   Subject: ${e.headers.subject}\n   Preview: ${e.snippet?.slice(0, 150) || ""}`,
      )
      .join("\n\n");

    const prompt = `You are scoring emails for a daily briefing.

User context: ${emailAccount.about || "None"}

User's guidance:
${guidance}

Score these ${chunk.length} emails 1-10:
- 9-10: Critical/urgent, must see today
- 7-8: Important, should see soon
- 5-6: Relevant but not time-sensitive
- 3-4: Low priority
- 1-2: Not important

Emails:
${emailList}

Return format (one line per email, no explanation):
1: [score]
2: [score]
...`;

    try {
      const { text } = await generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      // Parse "1: 8\n2: 5" format
      text
        .trim()
        .split("\n")
        .forEach((line, idx) => {
          const match = line.match(/^\s*\d+\s*:\s*(\d+)/);
          if (match && chunk[idx]) {
            allScores.set(
              chunk[idx].id,
              Math.max(1, Math.min(10, Number.parseInt(match[1]))),
            );
          }
        });
    } catch (error) {
      logger.error("AI scoring failed for chunk", {
        error,
        chunkSize: chunk.length,
      });
      // Default to 5 for this chunk
      chunk.forEach((e) => allScores.set(e.id, 5));
    }
  }

  // Ensure all emails have scores
  emails.forEach((e) => {
    if (!allScores.has(e.id)) allScores.set(e.id, 5);
  });

  return allScores;
}
