import useSWR from "swr";
import type { BriefingResponse } from "@/app/api/ai/briefing/route";

export function useBriefing(date?: string) {
  const url = date ? `/api/ai/briefing?date=${date}` : "/api/ai/briefing";
  return useSWR<BriefingResponse>(url, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
