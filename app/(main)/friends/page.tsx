"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket-client";

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
  unreadCount?: number;
  isTyping?: boolean;
}

let cachedConversations: FriendConversation[] | null = null;

export default function FriendsPage() {
  const [conversations, setConversations] = useState<FriendConversation[]>(cachedConversations || []);
  const [isLoading, setIsLoading] = useState(!cachedConversations);

  useEffect(() => {
    fetch("/api/friends")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          cachedConversations = data;
          setConversations(data);
          const socket = getSocket();
          data.forEach(conv => socket.emit("join_conversation", conv.id));
        }
      })
      .catch((e) => console.error("Error loading friends list", e))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleMessage = (data: any) => {
      const convId = data.roomId?.replace('conv:', '');
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === convId);
        if (idx === -1) return prev;
        
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: data.text,
          lastMessageAt: data.timestamp || new Date().toISOString(),
          unreadCount: (updated[idx].unreadCount || 0) + 1,
          isTyping: false
        };
        // Move to top
        const item = updated.splice(idx, 1)[0];
        return [item, ...updated];
      });
    };

    const handleTyping = (data: { roomId: string }) => {
      const convId = data.roomId?.replace('conv:', '');
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === convId);
        if (idx === -1) return prev;
        
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isTyping: true };
        return updated;
      });

      // Clear typing after 3 seconds
      setTimeout(() => {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === convId);
          if (idx === -1) return prev;
          
          if (prev[idx].isTyping) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], isTyping: false };
            return updated;
          }
          return prev;
        });
      }, 3000);
    };

    socket.on("receive_message", handleMessage);
    socket.on("user_typing", handleTyping);

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("user_typing", handleTyping);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
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
                  
                  <div className="flex-1 overflow-hidden flex flex-col justify-center relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate pr-2">{item.friend.anonId}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {new Date(item.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate w-full pr-4 ${item.unreadCount ? 'text-white font-medium' : 'text-zinc-400'}`}>
                        {item.isTyping ? (
                          <span className="text-blue-400 animate-pulse text-xs italic">Typing...</span>
                        ) : (
                          item.lastMessage
                        )}
                      </p>
                      {item.unreadCount && item.unreadCount > 0 ? (
                        <div className="h-5 min-w-5 px-1.5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white absolute right-0">
                          {item.unreadCount}
                        </div>
                      ) : null}
                    </div>
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