"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let title = "Authentication Error";
  let message = "An error occurred during authentication.";

  if (error === "AccessDenied") {
    title = "Access Denied";
    message = "You must use an @iitbhu.ac.in email address to sign in.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">{title}</h1>
        <p className="text-zinc-400 mb-8">{message}</p>
        <Link 
          href="/"
          className="inline-block bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}