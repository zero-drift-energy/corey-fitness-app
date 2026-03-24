'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Slider from '@/components/ui/Slider';
import Spinner from '@/components/ui/Spinner';
import {
  SESSION_TYPES, MEAL_TYPES, DEFAULT_SESSION_DURATIONS, DEFAULT_SESSION_INTENSITY, SKIP_REASONS,
} from '@/lib/constants';
import { today, formatDate } from '@/lib/utils';
import type { SessionType, MealType, FavouriteMeal, FoodAnalysis, FoodLookupItem, NutritionLog } from '@/types';

/* ---------- types ---------- */
interface GamificationData {
  current_streak_days: number;
  total_xp: number;
}

interface WellnessStatus {
  wellness_today?: boolean;
}

/* ---------- main ---------- */
export default function LogPage() {
  const todayStr = today();

  // Data state
  const [streak, setStreak] = useState(0);
  const [todayXp, setTodayXp] = useState(0);
  const [wellnessDone, setWellnessDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  // Nutrition sub-mode
  const [nutritionMode, setNutritionMode] = useState<'snap' | 'type' | 'search' | 'favourites' | null>(null);

  // Training form
  const [formType, setFormType] = useState<SessionType>('team_training');
  const [formDate, setFormDate] = useState(todayStr);
  const [formDuration, setFormDuration] = useState(DEFAULT_SESSION_DURATIONS.team_training);
  const [formIntensity, setFormIntensity] = useState(DEFAULT_SESSION_INTENSITY.team_training);
  const [formSkipped, setFormSkipped] = useState(false);
  const [formSkipReason, setFormSkipReason] = useState('fatigue');
  const [formTrainingNotes, setFormTrainingNotes] = useState('');
  const [trainingSubmitting, setTrainingSubmitting] = useState(false);

  // Sleep form
  const [sleepDate, setSleepDate] = useState(todayStr);
  const [sleepBedtime, setSleepBedtime] = useState('22:00');
  const [sleepWakeTime, setSleepWakeTime] = useState('07:00');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepNotes, setSleepNotes] = useState('');
  const [sleepSubmitting, setSleepSubmitting] = useState(false);

  // Nutrition AI form
  const [nutritionText, setNutritionText] = useState('');
  const [nutritionAnalyzing, setNutritionAnalyzing] = useState(false);
  const [nutritionResult, setNutritionResult] = useState<FoodAnalysis | null>(null);
  const [nutritionMealType, setNutritionMealType] = useState<MealType>('lunch');
  const [nutritionSaving, setNutritionSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState(false);
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Favourites
  const [favourites, setFavourites] = useState<FavouriteMeal[]>([]);
  const [favouritesLoading, setFavouritesLoading] = useState(false);

  // Food lookup
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<FoodLookupItem[]>([]);
  const [lookupSearching, setLookupSearching] = useState(false);

  // Auto-suggest for "Type It"
  const [typeSuggestions, setTypeSuggestions] = useState<FoodLookupItem[]>([]);
  const [typeSuggestLoading, setTypeSuggestLoading] = useState(false);
  const typeSuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Food diary
  const [diaryEntries, setDiaryEntries] = useState<NutritionLog[]>([]);

  // Wellness
  const [wellness, setWellness] = useState({ energy: 5, soreness: 5, fatigue: 5, mood: 5 });
  const [wellnessSubmitting, setWellnessSubmitting] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  /* ---------- data fetch ---------- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [gamRes, recoveryRes, diaryRes] = await Promise.all([
        fetch('/api/gamification'),
        fetch('/api/recovery'),
        fetch(`/api/nutrition?date=${todayStr}`),
      ]);

      if (gamRes.ok) {
        const gam: GamificationData = await gamRes.json();
        setStreak(gam.current_streak_days || 0);
        setTodayXp(gam.total_xp || 0);
      }

      if (recoveryRes.ok) {
        const rec: WellnessStatus = await recoveryRes.json();
        if (rec.wellness_today) setWellnessDone(true);
      }

      if (diaryRes.ok) {
        const entries: NutritionLog[] = await diaryRes.json();
        setDiaryEntries(entries);
      }
    } catch {
      // partial data is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- sleep duration ---------- */
  const sleepDuration = useMemo(() => {
    try {
      const [bh, bm] = sleepBedtime.split(':').map(Number);
      const [wh, wm] = sleepWakeTime.split(':').map(Number);
      let bedMins = bh * 60 + bm;
      let wakeMins = wh * 60 + wm;
      if (wakeMins <= bedMins) wakeMins += 24 * 60;
      return wakeMins - bedMins;
    } catch {
      return 0;
    }
  }, [sleepBedtime, sleepWakeTime]);

  const sleepHoursStr = useMemo(() => {
    const h = Math.floor(sleepDuration / 60);
    const m = sleepDuration % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, [sleepDuration]);

  /* ---------- training handlers ---------- */
  function handleTrainingTypeChange(type: SessionType) {
    setFormType(type);
    setFormDuration(DEFAULT_SESSION_DURATIONS[type] || 60);
    setFormIntensity(DEFAULT_SESSION_INTENSITY[type] || 6);
  }

  function resetTrainingForm() {
    setFormType('team_training');
    setFormDate(todayStr);
    setFormDuration(DEFAULT_SESSION_DURATIONS.team_training);
    setFormIntensity(DEFAULT_SESSION_INTENSITY.team_training);
    setFormSkipped(false);
    setFormSkipReason('fatigue');
    setFormTrainingNotes('');
  }

  async function submitTraining(e: React.FormEvent) {
    e.preventDefault();
    setTrainingSubmitting(true);
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
          notes: formTrainingNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to log session');
      setTrainingOpen(false);
      resetTrainingForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setTrainingSubmitting(false);
    }
  }

  /* ---------- sleep handlers ---------- */
  function resetSleepForm() {
    setSleepDate(todayStr);
    setSleepBedtime('22:00');
    setSleepWakeTime('07:00');
    setSleepQuality(3);
    setSleepNotes('');
  }

  async function submitSleep(e: React.FormEvent) {
    e.preventDefault();
    setSleepSubmitting(true);
    try {
      const bedDatetime = `${sleepDate}T${sleepBedtime}:00`;
      const [bh] = sleepBedtime.split(':').map(Number);
      const [wh] = sleepWakeTime.split(':').map(Number);
      let wakeDate = sleepDate;
      if (wh < bh || (wh === bh && sleepWakeTime <= sleepBedtime)) {
        const d = new Date(sleepDate);
        d.setDate(d.getDate() + 1);
        wakeDate = d.toISOString().slice(0, 10);
      }
      const wakeDatetime = `${wakeDate}T${sleepWakeTime}:00`;

      const res = await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: sleepDate,
          bedtime: bedDatetime,
          wake_time: wakeDatetime,
          duration_minutes: sleepDuration,
          quality: sleepQuality,
          notes: sleepNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to log sleep');
      setSleepOpen(false);
      resetSleepForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSleepSubmitting(false);
    }
  }

  /* ---------- nutrition handlers ---------- */
  function resetNutrition() {
    setNutritionMode(null);
    setNutritionText('');
    setNutritionResult(null);
    setPhotoPreview(null);
    setEditingResult(false);
    setEditCalories('');
    setEditProtein('');
    setEditCarbs('');
    setEditFat('');
    setLookupQuery('');
    setLookupResults([]);
    setTypeSuggestions([]);
    setTypeSuggestLoading(false);
    if (typeSuggestTimer.current) clearTimeout(typeSuggestTimer.current);
  }

  function handleTypeInput(text: string) {
    setNutritionText(text);
    setTypeSuggestions([]);
    if (typeSuggestTimer.current) clearTimeout(typeSuggestTimer.current);
    if (text.trim().length < 2) {
      setTypeSuggestLoading(false);
      return;
    }
    setTypeSuggestLoading(true);
    typeSuggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/food-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setTypeSuggestions(data.results || []);
        }
      } catch { /* silent */ }
      finally { setTypeSuggestLoading(false); }
    }, 600);
  }

  function selectTypeSuggestion(item: FoodLookupItem) {
    setNutritionResult({
      food_name: `${item.food_name} (${item.serving_size})`,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      confidence: 'high',
    });
    setEditCalories(String(item.calories));
    setEditProtein(String(item.protein_g));
    setEditCarbs(String(item.carbs_g));
    setEditFat(String(item.fat_g));
    setTypeSuggestions([]);
    setNutritionText('');
  }

  async function analyzeText() {
    if (!nutritionText.trim()) return;
    setNutritionAnalyzing(true);
    try {
      const res = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nutritionText }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const result: FoodAnalysis = await res.json();
      setNutritionResult(result);
      setEditCalories(String(result.calories));
      setEditProtein(String(result.protein_g));
      setEditCarbs(String(result.carbs_g));
      setEditFat(String(result.fat_g));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setNutritionAnalyzing(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setPhotoPreview(base64);
      setNutritionAnalyzing(true);
      try {
        const res = await fetch('/api/nutrition/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (!res.ok) throw new Error('Analysis failed');
        const result: FoodAnalysis = await res.json();
        setNutritionResult(result);
        setEditCalories(String(result.calories));
        setEditProtein(String(result.protein_g));
        setEditCarbs(String(result.carbs_g));
        setEditFat(String(result.fat_g));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze photo');
      } finally {
        setNutritionAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveNutritionResult() {
    if (!nutritionResult) return;
    setNutritionSaving(true);
    try {
      const cals = editingResult ? Number(editCalories) : nutritionResult.calories;
      const prot = editingResult ? Number(editProtein) : nutritionResult.protein_g;
      const carb = editingResult ? Number(editCarbs) : nutritionResult.carbs_g;
      const fat = editingResult ? Number(editFat) : nutritionResult.fat_g;

      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          meal_type: nutritionMealType,
          description: nutritionResult.food_name,
          calories: cals,
          protein_g: prot,
          carbs_g: carb,
          fat_g: fat,
          water_ml: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setNutritionOpen(false);
      resetNutrition();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNutritionSaving(false);
    }
  }

  async function loadFavourites() {
    setFavouritesLoading(true);
    try {
      const res = await fetch('/api/nutrition/favourites');
      if (res.ok) {
        const data: FavouriteMeal[] = await res.json();
        setFavourites(data);
      }
    } catch {
      // silent
    } finally {
      setFavouritesLoading(false);
    }
  }

  async function searchFood() {
    if (!lookupQuery.trim()) return;
    setLookupSearching(true);
    setLookupResults([]);
    try {
      const res = await fetch('/api/food-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: lookupQuery }),
      });
      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();
      setLookupResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
    } finally {
      setLookupSearching(false);
    }
  }

  function selectLookupItem(item: FoodLookupItem) {
    setNutritionResult({
      food_name: `${item.food_name} (${item.serving_size})`,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      confidence: 'high',
    });
    setEditCalories(String(item.calories));
    setEditProtein(String(item.protein_g));
    setEditCarbs(String(item.carbs_g));
    setEditFat(String(item.fat_g));
    setLookupResults([]);
    setLookupQuery('');
  }

  async function logFavourite(fav: FavouriteMeal) {
    setNutritionSaving(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          meal_type: nutritionMealType,
          description: fav.name,
          calories: fav.calories,
          protein_g: fav.protein_g,
          carbs_g: fav.carbs_g,
          fat_g: fav.fat_g,
          water_ml: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to log');
      setNutritionOpen(false);
      resetNutrition();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNutritionSaving(false);
    }
  }

  /* ---------- wellness ---------- */
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
        await fetchData();
      }
    } catch {
      // silent
    } finally {
      setWellnessSubmitting(false);
    }
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const confidenceColor = (c: string) => {
    if (c === 'high') return '#22c55e';
    if (c === 'medium') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Log</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {formatDate(todayStr)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
            &#9889; {todayXp} XP
          </span>
          <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
            &#128293; {streak}
          </span>
        </div>
      </div>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs mt-1 underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Dismiss
          </button>
        </Card>
      )}

      {/* Main Action Cards */}
      <div className="flex flex-col gap-3">
        {/* Training */}
        <Card
          onClick={() => setTrainingOpen(true)}
          className="!p-5"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)', opacity: 0.9 }}
            >
              &#9917;
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Training</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Log a training session or match</p>
            </div>
            <span className="text-lg" style={{ color: 'var(--text-muted)' }}>&#8250;</span>
          </div>
        </Card>

        {/* Nutrition */}
        <Card
          onClick={() => {
            setNutritionOpen(true);
            setNutritionMode(null);
          }}
          className="!p-5"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: '#22c55e' }}
            >
              &#127869;
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Nutrition</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Snap, type, or pick a favourite</p>
            </div>
            <span className="text-lg" style={{ color: 'var(--text-muted)' }}>&#8250;</span>
          </div>
        </Card>

        {/* Sleep */}
        <Card
          onClick={() => setSleepOpen(true)}
          className="!p-5"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: '#6366f1' }}
            >
              &#128564;
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Sleep</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Log last night&apos;s sleep</p>
            </div>
            <span className="text-lg" style={{ color: 'var(--text-muted)' }}>&#8250;</span>
          </div>
        </Card>
      </div>

      {/* Wellness Check-in */}
      {!wellnessDone && (
        <Card>
          <h2 className="text-sm font-semibold mb-1">How are you feeling? &#129300;</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Quick daily check-in to personalise your recovery
          </p>
          <div className="flex flex-col gap-4">
            <Slider label="Energy" value={wellness.energy} onChange={(v) => setWellness((p) => ({ ...p, energy: v }))} />
            <Slider label="Soreness" value={wellness.soreness} onChange={(v) => setWellness((p) => ({ ...p, soreness: v }))} />
            <Slider label="Fatigue" value={wellness.fatigue} onChange={(v) => setWellness((p) => ({ ...p, fatigue: v }))} />
            <Slider label="Mood" value={wellness.mood} onChange={(v) => setWellness((p) => ({ ...p, mood: v }))} />
          </div>
          <div className="mt-4">
            <Button fullWidth onClick={submitWellness} disabled={wellnessSubmitting}>
              {wellnessSubmitting ? <Spinner size="sm" /> : 'Submit Check-in'}
            </Button>
          </div>
        </Card>
      )}

      {/* ========== FOOD DIARY ========== */}
      {diaryEntries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline font-bold text-base tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" style={{ color: 'var(--secondary)' }}>restaurant</span>
              Today&apos;s Food Diary
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {diaryEntries.reduce((sum, e) => sum + (e.calories || 0), 0)} kcal
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {diaryEntries.map((entry) => {
              const time = new Date(entry.created_at);
              const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const mealIcon: Record<string, string> = {
                breakfast: '\uD83C\uDF73', lunch: '\uD83C\uDF1E', dinner: '\uD83C\uDF19',
                snack: '\uD83C\uDF4E', pre_training: '\u26A1', post_training: '\uD83D\uDD04',
              };
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-lg flex-shrink-0">{mealIcon[entry.meal_type] || '\uD83C\uDF7D'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.description || entry.meal_type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {timeStr}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>&middot;</span>
                      <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                        {entry.meal_type.replace('_', '-')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold font-headline" style={{ color: 'var(--accent)' }}>
                      {entry.calories || 0}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
                  </div>
                </div>
              );
            })}
          </div>
          {diaryEntries.length > 0 && (
            <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-[11px]" style={{ color: '#3b82f6' }}>
                P {diaryEntries.reduce((s, e) => s + (e.protein_g || 0), 0)}g
              </span>
              <span className="text-[11px]" style={{ color: '#f59e0b' }}>
                C {diaryEntries.reduce((s, e) => s + (e.carbs_g || 0), 0)}g
              </span>
              <span className="text-[11px]" style={{ color: '#a855f7' }}>
                F {diaryEntries.reduce((s, e) => s + (e.fat_g || 0), 0)}g
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ========== TRAINING MODAL ========== */}
      <Modal isOpen={trainingOpen} onClose={() => { setTrainingOpen(false); resetTrainingForm(); }} title="Log Training Session">
        <form onSubmit={submitTraining} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Session Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTrainingTypeChange(t.value as SessionType)}
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

          <Input label="Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
          <Input label="Duration (minutes)" type="number" value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))} min={0} max={300} required />
          <Slider label="Intensity (RPE)" value={formIntensity} onChange={setFormIntensity} min={1} max={10} colorMode="intensity" />

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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
            <textarea
              value={formTrainingNotes}
              onChange={(e) => setFormTrainingNotes(e.target.value)}
              rows={3}
              placeholder="How did it go?"
              className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={trainingSubmitting}>
            {trainingSubmitting ? <Spinner size="sm" /> : 'Save Session'}
          </Button>
        </form>
      </Modal>

      {/* ========== SLEEP MODAL ========== */}
      <Modal isOpen={sleepOpen} onClose={() => { setSleepOpen(false); resetSleepForm(); }} title="Log Sleep">
        <form onSubmit={submitSleep} className="flex flex-col gap-4">
          <Input label="Date" type="date" value={sleepDate} onChange={(e) => setSleepDate(e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Bedtime" type="time" value={sleepBedtime} onChange={(e) => setSleepBedtime(e.target.value)} required />
            <Input label="Wake Time" type="time" value={sleepWakeTime} onChange={(e) => setSleepWakeTime(e.target.value)} required />
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Duration</span>
              <span
                className="text-lg font-bold"
                style={{ color: sleepDuration >= 540 ? '#22c55e' : sleepDuration >= 420 ? '#f59e0b' : '#ef4444' }}
              >
                {sleepHoursStr}
              </span>
            </div>
          </Card>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sleep Quality</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSleepQuality(star)}
                  className="text-3xl transition-transform active:scale-110"
                  style={{ opacity: star <= sleepQuality ? 1 : 0.25, color: '#f59e0b' }}
                >
                  &#9733;
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
            <textarea
              value={sleepNotes}
              onChange={(e) => setSleepNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Woke up once during the night"
              className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={sleepSubmitting}>
            {sleepSubmitting ? <Spinner size="sm" /> : 'Save Sleep Log'}
          </Button>
        </form>
      </Modal>

      {/* ========== NUTRITION MODAL ========== */}
      <Modal
        isOpen={nutritionOpen}
        onClose={() => { setNutritionOpen(false); resetNutrition(); }}
        title="Log Nutrition"
      >
        <div className="flex flex-col gap-4">
          {/* Meal type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Meal Type</label>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setNutritionMealType(t.value as MealType)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all"
                  style={{
                    backgroundColor: nutritionMealType === t.value ? 'var(--accent)' : 'var(--bg-input)',
                    color: nutritionMealType === t.value ? '#fff' : 'var(--text-primary)',
                    border: `2px solid ${nutritionMealType === t.value ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode selection (if no result yet) */}
          {!nutritionResult && !nutritionAnalyzing && (
            <>
              {nutritionMode === null && (
                <div className="flex flex-col gap-2">
                  <Button
                    fullWidth
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setNutritionMode('snap');
                      fileInputRef.current?.click();
                    }}
                  >
                    &#128247; Snap It
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    size="lg"
                    onClick={() => setNutritionMode('type')}
                  >
                    &#9997;&#65039; Type It
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    size="lg"
                    onClick={() => setNutritionMode('search')}
                  >
                    &#128269; Search It
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setNutritionMode('favourites');
                      loadFavourites();
                    }}
                  >
                    &#11088; Favourites
                  </Button>
                </div>
              )}

              {/* Type It input with auto-suggest */}
              {nutritionMode === 'type' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      What did you eat?
                    </label>
                    <input
                      value={nutritionText}
                      onChange={(e) => handleTypeInput(e.target.value)}
                      placeholder="Start typing... e.g. chicken breast"
                      autoFocus
                      className="rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        '--tw-ring-color': 'var(--accent)',
                      } as React.CSSProperties}
                    />
                  </div>

                  {typeSuggestLoading && (
                    <div className="flex items-center gap-2 py-2">
                      <Spinner size="sm" />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Finding suggestions...</span>
                    </div>
                  )}

                  {typeSuggestions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Suggestions
                      </p>
                      {typeSuggestions.map((item, i) => (
                        <Card key={i} onClick={() => selectTypeSuggestion(item)} className="!p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{item.food_name}</p>
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.serving_size}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{item.calories}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[11px]" style={{ color: '#3b82f6' }}>P {item.protein_g}g</span>
                            <span className="text-[11px]" style={{ color: '#f59e0b' }}>C {item.carbs_g}g</span>
                            <span className="text-[11px]" style={{ color: '#a855f7' }}>F {item.fat_g}g</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {nutritionText.trim().length >= 2 && !typeSuggestLoading && typeSuggestions.length === 0 && (
                    <Button fullWidth onClick={analyzeText} disabled={!nutritionText.trim()}>
                      Analyze Full Meal \u26A1
                    </Button>
                  )}

                  <Button variant="ghost" onClick={() => { setNutritionMode(null); setTypeSuggestions([]); setNutritionText(''); }}>
                    Back
                  </Button>
                </div>
              )}

              {/* Search It input */}
              {nutritionMode === 'search' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Search for a food
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') searchFood(); }}
                        placeholder="e.g. chicken breast, banana, pasta"
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                      <Button onClick={searchFood} disabled={!lookupQuery.trim() || lookupSearching}>
                        {lookupSearching ? <Spinner size="sm" /> : 'Go'}
                      </Button>
                    </div>
                  </div>

                  {lookupSearching && (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Spinner size="md" />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Looking up nutrition info...</p>
                    </div>
                  )}

                  {lookupResults.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        Tap to select &middot; {lookupResults.length} result{lookupResults.length !== 1 ? 's' : ''}
                      </p>
                      {lookupResults.map((item, i) => (
                        <Card key={i} onClick={() => selectLookupItem(item)} className="!p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{item.food_name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {item.serving_size}
                              </p>
                            </div>
                            <p className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                              {item.calories} kcal
                            </p>
                          </div>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-[11px]" style={{ color: '#3b82f6' }}>P {item.protein_g}g</span>
                            <span className="text-[11px]" style={{ color: '#f59e0b' }}>C {item.carbs_g}g</span>
                            <span className="text-[11px]" style={{ color: '#a855f7' }}>F {item.fat_g}g</span>
                          </div>
                          {item.key_nutrients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.key_nutrients.map((n, j) => (
                                <span
                                  key={j}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}

                  <Button variant="ghost" onClick={() => { setNutritionMode(null); setLookupQuery(''); setLookupResults([]); }}>
                    Back
                  </Button>
                </div>
              )}

              {/* Snap It - photo preview area */}
              {nutritionMode === 'snap' && photoPreview && (
                <div className="flex flex-col gap-3">
                  <img
                    src={photoPreview}
                    alt="Food photo"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Analyzing your photo...
                  </p>
                </div>
              )}

              {nutritionMode === 'snap' && !photoPreview && (
                <div className="flex flex-col gap-2 items-center py-4">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Take or choose a photo of your meal
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    &#128247; Open Camera
                  </Button>
                  <Button variant="ghost" onClick={() => setNutritionMode(null)}>Back</Button>
                </div>
              )}

              {/* Favourites list */}
              {nutritionMode === 'favourites' && (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setNutritionMode(null)}>
                    &#8592; Back
                  </Button>
                  {favouritesLoading ? (
                    <div className="flex justify-center py-6"><Spinner size="md" /></div>
                  ) : favourites.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                      No favourites saved yet. Log meals from the Nutrition page to build your list.
                    </p>
                  ) : (
                    favourites.map((fav) => (
                      <Card key={fav.id} onClick={() => logFavourite(fav)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{fav.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {fav.calories} kcal &middot; P {fav.protein_g}g &middot; C {fav.carbs_g}g &middot; F {fav.fat_g}g
                            </p>
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {fav.times_logged}x
                          </span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Analyzing spinner */}
          {nutritionAnalyzing && (
            <div className="flex flex-col items-center gap-3 py-6">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Food photo"
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              <Spinner size="lg" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Analyzing your food...
              </p>
            </div>
          )}

          {/* Analysis result */}
          {nutritionResult && !nutritionAnalyzing && (
            <div className="flex flex-col gap-3">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Food photo"
                  className="w-full h-36 object-cover rounded-xl"
                />
              )}

              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold">{nutritionResult.food_name}</h3>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${confidenceColor(nutritionResult.confidence)}22`,
                      color: confidenceColor(nutritionResult.confidence),
                    }}
                  >
                    {nutritionResult.confidence}
                  </span>
                </div>

                {/* Items breakdown */}
                {nutritionResult.items && nutritionResult.items.length > 1 && (
                  <div className="flex flex-col gap-1 mb-3">
                    {nutritionResult.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{item.name}</span>
                        <span>{item.calories} kcal</span>
                      </div>
                    ))}
                    <div
                      className="h-px my-1"
                      style={{ backgroundColor: 'var(--border)' }}
                    />
                  </div>
                )}

                {/* Total macros */}
                {!editingResult ? (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        {nutritionResult.calories}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                        {nutritionResult.protein_g}g
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>
                        {nutritionResult.carbs_g}g
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#a855f7' }}>
                        {nutritionResult.fat_g}g
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fat</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <Input label="kcal" type="number" value={editCalories} onChange={(e) => setEditCalories(e.target.value)} min={0} />
                    <Input label="P (g)" type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} min={0} />
                    <Input label="C (g)" type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} min={0} />
                    <Input label="F (g)" type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)} min={0} />
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    if (editingResult) {
                      setEditingResult(false);
                    } else {
                      setEditingResult(true);
                    }
                  }}
                >
                  {editingResult ? 'Done Editing' : 'Adjust'}
                </Button>
                <Button
                  fullWidth
                  onClick={saveNutritionResult}
                  disabled={nutritionSaving}
                >
                  {nutritionSaving ? <Spinner size="sm" /> : 'Looks Good! \u2705'}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNutritionResult(null);
                  setPhotoPreview(null);
                  setNutritionMode(null);
                  setEditingResult(false);
                }}
              >
                Start Over
              </Button>
            </div>
          )}
        </div>

        {/* Hidden file input for camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </Modal>
    </div>
  );
}
