'use client';
import React from 'react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
          ⚽ FitFooty
        </h1>
        {userName && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Hey {userName}!
          </p>
        )}
      </div>
      <ThemeToggle />
    </header>
  );
}
