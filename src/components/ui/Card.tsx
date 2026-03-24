'use client';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function Card({ children, className = '', onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all hover:brightness-110' : ''} ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', ...style }}
    >
      {children}
    </div>
  );
}
