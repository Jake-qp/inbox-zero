import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Daily Briefing - Disabled to prevent OAuth double-redemption (AADSTS54005)
  // Upstream has this enabled but doesn't handle event.preloadResponse properly
  // See: https://web.dev/navigation-preload/ and IMPLEMENTATION-PLAN.md Phase 8
  // TODO: Re-enable once Serwist fetch handler uses event.preloadResponse
  navigationPreload: false,
  runtimeCaching: [], // caching disabled
  disableDevLogs: process.env.NODE_ENV === "production",
});

serwist.addEventListeners();
