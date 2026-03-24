'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { path: '/dashboard', label: 'Home', icon: 'home_app_logo' },
  { path: '/log', label: 'Log', icon: 'edit_note' },
  { path: '/clubs', label: 'Clubs', icon: 'sports_soccer' },
  { path: '/stats', label: 'Stats', icon: 'leaderboard' },
  { path: '/chat', label: 'Coach AI', icon: 'smart_toy' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on onboarding and landing
  if (pathname === '/onboarding' || pathname === '/') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 glass-nav"
      style={{
        boxShadow: '0 -8px 32px rgba(173,198,255,0.08)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className="flex flex-col items-center justify-center px-5 py-2 rounded-xl transition-all"
            style={{
              color: isActive ? '#0b1326' : 'rgba(173,198,255,0.5)',
              backgroundColor: isActive ? '#4d8eff' : 'transparent',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <span
              className="material-symbols-outlined mb-0.5"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold tracking-wide uppercase font-body">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
