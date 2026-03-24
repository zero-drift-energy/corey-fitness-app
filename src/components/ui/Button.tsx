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
  const baseStyles = 'font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: 'text-white',
    secondary: '',
    danger: 'text-white',
    ghost: '',
  };

  const variantInline: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: 'var(--accent)' },
    secondary: { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' },
    danger: { backgroundColor: 'var(--danger)' },
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
