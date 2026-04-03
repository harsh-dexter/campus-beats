import { BottomNav } from "@/components/bottom-nav";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-[100dvh] bg-black text-zinc-100 selection:bg-zinc-800 font-sans flex flex-col overflow-hidden">
      {/* 
        pb-20 adds padding to the bottom so last elements 
        aren't hidden by the fixed mobile nav. 
      */}
      <main className="flex-1 overflow-y-auto mx-auto max-w-md w-full relative shadow-2xl bg-[#09090b] sm:border-x sm:border-white/5 pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Sticky Bottom Navigation specifically styled for mobile-first width matching */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-50 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}