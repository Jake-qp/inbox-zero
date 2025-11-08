"use client";

import type React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Provider } from "jotai";
import { jotaiStore } from "@/store";
import { ThemeProvider } from "@/components/theme-provider";
import { ComposeModalProvider } from "@/providers/ComposeModalProvider";
import { BriefingSWRProvider } from "@/providers/BriefingSWRProvider";
import { EmailAccountProvider } from "@/providers/EmailAccountProvider";

/**
 * Briefing-specific layout that excludes ChatProvider.
 * Briefing doesn't need chat functionality (per PRD).
 * EmailAccountProvider is included for settings page compatibility.
 */
export default function BriefingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Provider store={jotaiStore}>
        <NuqsAdapter>
          <EmailAccountProvider>
            <BriefingSWRProvider>
              <ComposeModalProvider>{children}</ComposeModalProvider>
            </BriefingSWRProvider>
          </EmailAccountProvider>
        </NuqsAdapter>
      </Provider>
    </ThemeProvider>
  );
}
