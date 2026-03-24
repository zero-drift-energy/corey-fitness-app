'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { MEAL_TYPES, WATER_GLASS_ML, WATER_TARGET_ML } from '@/lib/constants';
import { today, formatDate } from '@/lib/utils';
import { calculateNutritionTarget } from '@/lib/calculations';
import type { NutritionLog, MealType, User, TrainingSession, DailyNutritionTarget } from '@/types';

// SVG ring progress component
function MacroRing({
  label,
  consumed,
  target,
  color,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit: string;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const radius = 36;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={88} height={88} className="-rotate-90">
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke="var(--bg-input)"
          strokeWidth={stroke}
        />
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 88, height: 88 }}>
        <span className="text-sm font-bold" style={{ color }}>{Math.round(consumed)}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ {target}{unit}</span>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

export default function NutritionPage() {
  const router = useRouter();
  const [meals, setMeals] = useState<NutritionLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [target, setTarget] = useState<DailyNutritionTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formMealType, setFormMealType] = useState<MealType>('breakfast');
  const [formDesc, setFormDesc] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  const todayStr = today();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, mealsRes, trainingRes] = await Promise.all([
        fetch('/api/user'),
        fetch(`/api/nutrition?date=${todayStr}`),
        fetch('/api/training?days=1'),
      ]);

      const userData: User | null = userRes.ok ? await userRes.json() : null;
      const mealsData: NutritionLog[] = mealsRes.ok ? await mealsRes.json() : [];
      const trainingData: TrainingSession[] = trainingRes.ok ? await trainingRes.json() : [];

      setUser(userData);
      setMeals(mealsData);

      // Calculate nutrition target
      const weight = userData?.weight_kg || 65;
      const todaySessions = trainingData.filter((s) => s.date === todayStr && !s.skipped);
      const hasTraining = todaySessions.length > 0;
      const isMatchDay = todaySessions.some((s) => s.session_type === 'match');
      setTarget(calculateNutritionTarget(weight, hasTraining, isMatchDay));

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregated consumed values
  const consumed = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0 };
    meals.forEach((m) => {
      totals.calories += m.calories || 0;
      totals.protein += m.protein_g || 0;
      totals.carbs += m.carbs_g || 0;
      totals.fat += m.fat_g || 0;
      totals.waterMl += m.water_ml || 0;
    });
    return totals;
  }, [meals]);

  const waterGlasses = Math.floor(consumed.waterMl / WATER_GLASS_ML);
  const waterTarget = target?.water_ml || WATER_TARGET_ML;
  const totalGlassesTarget = Math.ceil(waterTarget / WATER_GLASS_ML);

  async function addWater() {
    try {
      await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          meal_type: 'snack',
          description: 'Water',
          water_ml: WATER_GLASS_ML,
        }),
      });
      await fetchData();
    } catch {
      setError('Failed to log water');
    }
  }

  function resetForm() {
    setFormMealType('breakfast');
    setFormDesc('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          meal_type: formMealType,
          description: formDesc || null,
          calories: formCalories ? Number(formCalories) : null,
          protein_g: formProtein ? Number(formProtein) : null,
          carbs_g: formCarbs ? Number(formCarbs) : null,
          fat_g: formFat ? Number(formFat) : null,
          water_ml: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to log meal');
      setModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const mealTypeMap = useMemo(() => {
    const map: Record<string, { label: string; icon: string }> = {};
    MEAL_TYPES.forEach((t) => { map[t.value] = { label: t.label, icon: t.icon }; });
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
        <div>
          <h1 className="text-2xl font-bold">Nutrition &#127869;</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {formatDate(todayStr)}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="md">
          + Log Meal
        </Button>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card onClick={() => router.push('/meal-plan')} className="!p-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-xl" style={{ color: 'var(--accent)' }}>calendar_month</span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Meal Plan</span>
          </div>
        </Card>
        <Card onClick={() => router.push('/recipes')} className="!p-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-xl" style={{ color: '#f59e0b' }}>menu_book</span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Recipes</span>
          </div>
        </Card>
        <Card onClick={() => router.push('/grocery-list')} className="!p-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-xl" style={{ color: '#22c55e' }}>shopping_cart</span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Groceries</span>
          </div>
        </Card>
      </div>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Daily Calorie Target */}
      {target && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Daily Target
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              {target.calories} kcal
            </span>
          </div>
          {/* Calorie progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>{consumed.calories} consumed</span>
              <span>{Math.max(0, target.calories - consumed.calories)} remaining</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((consumed.calories / target.calories) * 100, 100)}%`,
                  backgroundColor: consumed.calories > target.calories ? '#ef4444' : 'var(--accent)',
                }}
              />
            </div>
          </div>

          {/* Macro rings */}
          <div className="flex justify-around">
            <div className="relative flex flex-col items-center">
              <MacroRing label="Protein" consumed={consumed.protein} target={target.protein_g} color="#3b82f6" unit="g" />
            </div>
            <div className="relative flex flex-col items-center">
              <MacroRing label="Carbs" consumed={consumed.carbs} target={target.carbs_g} color="#f59e0b" unit="g" />
            </div>
            <div className="relative flex flex-col items-center">
              <MacroRing label="Fat" consumed={consumed.fat} target={target.fat_g} color="#a855f7" unit="g" />
            </div>
          </div>
        </Card>
      )}

      {/* Hydration Tracker */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Hydration
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {consumed.waterMl}ml / {waterTarget}ml
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: totalGlassesTarget }).map((_, i) => (
            <span
              key={i}
              className="text-xl transition-opacity"
              style={{ opacity: i < waterGlasses ? 1 : 0.2 }}
            >
              &#128167;
            </span>
          ))}
          <button
            onClick={addWater}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            +
          </button>
        </div>
      </Card>

      {/* Today's Meals */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Today&apos;s Meals
        </h2>
        {meals.filter((m) => m.description && m.description !== 'Water').length === 0 ? (
          <Card>
            <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              No meals logged yet today. Tap &quot;Log Meal&quot; to start tracking.
            </p>
          </Card>
        ) : (
          meals.filter((m) => m.description && m.description !== 'Water').map((meal) => {
            const typeInfo = mealTypeMap[meal.meal_type] || { icon: '?', label: meal.meal_type };
            return (
              <Card key={meal.id}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{typeInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {typeInfo.label}
                        </p>
                        <p className="text-sm font-semibold truncate">{meal.description}</p>
                      </div>
                      {meal.calories && (
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                          {meal.calories} kcal
                        </span>
                      )}
                    </div>
                    {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
                      <div className="flex gap-3 mt-1">
                        {meal.protein_g != null && (
                          <span className="text-[10px] font-medium" style={{ color: '#3b82f6' }}>
                            P: {meal.protein_g}g
                          </span>
                        )}
                        {meal.carbs_g != null && (
                          <span className="text-[10px] font-medium" style={{ color: '#f59e0b' }}>
                            C: {meal.carbs_g}g
                          </span>
                        )}
                        {meal.fat_g != null && (
                          <span className="text-[10px] font-medium" style={{ color: '#a855f7' }}>
                            F: {meal.fat_g}g
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Log Meal Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Log Meal">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Meal Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Meal Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormMealType(t.value as MealType)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all"
                  style={{
                    backgroundColor: formMealType === t.value ? 'var(--accent)' : 'var(--bg-input)',
                    color: formMealType === t.value ? '#fff' : 'var(--text-primary)',
                    border: `2px solid ${formMealType === t.value ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="e.g. Chicken pasta with salad"
            required
          />

          <Input
            label="Calories (optional)"
            type="number"
            value={formCalories}
            onChange={(e) => setFormCalories(e.target.value)}
            placeholder="e.g. 450"
            min={0}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Protein (g)"
              type="number"
              value={formProtein}
              onChange={(e) => setFormProtein(e.target.value)}
              placeholder="0"
              min={0}
            />
            <Input
              label="Carbs (g)"
              type="number"
              value={formCarbs}
              onChange={(e) => setFormCarbs(e.target.value)}
              placeholder="0"
              min={0}
            />
            <Input
              label="Fat (g)"
              type="number"
              value={formFat}
              onChange={(e) => setFormFat(e.target.value)}
              placeholder="0"
              min={0}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : 'Save Meal'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
