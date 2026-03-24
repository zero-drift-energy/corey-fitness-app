'use client';
import React from 'react';

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
      style={{ backgroundColor: '#0b1326' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-lg"
          style={{ backgroundColor: 'var(--bg-input)', border: '1px solid rgba(173,198,255,0.2)' }}
        >
          {userName ? userName.charAt(0).toUpperCase() : 'C'}
        </div>
        <span
          className="text-2xl tracking-tighter font-headline"
          style={{ color: '#adc6ff', fontWeight: 900, fontStyle: 'italic' }}
        >
          COREY FITNESS
        </span>
      </div>
      <button
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200"
        style={{ color: 'rgba(173,198,255,0.5)' }}
      >
        <span className="material-symbols-outlined">notifications</span>
      </button>
    </header>
  );
}
