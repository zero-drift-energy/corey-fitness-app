'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Slider from '@/components/ui/Slider';
import Spinner from '@/components/ui/Spinner';
import { today, formatDate, getRecoveryColor } from '@/lib/utils';
import { getLevelForXP, getNextLevel, getXPProgress, ALL_BADGES } from '@/lib/gamification';

/* ---------- types ---------- */
interface User {
  name: string;
  position: string | null;
}

interface RecoveryData {
  recovery_score: number;
  status: string;
  acwr: number;
  recommendations?: string[];
  wellness_today?: boolean;
}

interface GamificationData {
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  badges_json: { badge_id: string; earned_at: string }[];
}

/* ---------- helper: card gradient class ---------- */
function getCardGradient(level: number): string {
  if (level <= 2) return 'card-gradient-silver';
  if (level <= 4) return 'card-gradient-blue';
  if (level <= 6) return 'card-gradient-purple';
  if (level <= 8) return 'card-gradient-gold';
  return 'card-gradient-legendary';
}

/* ---------- Match Readiness Ring ---------- */
function ReadinessRing({ score, status }: { score: number; status: string }) {
  const color = getRecoveryColor(status);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="bold" fill="white">
        {score}
      </text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="600" letterSpacing="0.5">
        READY
      </text>
    </svg>
  );
}

/* ---------- main ---------- */
export default function DashboardPage() {
  const router = useRouter();
  const todayStr = today();

  const [user, setUser] = useState<User | null>(null);
  const [recovery, setRecovery] = useState<RecoveryData | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  /* wellness */
  const [wellnessDone, setWellnessDone] = useState(false);
  const [wellnessSubmitting, setWellnessSubmitting] = useState(false);
  const [wellness, setWellness] = useState({ energy: 5, soreness: 5, fatigue: 5, mood: 5 });

  const fetchData = useCallback(async () => {
    try {
      const [userRes, recoveryRes, gamRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/recovery'),
        fetch('/api/gamification'),
      ]);

      if (!userRes.ok) { router.replace('/onboarding'); return; }

      setUser(await userRes.json());
      if (recoveryRes.ok) {
        const r = await recoveryRes.json();
        setRecovery(r);
        if (r.wellness_today) setWellnessDone(true);
      }
      if (gamRes.ok) setGamification(await gamRes.json());
    } catch { /* partial data ok */ }
    finally { setLoading(false); }
  }, [todayStr, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function submitWellness() {
    setWellnessSubmitting(true);
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wellness, date: todayStr }),
      });
      if (res.ok) {
        setWellnessDone(true);
        // Award XP
        fetch('/api/gamification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'wellness_checkin' }),
        }).then(r => r.ok ? r.json() : null).then(d => { if (d?.profile) setGamification(d.profile); });
        const rr = await fetch('/api/recovery');
        if (rr.ok) setRecovery(await rr.json());
      }
    } catch { /* ignore */ }
    finally { setWellnessSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Gamification calculations
  const totalXP = gamification?.total_xp ?? 0;
  const level = getLevelForXP(totalXP);
  const nextLevel = getNextLevel(totalXP);
  const xpProgress = getXPProgress(totalXP);
  const streak = gamification?.current_streak_days ?? 0;
  const badges = gamification?.badges_json ?? [];
  const readiness = recovery?.recovery_score ?? 0;
  const status = recovery?.status ?? 'green';

  return (
    <div className="max-w-lg mx-auto py-4 px-4 flex flex-col gap-4">
      {/* ===== PLAYER CARD ===== */}
      <div className={`${getCardGradient(level.level)} rounded-2xl p-5 relative overflow-hidden animate-fade-in`}>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          {/* Left: Player info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{level.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                LVL {level.level}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {user?.name ?? 'Player'}
            </h1>
            <p className="text-sm font-semibold text-white/60 mt-0.5">
              {user?.position ?? 'Footballer'} &middot; {level.title}
            </p>

            {/* XP Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/50 mb-1">
                <span>{totalXP.toLocaleString()} XP</span>
                {nextLevel && <span>{nextLevel.minXP.toLocaleString()} XP</span>}
              </div>
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${xpProgress.percentage}%`,
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                  }}
                />
              </div>
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <span className="animate-fire text-lg">&#128293;</span>
                <span className="text-sm font-black text-white">{streak} day streak</span>
              </div>
            )}
          </div>

          {/* Right: Match Readiness */}
          <div className="flex flex-col items-center">
            <ReadinessRing score={readiness} status={status} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider mt-1"
              style={{ color: getRecoveryColor(status) }}
            >
              {status === 'green' ? 'Match Fit' : status === 'amber' ? 'Caution' : 'Rest Up'}
            </span>
          </div>
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => router.push('/log')}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-4 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl">&#128221;</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Log Now</span>
        </button>
        <button
          onClick={() => router.push('/clubs')}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-4 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl">&#9917;</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>My Clubs</span>
        </button>
        <button
          onClick={() => router.push('/chat')}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-4 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl">&#129302;</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Coach AI</span>
        </button>
      </div>

      {/* ===== WELLNESS CHECK ===== */}
      {!wellnessDone && (
        <Card className="animate-fade-in">
          <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            How are you feeling? &#129300;
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Quick check-in = +10 XP
          </p>
          <div className="flex flex-col gap-4">
            <Slider label="Energy" value={wellness.energy} onChange={(v) => setWellness((p) => ({ ...p, energy: v }))} />
            <Slider label="Soreness" value={wellness.soreness} onChange={(v) => setWellness((p) => ({ ...p, soreness: v }))} />
            <Slider label="Fatigue" value={wellness.fatigue} onChange={(v) => setWellness((p) => ({ ...p, fatigue: v }))} />
            <Slider label="Mood" value={wellness.mood} onChange={(v) => setWellness((p) => ({ ...p, mood: v }))} max={5} />
          </div>
          <div className="mt-4">
            <Button fullWidth onClick={submitWellness} disabled={wellnessSubmitting}>
              {wellnessSubmitting ? 'Submitting...' : 'Submit Check-in ⚡'}
            </Button>
          </div>
        </Card>
      )}

      {/* ===== BADGES ===== */}
      <Card>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Achievements &#127942;
        </h2>
        {badges.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No badges yet — start logging to unlock achievements!
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {badges.slice(-10).map((b) => {
              const def = ALL_BADGES.find((d) => d.id === b.badge_id);
              if (!def) return null;
              return (
                <div key={b.badge_id} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-[9px] text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                    {def.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ===== ALL BADGE SLOTS (locked/unlocked) ===== */}
      <Card>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Badge Collection
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {ALL_BADGES.map((def) => {
            const earned = badges.some((b) => b.badge_id === def.id);
            return (
              <div key={def.id} className="flex flex-col items-center gap-1">
                <span className={`text-2xl ${earned ? '' : 'grayscale opacity-30'}`}>
                  {def.icon}
                </span>
                <span
                  className="text-[9px] text-center font-medium leading-tight"
                  style={{ color: earned ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                >
                  {def.name}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ===== RECOVERY TIPS ===== */}
      {recovery?.recommendations && recovery.recommendations.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Coach Tips &#128161;
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

      {/* ===== TODAY'S DATE ===== */}
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {formatDate(todayStr)}
      </p>
    </div>
  );
}
