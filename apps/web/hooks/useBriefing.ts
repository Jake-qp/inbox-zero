import useSWR from "swr";
import type { BriefingResponse } from "@/app/api/ai/briefing/route";

export function useBriefing(date?: string) {
  const url = date ? `/api/ai/briefing?date=${date}` : "/api/ai/briefing";
  const result = useSWR<BriefingResponse>(url, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    ...result,
    refresh: () => result.mutate(),
    isRefreshing: result.isValidating,
  };
}
