"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Discover",
      href: "/discover", // or "/" depending on the default route
      icon: Compass,
    },
    {
      name: "Friends",
      href: "/friends",
      icon: Users,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
    },
  ];

  return (
    <nav className="relative bottom-0 left-0 w-full z-50">
      {/* Background Blur Effect */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-white/5 shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.5)]"></div>
      
      {/* Navigation Items */}
      <div className="relative w-full px-6">
        <ul className="flex items-center justify-between h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <li key={tab.name}>
                <Link
                  href={tab.href}
                  prefetch={true}
                  className={`
                    group flex flex-col items-center justify-center w-16 h-14 rounded-2xl
                    transition-all duration-300 ease-spring 
                    ${isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"}
                  `}
                >
                  <div
                    className={`
                      relative flex items-center justify-center p-1 rounded-xl transition-all duration-300
                      ${isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white/5"}
                    `}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`
                        transition-transform duration-300 transform 
                        ${isActive ? "scale-110" : "scale-100 group-hover:scale-105"}
                      `}
                    />
                  </div>
                  <span
                    className={`
                      text-[10px] mt-1 font-medium transition-all duration-300 
                      ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 absolute -bottom-4"}
                    `}
                  >
                    {tab.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}