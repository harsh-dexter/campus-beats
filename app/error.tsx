"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center space-y-6 bg-black px-6 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-zinc-400">An unexpected error occurred in the application.</p>
      </div>
      <button
        onClick={() => reset()}
        className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-transform active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}