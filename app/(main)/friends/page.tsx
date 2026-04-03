"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FriendConversation {
  id: string;
  friend: {
    _id: string;
    anonId: string;
    avatar: string;
    bio: string;
  };
  lastMessage: string;
  lastMessageAt: string;
}

export default function FriendsPage() {
  const [conversations, setConversations] = useState<FriendConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/friends")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
        }
      })
      .catch((e) => console.error("Error loading friends list", e))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <header className="mb-6 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Friends</h1>
        <div className="flex items-center gap-2 rounded-full bg-zinc-900 border border-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400">
          <MessageSquare className="h-3 w-3" />
          <span>{conversations.length}</span>
        </div>
      </header>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5 mb-4">
            <User className="h-8 w-8 text-zinc-600" />
          </div>
          <h2 className="text-lg font-medium text-zinc-300">No friends yet</h2>
          <p className="text-zinc-500 text-sm mt-1 mb-6">Match with users to start conversations.</p>
          <Link
            href="/discover"
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)]"
          >
            Start Disovering
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence>
            {conversations.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/friends/${item.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-zinc-900/50 p-4 border border-white/5 backdrop-blur-md shadow-lg transition-transform hover:bg-white/5 active:scale-95 group"
                >
                  <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-white ring-2 ring-white/10 group-hover:ring-white/20 transition-all overflow-hidden shrink-0">
                    {item.friend.avatar ? (
                      <img src={item.friend.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold">{item.friend.anonId.charAt(0)}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate pr-2">{item.friend.anonId}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {new Date(item.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 truncate w-full">
                      {item.lastMessage}
                    </p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}