'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { getRecoveryColor } from '@/lib/utils';
import { sessionLoad } from '@/lib/calculations';
import {
  ACWR_OPTIMAL_LOW, ACWR_OPTIMAL_HIGH, ACWR_DANGER, SLEEP_TARGET_HOURS,
} from '@/lib/constants';
import type { RecoveryMetrics, TrainingSession, NutritionLog, SleepLog, User } from '@/types';

/* ---------- ACWR gauge ---------- */
function AcwrGauge({ value }: { value: number }) {
  // Map ACWR 0-2.0 to an arc angle
  const clampedValue = Math.min(Math.max(value, 0), 2.0);
  const pct = clampedValue / 2.0;
  const angle = -90 + (pct * 180); // -90 to 90 degrees

  let color: string;
  if (value >= ACWR_OPTIMAL_LOW && value <= ACWR_OPTIMAL_HIGH) color = '#22c55e';
  else if (value > ACWR_DANGER) color = '#ef4444';
  else color = '#f59e0b';

  let label: string;
  if (value >= ACWR_OPTIMAL_LOW && value <= ACWR_OPTIMAL_HIGH) label = 'Optimal';
  else if (value > ACWR_DANGER) label = 'High Risk';
  else if (value < ACWR_OPTIMAL_LOW) label = 'Under-trained';
  else label = 'Caution';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="var(--bg-input)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Green zone indicator */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * 188} 188`}
          opacity={0.3}
        />
        {/* Needle */}
        <line
          x1="70"
          y1="70"
          x2={70 + 45 * Math.cos((angle * Math.PI) / 180)}
          y2={70 + 45 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="70" cy="70" r="4" fill={color} />
        <text
          x="70"
          y="60"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={color}
        >
          {value.toFixed(2)}
        </text>
      </svg>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

/* ---------- Recovery ring ---------- */
function RecoveryRing({ score, status }: { score: number; status: string }) {
  const color = getRecoveryColor(status);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="60" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="bold" fill={color}>
          {score}
        </text>
        <text x="60" y="74" textAnchor="middle" fontSize="11" fill="var(--text-muted)">/ 100</text>
      </svg>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {status === 'green' ? 'Match Ready' : status === 'amber' ? 'Moderate' : 'Low'}
      </span>
    </div>
  );
}

/* ---------- Tooltip style ---------- */
const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 12,
};

