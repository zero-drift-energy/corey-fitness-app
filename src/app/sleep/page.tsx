'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { SLEEP_TARGET_HOURS } from '@/lib/constants';
import { today, formatDate, formatDateShort, minutesToHoursStr } from '@/lib/utils';
import type { SleepLog } from '@/types';

function getSleepDurationColor(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 9) return '#22c55e';
  if (hours >= 7) return '#f59e0b';
  return '#ef4444';
}

function QualityStars({ quality, size = 'sm' }: { quality: number; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'text-xl' : 'text-sm';
  return (
    <span className={dim}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < quality ? 1 : 0.2 }}>&#9733;</span>
      ))}
    </span>
  );
}

export default function SleepPage() {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [chartLogs, setChartLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState(today());
  const [formBedtime, setFormBedtime] = useState('22:00');
  const [formWakeTime, setFormWakeTime] = useState('07:00');
  const [formQuality, setFormQuality] = useState(3);
  const [formNotes, setFormNotes] = useState('');

  // Auto-calculate duration
  const calculatedDuration = useMemo(() => {
    try {
      const [bh, bm] = formBedtime.split(':').map(Number);
      const [wh, wm] = formWakeTime.split(':').map(Number);
      let bedMins = bh * 60 + bm;
      let wakeMins = wh * 60 + wm;
      // If wake is before bed, assume next day
      if (wakeMins <= bedMins) wakeMins += 24 * 60;
      return wakeMins - bedMins;
    } catch {
      return 0;
    }
  }, [formBedtime, formWakeTime]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [recentRes, chartRes] = await Promise.all([
        fetch('/api/sleep?days=7'),
        fetch('/api/sleep?days=14'),
      ]);
      if (!recentRes.ok) throw new Error('Failed to fetch sleep data');
      const recentData: SleepLog[] = await recentRes.json();
      const chartData: SleepLog[] = chartRes.ok ? await chartRes.json() : recentData;

      setLogs(recentData);
      setChartLogs(chartData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function resetForm() {
    setFormDate(today());
    setFormBedtime('22:00');
    setFormWakeTime('07:00');
    setFormQuality(3);
    setFormNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Build full datetime strings for bedtime/wake
      const bedDatetime = `${formDate}T${formBedtime}:00`;
      // If wake < bed, wake is next day
      const [bh] = formBedtime.split(':').map(Number);
      const [wh] = formWakeTime.split(':').map(Number);
      let wakeDate = formDate;
      if (wh < bh || (wh === bh && formWakeTime <= formBedtime)) {
        const d = new Date(formDate);
        d.setDate(d.getDate() + 1);
        wakeDate = d.toISOString().slice(0, 10);
      }
      const wakeDatetime = `${wakeDate}T${formWakeTime}:00`;

      const res = await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          bedtime: bedDatetime,
          wake_time: wakeDatetime,
          duration_minutes: calculatedDuration,
          quality: formQuality,
          notes: formNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to log sleep');
      setModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  // Chart data: last 14 days with sleep hours
  const chartData = useMemo(() => {
    const days: { date: string; label: string; hours: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const log = chartLogs.find((l) => l.date === dateStr);
      days.push({
        date: dateStr,
        label,
        hours: log?.duration_minutes ? Math.round((log.duration_minutes / 60) * 10) / 10 : null,
      });
    }
    return days;
  }, [chartLogs]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sleep &#128564;</h1>
        <Button onClick={() => setModalOpen(true)} size="md">
          + Log Sleep
        </Button>
      </div>

      {/* Sleep target reminder */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#127769;</span>
          <div>
            <p className="text-sm font-semibold">Sleep Target</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Aim for {SLEEP_TARGET_HOURS} hours per night for optimal recovery and growth
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Sleep Duration Chart */}
      <Card>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Sleep Duration (14 days)
        </h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
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
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--accent)', r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Last 7 Nights */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Last 7 Nights
        </h2>
        {logs.length === 0 ? (
          <Card>
            <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              No sleep data yet. Tap &quot;Log Sleep&quot; to start tracking.
            </p>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">&#128564;</span>
                  <div>
                    <p className="text-sm font-semibold">{formatDate(log.date)}</p>
                    {log.notes && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {log.duration_minutes != null && (
                    <span
                      className="text-sm font-bold"
                      style={{ color: getSleepDurationColor(log.duration_minutes) }}
                    >
                      {minutesToHoursStr(log.duration_minutes)}
                    </span>
                  )}
                  <QualityStars quality={log.quality} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Log Sleep Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Log Sleep">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bedtime"
              type="time"
              value={formBedtime}
              onChange={(e) => setFormBedtime(e.target.value)}
              required
            />
            <Input
              label="Wake Time"
              type="time"
              value={formWakeTime}
              onChange={(e) => setFormWakeTime(e.target.value)}
              required
            />
          </div>

          {/* Auto-calculated duration */}
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Duration</span>
              <span
                className="text-lg font-bold"
                style={{ color: getSleepDurationColor(calculatedDuration) }}
              >
                {minutesToHoursStr(calculatedDuration)}
              </span>
            </div>
          </Card>

          {/* Quality: tappable stars */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Sleep Quality
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormQuality(star)}
                  className="text-3xl transition-transform active:scale-110"
                  style={{ opacity: star <= formQuality ? 1 : 0.25, color: '#f59e0b' }}
                >
                  &#9733;
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Notes (optional)
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Woke up once during the night"
              className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : 'Save Sleep Log'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
