"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Camera, RefreshCw, Save, Loader2, LogOut } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: serverProfile, error, mutate, isLoading } = useSWR("/api/profile", fetcher);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [profile, setProfile] = useState<{anonId: string; bio: string; avatar: string}>({
    anonId: "",
    bio: "",
    avatar: "",
  });

  useEffect(() => {
    if (serverProfile) {
      setProfile({
        anonId: serverProfile.anonId || "",
        bio: serverProfile.bio || "",
        avatar: serverProfile.avatar || "",
      });
    }
  }, [serverProfile]);

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    
    // Convert to base64 to store in MongoDB prototype
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateName = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/profile/nickname", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => ({ ...prev, anonId: data.anonId }));
      }
    } catch (error) {
      console.error("Failed to regenerate nickname", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        mutate(await res.json(), false);
      }
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center rounded-full bg-red-500/10 p-2.5 text-red-500 transition-colors hover:bg-red-500/20 active:scale-95"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      {/* Avatar Section */}
      <section className="mb-8 flex flex-col items-center justify-center">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="h-28 w-28 overflow-hidden rounded-full bg-zinc-800 shadow-2xl ring-4 ring-zinc-900 flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl text-zinc-500 font-bold">{profile.anonId.charAt(0)}</span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border-4 border-black text-white shadow-lg transition-transform group-hover:scale-110">
            <Camera className="h-4 w-4" />
          </div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleImageUpload(e.target.files?.[0])}
          />
        </div>
        <p className="mt-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tap to change avatar</p>
      </section>

      {/* Identity Card */}
      <div className="space-y-6 rounded-2xl bg-zinc-900/50 p-6 shadow-xl border border-white/5 backdrop-blur-sm">
        
        {/* Nickname */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-400">Anonymous ID</label>
          <div className="flex items-center justify-between rounded-xl bg-black/50 p-4 border border-white/5">
            <span className="font-mono text-lg tracking-tight text-white">{profile.anonId}</span>
            <button 
              onClick={handleRegenerateName}
              disabled={isRegenerating}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-zinc-500 px-1">Other users will see you as this name.</p>
        </div>

        {/* Bio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-400">Bio</label>
            <span className={`text-xs ${profile.bio.length > 100 ? 'text-red-500' : 'text-zinc-500'}`}>
              {profile.bio.length}/100
            </span>
          </div>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            maxLength={100}
            placeholder="A little bit about yourself..."
            className="w-full resize-none rounded-xl bg-black/50 p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 border border-white/5 transition-all"
            rows={3}
          />
        </div>

      </div>
    </div>
  );
}