/* ---------- main ---------- */
export default function StatsPage() {
  const [recovery, setRecovery] = useState<RecoveryMetrics | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [recoveryRes, trainingRes, nutritionRes, sleepRes, userRes] = await Promise.all([
        fetch('/api/recovery'),
        fetch('/api/training?days=14'),
        fetch('/api/nutrition?days=7'),
        fetch('/api/sleep?days=14'),
        fetch('/api/user'),
      ]);

      if (recoveryRes.ok) setRecovery(await recoveryRes.json());
      if (trainingRes.ok) {
        const d = await trainingRes.json();
        setSessions(Array.isArray(d) ? d : []);
      }
      if (nutritionRes.ok) {
        const d = await nutritionRes.json();
        setNutritionLogs(Array.isArray(d) ? d : []);
      }
      if (sleepRes.ok) {
        const d = await sleepRes.json();
        setSleepLogs(Array.isArray(d) ? d : []);
      }
      if (userRes.ok) setUser(await userRes.json());

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- Training chart data: 14 days ---------- */
  const trainingChartData = useMemo(() => {
    const days: { date: string; label: string; load: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const dayLoad = sessions
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + sessionLoad(s), 0);
      days.push({ date: dateStr, label, load: dayLoad });
    }
    return days;
  }, [sessions]);

  const weekSessionCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    return sessions.filter((s) => s.date >= weekStr && !s.skipped).length;
  }, [sessions]);

  /* ---------- Nutrition averages ---------- */
  const nutritionAvg = useMemo(() => {
    if (nutritionLogs.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Group by date
    const byDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    nutritionLogs.forEach((m) => {
      if (!byDate[m.date]) byDate[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      byDate[m.date].calories += m.calories || 0;
      byDate[m.date].protein += m.protein_g || 0;
      byDate[m.date].carbs += m.carbs_g || 0;
      byDate[m.date].fat += m.fat_g || 0;
    });

    const days = Object.values(byDate);
    const count = days.length || 1;
    return {
      calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / count),
      protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / count),
      carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / count),
      fat: Math.round(days.reduce((s, d) => s + d.fat, 0) / count),
    };
  }, [nutritionLogs]);

  /* ---------- Sleep chart data ---------- */
  const sleepChartData = useMemo(() => {
    const days: { date: string; label: string; hours: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const log = sleepLogs.find((l) => l.date === dateStr);
      days.push({
        date: dateStr,
        label,
        hours: log?.duration_minutes ? Math.round((log.duration_minutes / 60) * 10) / 10 : null,
      });
    }
    return days;
  }, [sleepLogs]);

  const avgSleepQuality = useMemo(() => {
    if (sleepLogs.length === 0) return 0;
    return Math.round((sleepLogs.reduce((s, l) => s + l.quality, 0) / sleepLogs.length) * 10) / 10;
  }, [sleepLogs]);

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <h1 className="text-2xl font-bold">Stats &amp; Progress &#128200;</h1>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* 1. Recovery Overview */}
      {recovery && (
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Match Readiness
          </h2>
          <div className="flex items-center justify-around">
            <RecoveryRing score={recovery.recovery_score} status={recovery.status} />
            <AcwrGauge value={recovery.acwr} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Acute Load</p>
              <p className="text-sm font-bold">{recovery.acute_load}</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chronic Load</p>
              <p className="text-sm font-bold">{recovery.chronic_load}</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Sleep</p>
              <p className="text-sm font-bold">{recovery.avg_sleep_hours_7d}h</p>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Training Load */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Training Load (14 days)
          </h2>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {weekSessionCount} this week
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trainingChartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value}`, 'Load']}
              />
              <Bar dataKey="load" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. Nutrition Trends */}
      <Card>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Nutrition (7-day avg)
        </h2>
        <div className="flex items-center justify-center mb-3">
          <span className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
            {nutritionAvg.calories}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>kcal / day</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
            <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>{nutritionAvg.protein}g</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
          </div>
          <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{nutritionAvg.carbs}g</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
          </div>
          <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
            <p className="text-lg font-bold" style={{ color: '#a855f7' }}>{nutritionAvg.fat}g</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fat</p>
          </div>
        </div>
        {user && (
          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Target: ~2,800 kcal (training day)</span>
            <span
              style={{
                color: nutritionAvg.calories >= 2500 ? '#22c55e' : nutritionAvg.calories >= 2000 ? '#f59e0b' : '#ef4444',
              }}
            >
              {nutritionAvg.calories >= 2500 ? 'On Track' : nutritionAvg.calories >= 2000 ? 'Slightly Low' : 'Below Target'}
            </span>
          </div>
        )}
      </Card>

      {/* 4. Sleep Trends */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Sleep (14 days)
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Avg quality: {avgSleepQuality} / 5 &#9733;
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sleepChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                domain={[0, 12]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [value != null ? `${value}h` : 'No data', 'Sleep']}
              />
              <ReferenceLine
                y={SLEEP_TARGET_HOURS}
                stroke="#22c55e"
                strokeDasharray="6 4"
                label={{
                  value: `${SLEEP_TARGET_HOURS}h target`,
                  position: 'insideTopRight',
                  fill: '#22c55e',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 5. Body Stats */}
      {user && (
        <Card>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Body Stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.weight_kg ?? '--'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Weight (kg)</p>
            </div>
            <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.height_cm ?? '--'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Height (cm)</p>
            </div>
            <div className="text-center rounded-xl p-3" style={{ backgroundColor: 'var(--bg-input)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.position ?? '--'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Position</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recovery recommendations */}
      {recovery?.recommendations && recovery.recommendations.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Recommendations
          </h2>
          <ul className="flex flex-col gap-2">
            {recovery.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)' }}>&#8226;</span>
                {rec}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
