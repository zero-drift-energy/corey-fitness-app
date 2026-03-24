'use client';
import React from 'react';

interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export default function Select({ label, value, onChange, options, className = '' }: SelectProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all appearance-none"
        style={{
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          '--tw-ring-color': 'var(--accent)',
        } as React.CSSProperties}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
