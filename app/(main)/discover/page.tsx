"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Send, Flag, MapPin, User, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { getSocket } from "@/lib/socket-client"; // Real socket client

type MatchState = "idle" | "matching" | "connected";

interface Message {
  id: string;
  text: string;
  sender: "me" | "them" | "system";
  timestamp: Date;
}

let cachedProfile: { anonId: string; avatar: string } | null = null;

export default function DiscoverPage() {
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [peer, setPeer] = useState<{ anonId: string; avatar: string } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  
  const [myProfile, setMyProfile] = useState<{ anonId: string; avatar: string }>(
    cachedProfile || { anonId: "Me", avatar: "" }
  );
  
  const [friendReqSent, setFriendReqSent] = useState(false);
  const [friendReqReceived, setFriendReqReceived] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  // Load current user profile quickly to send in queue metadata
  useEffect(() => {
    if (cachedProfile) return;

    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        if(data && data.anonId) {
          cachedProfile = { anonId: data.anonId, avatar: data.avatar };
          setMyProfile(cachedProfile);
        }
      }).catch(e => console.error(e));
  }, []);

  // Socket Connection and Event Bindings
  useEffect(() => {
    socket.on("match_found", (data: { roomId: string; peer: { anonId: string; avatar: string } }) => {
      setRoomId(data.roomId);
      setPeer(data.peer);
      setMatchState("connected");
      setMessages([]); // reset chat
      setFriendReqSent(false);
      setFriendReqReceived(false);
    });

    socket.on("receive_message", (data: { id: string; text: string; senderId: string; timestamp: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          text: data.text,
          sender: "them",
          timestamp: new Date(data.timestamp),
        },
      ]);
    });

    socket.on("match_ended", (data: { reason: string }) => {
       alert(`Chat ended: ${data.reason}`);
       handleDisconnect(true);
    });

    socket.on("friend_request_received", (data: { from: string }) => {
      setFriendReqReceived(true);
      // Optional: Add a subtle system message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "The other person wants to be friends!",
          sender: "them",
          timestamp: new Date(),
        },
      ]);
    });

    socket.on("friendship_created", (data: { conversationId: string }) => {
       alert("You are now friends! Chat securely from your friends tab.");
       handleDisconnect(true);
    });

    socket.on("system_warning", (data: { message: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `⚠️ ${data.message}`,
          sender: "system",
          timestamp: new Date(),
        },
      ]);
    });

    return () => {
      socket.off("match_found");
      socket.off("receive_message");
      socket.off("match_ended");
      socket.off("friend_request_received");
      socket.off("friendship_created");
      socket.off("system_warning");
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartMatch = () => {
    setMatchState("matching");
    socket.emit("join_queue", myProfile);
  };
  
  const handleCancelMatch = () => {
    setMatchState("idle");
    socket.emit("leave_queue");
  };
  
  const handleAddFriend = () => {
    if (!roomId) return;
    setFriendReqSent(true);
    socket.emit("request_friend", { roomId, anonId: myProfile.anonId });
  };

  const handleDisconnect = (serverInitiated = false) => {
    if (!serverInitiated && roomId) {
      socket.emit("end_chat", roomId);
    }
    setMatchState("idle");
    setPeer(null);
    setRoomId(null);
    setMessages([]);
    setIsReporting(false);
  };

  const handleSkipMatch = () => {
    if (roomId) socket.emit("skip_match", roomId);
    handleDisconnect(true);
    handleStartMatch(); // Instantly jump back into queue
  };

  const handleReportUser = () => {
    if (!roomId || !peer) return;
    socket.emit("report_user", {
      roomId,
      reporterAnonId: myProfile.anonId,
      reportedAnonId: peer.anonId,
      reason: reportReason || "Inappropriate Behavior"
    });
    setIsReporting(false);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !roomId) return;
    
    const newMsg: Message = {
      id: Date.now().toString(),
      text: message,
      sender: "me",
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMsg]);
    
    // Broadcast via actual socket to the room
    socket.emit("send_message", {
      roomId,
      text: message,
      senderId: socket.id
    });
  };

  // Shared framer motion variants
  const fadeVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
  };

  return (
    <div className="relative flex flex-col h-full bg-black overflow-hidden">
      
      <AnimatePresence mode="wait">
        
        {/* ================= IDLE STATE ================= */}
        {matchState === "idle" && (
          <motion.div 
            key="idle"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full scale-150"></div>
              <div className="relative h-32 w-32 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
                <MapPin className="h-10 w-10 text-white/60" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight text-center">Discover Campus</h1>
            <p className="text-zinc-400 text-center mb-10 max-w-[260px] text-sm">
              Connect anonymously with other verifed students on campus.
            </p>
            
            <button 
              onClick={handleStartMatch}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            >
              <Search className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <span>Start Matching</span>
            </button>
          </motion.div>
        )}

        {/* ================ MATCHING STATE ================ */}
        {matchState === "matching" && (
          <motion.div 
            key="matching"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="relative h-40 w-40 flex items-center justify-center mb-10">
              {/* Radar Pulsing Rings */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-white/20 bg-white/5"
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    delay: i * 0.8,
                    ease: "easeOut"
                  }}
                />
              ))}
              <div className="relative z-10 h-20 w-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_0_rgba(255,255,255,0.2)]">
                <Search className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            <h2 className="text-xl font-medium text-white mb-2 tracking-tight">Searching Campus...</h2>
            <p className="text-zinc-500 text-sm mb-12">Looking for a fellow student</p>

            <button 
              onClick={handleCancelMatch}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-6 py-2.5 text-sm font-medium text-zinc-300 backdrop-blur-md transition-all hover:bg-white/5 active:scale-95"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </motion.div>
        )}

        {/* ================ CONNECTED STATE ================ */}
        {matchState === "connected" && peer && (
          <motion.div 
            key="connected"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col h-full bg-black"
          >
            {/* Chat header */}
            <header className="flex shrink-0 items-center justify-between px-4 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-white ring-2 ring-white/10 shrink-0">
                  {peer.avatar ? (
                    <img src={peer.avatar} alt="peer" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-white text-sm tracking-tight">{peer.anonId}</span>
                  <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Online now
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAddFriend}
                  disabled={friendReqSent}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all border ${
                    friendReqReceived && !friendReqSent
                    ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30"
                    : friendReqSent
                    ? "bg-white/5 text-zinc-500 border-white/5"
                    : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                  }`}
                >
                  {friendReqReceived && !friendReqSent
                    ? "ACCEPT MATCH"
                    : friendReqSent
                    ? "INVITE SENT..."
                    : "+ FRIEND"}
                </button>
                <button 
                  onClick={() => setIsReporting(true)}
                  className="h-9 w-9 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Flag className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleSkipMatch()}
                  className="h-9 px-3 rounded-full bg-zinc-500/10 text-zinc-300 text-xs font-semibold hover:bg-zinc-500/20 transition-colors"
                >
                  Skip
                </button>
                <button 
                  onClick={() => handleDisconnect()}
                  className="h-9 px-3 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                >
                  End
                </button>
              </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              <div className="flex justify-center mb-8">
                <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-500 text-[10px] font-medium uppercase tracking-widest">
                  You are now connected
                </span>
              </div>
              
              {messages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput onSendMessage={handleSendMessage} />

            {/* Report Modal */}
            <AnimatePresence>
              {isReporting && peer && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Flag className="h-5 w-5 text-red-500" />
                        Report User
                      </h3>
                      <button onClick={() => setIsReporting(false)} className="text-zinc-500 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-zinc-400 mb-4">
                      Are you sure you want to report <span className="text-white font-medium">{peer.anonId}</span>? 
                      This will instantly sever the connection and flag them to admins.
                    </p>
                    
                    <textarea 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Reason for report..."
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 mb-6 h-24 resize-none"
                    />

                    <button 
                      onClick={handleReportUser}
                      className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors active:scale-[0.98]"
                    >
                      Submit Report & Block
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
        
      </AnimatePresence>
    </div>
  );
}

const MessageItem = React.memo(({ msg }: { msg: Message }) => {
  const isMe = msg.sender === "me";
  const isSystem = msg.sender === "system";

  if (isSystem) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center w-full my-2"
      >
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {msg.text}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"} w-full`} 
    >
      <div className={`
        max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed
        ${isMe 
          ? "bg-white text-black rounded-br-sm" 
          : "bg-zinc-800 text-white rounded-bl-sm border border-white/5"
        }
      `}>
        {msg.text}
      </div>
    </motion.div>
  );
});

MessageItem.displayName = "MessageItem";

function ChatInput({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="shrink-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-full p-1.5 shadow-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm px-4 placeholder:text-zinc-500 h-9"
        />
        <button 
          type="submit"
          disabled={!input.trim()}
          className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all"
        >
          <Send className="h-4 w-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}