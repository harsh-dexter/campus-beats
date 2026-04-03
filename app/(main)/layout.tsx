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
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-zinc-800 font-sans pb-20 md:pb-0">
      {/* 
        pb-20 adds padding to the bottom so last elements 
        aren't hidden by the fixed mobile nav. 
        On desktop (md:pb-0), if we adjust the layout further, 
        we can change it, but for mobile-first this serves well.
      */}
      <main className="mx-auto max-w-md min-h-screen relative shadow-2xl bg-[#09090b] sm:border-x sm:border-white/5">
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