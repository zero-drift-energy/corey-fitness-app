'use client';
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-xl p-6 animate-slide-up"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-headline tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:brightness-125"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
