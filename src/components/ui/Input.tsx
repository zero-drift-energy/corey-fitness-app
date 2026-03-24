'use client';
import React from 'react';

interface InputProps {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  className?: string;
}

export default function Input({
  label, type = 'text', value, onChange, placeholder,
  min, max, step, required, className = '',
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        className="rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all"
        style={{
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          '--tw-ring-color': 'var(--accent)',
        } as React.CSSProperties}
      />
    </div>
  );
}
