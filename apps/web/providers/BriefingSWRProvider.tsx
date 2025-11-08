"use client";

import { useCallback, useState, createContext, useMemo } from "react";
import { SWRConfig } from "swr";
import { captureException } from "@/utils/error";
import { NO_REFRESH_TOKEN_ERROR_CODE } from "@/utils/config";

// Simplified SWR fetcher for briefing that doesn't require email account context
const fetcher = async (url: string, init?: RequestInit | undefined) => {
  const headers = new Headers(init?.headers);
  const newInit = { ...init, headers };

  const res = await fetch(url, newInit);

  if (!res.ok) {
    const errorData = await res.json();

    const errorMessage =
      errorData.message || "An error occurred while fetching the data.";
    const error: Error & { info?: any; status?: number } = new Error(
      errorMessage,
    );

    // Attach extra info to the error object.
    error.info = errorData;
    error.status = res.status;

    const isKnownError = errorData.isKnownError;

    if (!isKnownError) {
      captureException(error, {
        extra: {
          url,
          status: res.status,
          statusText: res.statusText,
          responseBody: error.info,
          extraMessage: "SWR fetch error",
        },
      });
    }

    throw error;
  }

  return res.json();
};

interface Context {
  resetCache: () => void;
}

const defaultContextValue = {
  resetCache: () => {},
};

const BriefingSWRContext = createContext<Context>(defaultContextValue);

export const BriefingSWRProvider = (props: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState(new Map());

  const resetCache = useCallback(() => {
    setProvider(new Map());
  }, []);

  const value = useMemo(() => ({ resetCache }), [resetCache]);

  return (
    <BriefingSWRContext.Provider value={value}>
      <SWRConfig
        value={{
          fetcher,
          provider: () => provider,
          onError: (error) => console.log("SWR error:", error),
        }}
      >
        {props.children}
      </SWRConfig>
    </BriefingSWRContext.Provider>
  );
};

export { BriefingSWRContext };
