"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, Sparkles } from "lucide-react";

const LOADING_MESSAGES = [
  "Scanning your inbox...",
  "Analyzing email importance...",
  "Categorizing messages...",
  "Building your daily briefing...",
  "Almost ready...",
];

const MESSAGE_INTERVAL = 800; // Change message every 800ms

export function BriefingLoading() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        // Cycle through messages, but don't go past the last one
        if (prev < LOADING_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev; // Stay on last message
      });
    }, MESSAGE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = LOADING_MESSAGES[currentMessageIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="relative">
        <Loader2Icon className="size-12 animate-spin text-violet-600 dark:text-violet-400" />
        <Sparkles className="absolute -top-1 -right-1 size-5 text-violet-500 dark:text-violet-400 animate-pulse" />
      </div>
      <div className="flex flex-col items-center space-y-2">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          {currentMessage}
        </p>
        <div className="flex items-center space-x-1">
          {LOADING_MESSAGES.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                index <= currentMessageIndex
                  ? "bg-violet-600 dark:bg-violet-400"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
