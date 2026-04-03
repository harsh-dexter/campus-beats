import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center bg-black px-4 text-center">
      <AlertCircle className="mb-6 h-16 w-16 text-zinc-500" />
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">404</h1>
      <p className="mb-8 max-w-sm text-zinc-400">
        The page you`&apos;`re looking for doesn`&apos;`t exist or was moved.
      </p>
      <Link
        href="/"
        className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
      >
        Go Home
      </Link>
    </div>
  );
}