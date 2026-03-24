'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { POSITIONS } from '@/lib/constants';

export default function OnboardingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    age: 16,
    weight_kg: '',
    height_cm: '',
    position: POSITIONS[0],
    team_name: '',
    academy_name: '',
  });

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight_kg: Number(form.weight_kg),
          height_cm: Number(form.height_cm),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create profile');
      }

      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const positionOptions = POSITIONS.map((p) => ({ value: p, label: p }));

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Welcome to FitFooty! &#9917;
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Let&apos;s set up your profile so your AI coach can help you perform at your best.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Info */}
        <Card className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Personal Info
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Your name"
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Age"
                type="number"
                value={form.age}
                onChange={(e) => update('age', Number(e.target.value))}
                min={10}
                max={25}
                required
              />
              <Input
                label="Weight (kg)"
                type="number"
                value={form.weight_kg}
                onChange={(e) => update('weight_kg', e.target.value)}
                placeholder="65"
                min={30}
                max={150}
                step={0.1}
                required
              />
              <Input
                label="Height (cm)"
                type="number"
                value={form.height_cm}
                onChange={(e) => update('height_cm', e.target.value)}
                placeholder="175"
                min={120}
                max={220}
                required
              />
            </div>
          </div>
        </Card>

        {/* Football Info */}
        <Card className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Football Info
          </h2>
          <div className="flex flex-col gap-4">
            <Select
              label="Position"
              value={form.position}
              onChange={(e) => update('position', e.target.value)}
              options={positionOptions}
            />
            <Input
              label="Team Name"
              value={form.team_name}
              onChange={(e) => update('team_name', e.target.value)}
              placeholder="e.g. Riverside FC"
            />
            <Input
              label="Academy Name (optional)"
              value={form.academy_name}
              onChange={(e) => update('academy_name', e.target.value)}
              placeholder="e.g. City Academy"
            />
          </div>
        </Card>

        {error && (
          <p className="text-sm text-center mb-4" style={{ color: 'var(--danger, #ef4444)' }}>
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? 'Setting up...' : 'Get Started'}
        </Button>
      </form>
    </div>
  );
}
