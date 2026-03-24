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
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(173,198,255,0.1)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="bold" fill="#dae2fd" fontFamily="Space Grotesk">
        {score}
      </text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill="rgba(218,226,253,0.5)" fontWeight="700" letterSpacing="2" fontFamily="Inter">
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
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* ===== HERO WELCOME ===== */}
      <section className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: 'rgba(173,198,255,0.5)' }}
        >
          Status: Elite Training
        </p>
        <h1 className="text-4xl font-bold tracking-tighter font-headline" style={{ color: 'var(--text-primary)' }}>
          Welcome back,{' '}
          <span className="italic" style={{ color: 'var(--secondary)' }}>
            {user?.name ?? 'Player'}
          </span>
        </h1>
      </section>

      {/* ===== PLAYER CARD ===== */}
      <div className={`${getCardGradient(level.level)} rounded-xl p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          {/* Left: Player info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest"
                style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary)' }}
              >
                {level.title}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                LVL {level.level}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter font-headline mt-2 uppercase">
              {user?.name ?? 'Player'}
            </h2>
            <p className="text-sm font-semibold text-white/50 mt-0.5">
              {user?.position ?? 'Footballer'}
            </p>

            {/* XP Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                <span>{totalXP.toLocaleString()} XP</span>
                {nextLevel && <span>{nextLevel.minXP.toLocaleString()} XP</span>}
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${xpProgress.percentage}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--secondary))',
                  }}
                />
              </div>
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="animate-fire text-lg">&#128293;</span>
                <span className="text-sm font-black text-white uppercase tracking-wider">{streak} day streak</span>
              </div>
            )}
          </div>

          {/* Right: Match Readiness */}
          <div className="flex flex-col items-center">
            <ReadinessRing score={readiness} status={status} />
            <span
              className="text-[10px] font-bold uppercase tracking-widest mt-1"
              style={{ color: getRecoveryColor(status) }}
            >
              {status === 'green' ? 'Match Fit' : status === 'amber' ? 'Caution' : 'Rest Up'}
            </span>
          </div>
        </div>
      </div>

      {/* ===== PERFORMANCE STATS ===== */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-4 rounded-xl flex flex-col justify-between h-24 border-l-2"
          style={{ backgroundColor: 'var(--bg-card)', borderLeftColor: 'rgba(173,198,255,0.3)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Training Streak
          </span>
          <span className="text-2xl font-bold font-headline" style={{ color: 'var(--text-primary)' }}>
            {streak} <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>DAYS</span>
          </span>
        </div>
        <div
          className="p-4 rounded-xl flex flex-col justify-between h-24 border-l-2"
          style={{ backgroundColor: 'var(--bg-card)', borderLeftColor: 'rgba(255,224,131,0.3)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Total XP
          </span>
          <span className="text-2xl font-bold font-headline" style={{ color: 'var(--secondary)' }}>
            {totalXP.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => router.push('/log')}
          className="flex flex-col items-center gap-2 rounded-xl py-5 transition-all active:scale-95 hover:brightness-110"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--accent)' }}>edit_note</span>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Log Now</span>
        </button>
        <button
          onClick={() => router.push('/clubs')}
          className="flex flex-col items-center gap-2 rounded-xl py-5 transition-all active:scale-95 hover:brightness-110"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--secondary)' }}>sports_soccer</span>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>My Clubs</span>
        </button>
        <button
          onClick={() => router.push('/chat')}
          className="flex flex-col items-center gap-2 rounded-xl py-5 transition-all active:scale-95 hover:brightness-110"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--tertiary)' }}>smart_toy</span>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Coach AI</span>
        </button>
      </div>

      {/* ===== WELLNESS CHECK ===== */}
      {!wellnessDone && (
        <Card className="animate-fade-in !border-l-2" style={{ borderLeftColor: 'var(--accent)' }}>
          <h2 className="font-headline font-bold text-lg tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            How are you feeling?
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
              {wellnessSubmitting ? 'Submitting...' : 'Submit Check-in'}
            </Button>
          </div>
        </Card>
      )}

      {/* ===== ACHIEVEMENTS ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-bold text-xl tracking-tight flex items-center gap-2">
            <span className="w-1 h-5" style={{ backgroundColor: 'var(--accent)' }} />
            ACHIEVEMENTS
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            {badges.length} Earned
          </span>
        </div>
        {badges.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No badges yet — start logging to unlock achievements!
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {badges.slice(-10).map((b) => {
              const def = ALL_BADGES.find((d) => d.id === b.badge_id);
              if (!def) return null;
              return (
                <div key={b.badge_id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-full aspect-square rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span className="text-2xl">{def.icon}</span>
                  </div>
                  <span className="text-[9px] text-center font-bold uppercase tracking-tighter" style={{ color: 'var(--text-muted)' }}>
                    {def.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ===== BADGE COLLECTION ===== */}
      <Card>
        <h2 className="font-headline font-bold text-xl tracking-tight mb-4 flex items-center gap-2">
          <span className="w-1 h-5" style={{ backgroundColor: 'var(--secondary)' }} />
          BADGE COLLECTION
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {ALL_BADGES.map((def) => {
            const earned = badges.some((b) => b.badge_id === def.id);
            return (
              <div key={def.id} className="flex flex-col items-center gap-1.5 group">
                <div
                  className={`w-full aspect-square rounded-xl flex items-center justify-center transition-colors ${
                    earned ? '' : 'opacity-40 grayscale'
                  }`}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                >
                  {earned ? (
                    <span className="text-2xl">{def.icon}</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>lock</span>
                  )}
                </div>
                <span
                  className="text-[9px] text-center font-bold leading-tight uppercase tracking-tighter"
                  style={{ color: earned ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: earned ? 1 : 0.6 }}
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
        <Card className="!border-l-2" style={{ borderLeftColor: 'var(--accent)' }}>
          <h3
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--accent)' }}
          >
            Coach Tips
          </h3>
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
      <p
        className="text-center text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {formatDate(todayStr)}
      </p>
    </div>
  );
}
