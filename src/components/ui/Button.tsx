'use client';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export default function Button({
  children, onClick, type = 'button', variant = 'primary',
  size = 'md', disabled = false, className = '', fullWidth = false,
}: ButtonProps) {
  const baseStyles = 'font-bold rounded-xl transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 uppercase tracking-wider';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variantStyles = {
    primary: '',
    secondary: '',
    danger: '',
    ghost: '',
  };

  const variantInline: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(to bottom right, var(--accent), var(--accent-container))',
      color: 'var(--on-accent)',
      boxShadow: '0 4px 16px rgba(77,142,255,0.25)',
    },
    secondary: { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' },
    danger: { backgroundColor: 'var(--danger-container)', color: 'var(--danger)' },
    ghost: { backgroundColor: 'transparent', color: 'var(--text-secondary)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variantInline[variant]}
    >
      {children}
    </button>
  );
}
