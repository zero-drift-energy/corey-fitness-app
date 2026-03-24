'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Slider from '@/components/ui/Slider';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import {
  SESSION_TYPES, SKIP_REASONS, DEFAULT_SESSION_DURATIONS, DEFAULT_SESSION_INTENSITY,
} from '@/lib/constants';
import {
  formatDate, formatDateShort, today, minutesToHoursStr, getIntensityColor,
} from '@/lib/utils';
import { sessionLoad } from '@/lib/calculations';
import type { TrainingSession, SessionType } from '@/types';

export default function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<SessionType>('team_training');
  const [formDate, setFormDate] = useState(today());
  const [formDuration, setFormDuration] = useState(DEFAULT_SESSION_DURATIONS.team_training);
  const [formIntensity, setFormIntensity] = useState(DEFAULT_SESSION_INTENSITY.team_training);
  const [formSkipped, setFormSkipped] = useState(false);
  const [formSkipReason, setFormSkipReason] = useState('fatigue');
  const [formNotes, setFormNotes] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/training?days=14');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Reset form when session type changes
  function handleTypeChange(type: SessionType) {
    setFormType(type);
    setFormDuration(DEFAULT_SESSION_DURATIONS[type] || 60);
    setFormIntensity(DEFAULT_SESSION_INTENSITY[type] || 6);
  }

  function resetForm() {
    setFormType('team_training');
    setFormDate(today());
    setFormDuration(DEFAULT_SESSION_DURATIONS.team_training);
    setFormIntensity(DEFAULT_SESSION_INTENSITY.team_training);
    setFormSkipped(false);
    setFormSkipReason('fatigue');
    setFormNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: formType,
          date: formDate,
          duration_minutes: formDuration,
          intensity: formIntensity,
          skipped: formSkipped,
          skip_reason: formSkipped ? formSkipReason : null,
          notes: formNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to log session');
      setModalOpen(false);
      resetForm();
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  // Weekly chart data: last 7 days, total load per day
  const chartData = useMemo(() => {
    const days: { date: string; label: string; load: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayLoad = sessions
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + sessionLoad(s), 0);
      days.push({ date: dateStr, label, load: dayLoad });
    }
    return days;
  }, [sessions]);

  const sessionTypeMap = useMemo(() => {
    const map: Record<string, { label: string; icon: string }> = {};
    SESSION_TYPES.forEach((t) => { map[t.value] = { label: t.label, icon: t.icon }; });
    return map;
  }, []);

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
        <h1 className="text-2xl font-bold">Training Log &#9917;</h1>
        <Button onClick={() => setModalOpen(true)} size="md">
          + Log Session
        </Button>
      </div>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Weekly Load Chart */}
      <Card>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Weekly Training Load
        </h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                labelFormatter={(label) => label}
                formatter={(value) => [`${value}`, 'Load']}
              />
              <Bar dataKey="load" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sessions List */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Recent Sessions
        </h2>
        {sessions.length === 0 ? (
          <Card>
            <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              No sessions logged yet. Tap &quot;Log Session&quot; to get started.
            </p>
          </Card>
        ) : (
          sessions.map((session) => {
            const typeInfo = sessionTypeMap[session.session_type] || { icon: '?', label: session.session_type };
            return (
              <Card key={session.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{typeInfo.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{typeInfo.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(session.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {session.skipped ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                        Skipped{session.skip_reason ? ` - ${session.skip_reason}` : ''}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {minutesToHoursStr(session.duration_minutes)}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${getIntensityColor(session.intensity)}22`,
                            color: getIntensityColor(session.intensity),
                          }}
                        >
                          RPE {session.intensity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {session.notes && (
                  <p className="text-xs mt-2 pl-10" style={{ color: 'var(--text-muted)' }}>
                    {session.notes}
                  </p>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Log Session Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Log Training Session">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Session Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Session Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value as SessionType)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all"
                  style={{
                    backgroundColor: formType === t.value ? 'var(--accent)' : 'var(--bg-input)',
                    color: formType === t.value ? '#fff' : 'var(--text-primary)',
                    border: `2px solid ${formType === t.value ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            required
          />

          {/* Duration */}
          <Input
            label="Duration (minutes)"
            type="number"
            value={formDuration}
            onChange={(e) => setFormDuration(Number(e.target.value))}
            min={0}
            max={300}
            required
          />

          {/* Intensity */}
          <Slider
            label="Intensity (RPE)"
            value={formIntensity}
            onChange={setFormIntensity}
            min={1}
            max={10}
            colorMode="intensity"
          />

          {/* Skipped Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Skipped this session?
            </label>
            <button
              type="button"
              onClick={() => setFormSkipped(!formSkipped)}
              className="relative w-12 h-7 rounded-full transition-colors duration-200"
              style={{ backgroundColor: formSkipped ? 'var(--danger, #ef4444)' : 'var(--bg-input)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                style={{ transform: formSkipped ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {formSkipped && (
            <Select
              label="Reason for skipping"
              value={formSkipReason}
              onChange={(e) => setFormSkipReason(e.target.value)}
              options={SKIP_REASONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Notes (optional)
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              placeholder="How did it go?"
              className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : 'Save Session'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
