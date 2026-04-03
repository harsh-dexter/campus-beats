"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Loader2, User, UserMinus } from "lucide-react";
import { getSocket } from "@/lib/socket-client";

interface Message {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function PersistentChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [friend, setFriend] = useState<{ anonId: string; avatar: string; _id: string } | null>(null);
  const [myId, setMyId] = useState<string>("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removedMessage, setRemovedMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    // Scroll to bottom when messages update
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    fetch(`/api/friends/${conversationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not Found");
        return res.json();
      })
      .then((data) => {
        if(data && data.metadata) {
          setFriend(data.metadata.friend);
          setMyId(data.metadata.currentUserId);
          if (data.metadata.isEnded) {
            setRemovedMessage("The person has ended the chat.");
          }
        }
        if(data && data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((e) => {
        console.error(e);
        router.push("/friends");
      })
      .finally(() => setIsLoading(false));

    // Join Server Room for real-time updates
    socket.emit("join_conversation", conversationId);
    
    // Listen for new messages incoming live
    socket.on("receive_message", (data: any) => {
      // Data returns id and timestamp, but frontend expects _id and createdAt
      const standardizedMessage = {
        _id: data.id || data._id,
        text: data.text,
        senderId: data.senderId,
        createdAt: data.timestamp || data.createdAt
      };

      // Prevent duplicates by ensuring sender != self
      if(standardizedMessage.senderId !== myId) {
        setMessages((prev) => [...prev, standardizedMessage]);
      }
    });

    socket.on("friend_removed", () => {
      setRemovedMessage("The person has ended the chat.");
    });

    return () => {
      socket.off("receive_message");
      socket.off("friend_removed");
    };
  }, [conversationId, router, myId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const optimisticMsg = {
      _id: Date.now().toString(),
      text: input,
      senderId: myId,
      createdAt: new Date().toISOString()
    };
    
    setInput("");
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/friends/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: optimisticMsg.text })
      });
      const confirmedMsg = await res.json();
      
      // Update actual ID if needed, but UI is already updated optimistically
      
      // Broadcast to other client in the conversation room natively through socket
      socket.emit("send_message", { 
        roomId: `conv:${conversationId}`, 
        text: confirmedMsg.text, 
        senderId: myId,
        id: confirmedMsg._id, 
        timestamp: confirmedMsg.createdAt
      });
      
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = async () => {
    const msg = removedMessage ? 
      "Delete this conversation permanently from your inbox?" : 
      "Are you sure you want to end this chat and remove this person as a friend? The other person will still see the chat history until they remove it.";
    if (!confirm(msg)) return;
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/friends/${conversationId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      
      // Notify the other user
      socket.emit("friend_removed", { roomId: `conv:${conversationId}` });
      
      // Redirect back
      router.push("/friends");
    } catch (e) {
      console.error(e);
      alert("Failed to remove friend.");
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-black">
         <header className="flex items-center gap-4 px-4 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
            <button onClick={() => router.back()} className="rounded-full bg-zinc-800 p-2 text-zinc-400">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-6 w-32 bg-white/5 rounded-md animate-pulse"></div>
         </header>
         <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="rounded-full hover:bg-zinc-800 p-2 text-white/70 hover:text-white transition-colors -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-white ring-2 ring-white/10 shrink-0 overflow-hidden">
            {friend?.avatar ? (
              <img src={friend.avatar} alt="peer" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-zinc-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white text-sm tracking-tight">{friend?.anonId || "Missing"}</span>
            <span className="text-[10px] text-zinc-500 font-medium">Friend Connection</span>
          </div>
        </div>
        <button 
          onClick={handleRemoveFriend} 
          disabled={isRemoving}
          className="rounded-full bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          title="Remove Friend & End Chat"
        >
          {isRemoving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserMinus className="h-5 w-5" />}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex justify-center mb-8">
            <span className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-zinc-500 text-xs font-medium">
              Start chatting. Messages are secured here securely.
            </span>
          </div>
        ) : null}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"} w-full`} 
              key={msg._id}
            >
              <div className={`
                max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm
                ${isMe 
                  ? "bg-white text-black rounded-br-sm shadow-[0_4px_14px_-6px_rgba(255,255,255,0.4)]" 
                  : "bg-zinc-800 text-white rounded-bl-sm border border-white/5"
                }
              `}>
                {msg.text}
                <div className={`text-[9px] mt-1 opacity-60 text-right ${isMe ? "text-black" : "text-white"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-black via-black to-transparent">
        {removedMessage ? (
          <div className="flex justify-center flex-col items-center bg-zinc-900 border border-white/10 rounded-full p-4 shadow-2xl">
            <span className="text-zinc-400 font-medium text-sm">{removedMessage}</span>
          </div>
        ) : (
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-full p-1.5 shadow-2xl"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Secure message..."
              className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm px-4 placeholder:text-zinc-500 h-10 tracking-wide"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="h-10 w-10 rounded-full bg-white text-black flex flex-col items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all hover:scale-105 active:scale-95"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </form>
        )}
      </div>
      
    </div>
  );
}