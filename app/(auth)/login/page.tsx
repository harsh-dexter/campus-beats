"use client";

import { signIn } from "next-auth/react";
import { Headphones } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center"
      >
        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          <Headphones className="h-8 w-8 text-black" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Campus Beats</h1>
        <p className="text-zinc-400 mb-10 text-sm">Connect securely with verified peers on campus.</p>
        
        <button 
          onClick={() => signIn("google", { callbackUrl: "/discover" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-black px-6 py-3.5 rounded-xl font-bold hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          Continue with Institute Email
        </button>
        
        <p className="text-[10px] text-zinc-500 mt-6 uppercase tracking-wider">
          Requires @iitbhu.ac.in domain
        </p>
      </motion.div>
    </div>
  );
}