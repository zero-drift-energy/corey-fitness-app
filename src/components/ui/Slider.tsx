'use client';
import React from 'react';
import { getIntensityColor } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  showValue?: boolean;
  colorMode?: 'intensity' | 'none';
}

export default function Slider({
  label, value, onChange, min = 1, max = 10,
  showValue = true, colorMode = 'none',
}: SliderProps) {
  const color = colorMode === 'intensity' ? getIntensityColor(value) : 'var(--accent)';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {showValue && (
          <span className="text-lg font-bold" style={{ color }}>
            {value}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full outline-none cursor-pointer"
        style={{
          accentColor: color,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--bg-input) ${((value - min) / (max - min)) * 100}%, var(--bg-input) 100%)`,
        }}
      />
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
