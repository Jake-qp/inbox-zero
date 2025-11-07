import { z } from "zod";

// Daily Briefing - Custom addition
export const updateBriefingGuidanceBody = z.object({
  briefingGuidance: z.string().nullable(),
});
export type UpdateBriefingGuidanceBody = z.infer<
  typeof updateBriefingGuidanceBody
>;
