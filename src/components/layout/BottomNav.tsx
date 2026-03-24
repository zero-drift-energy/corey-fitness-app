'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { path: '/dashboard', label: 'Home', icon: '🏠' },
  { path: '/log', label: 'Log', icon: '📝' },
  { path: '/clubs', label: 'Clubs', icon: '⚽' },
  { path: '/stats', label: 'Stats', icon: '📊' },
  { path: '/chat', label: 'Coach AI', icon: '🤖' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on onboarding and landing
  if (pathname === '/onboarding' || pathname === '/') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            style={{
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent)11' : 'transparent',
            }}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
