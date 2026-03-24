'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { today, formatDate } from '@/lib/utils';

interface MealItem {
  meal_type: string;
  time: string;
  description: string;
  foods: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface HydrationItem {
  time: string;
  amount_ml: number;
  note: string;
}

interface PlanData {
  meals: MealItem[];
  hydration_plan: HydrationItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_water_ml: number;
  tips: string[];
}

interface StoredPlan {
  id: string;
  date: string;
  plan_json: PlanData;
  calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
  pre_training: '⚡',
  post_training: '🔄',
  morning_snack: '🍎',
  pre_match: '⚡',
  post_match: '🔄',
};

function getMealIcon(type: string): string {
  const key = type.toLowerCase().replace(/[\s-]/g, '_');
  return MEAL_ICONS[key] || '🍽️';
}

export default function MealPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);

  const fetchPlan = useCallback(async (date: string) => {
    // We don't have a GET endpoint for meal plans, so we just clear
    setPlan(null);
  }, []);

  useEffect(() => {
    fetchPlan(selectedDate);
  }, [selectedDate, fetchPlan]);

  async function generatePlan() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!res.ok) throw new Error('Failed to generate meal plan');
      const data = await res.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  async function logMealFromPlan(meal: MealItem) {
    const mealKey = meal.meal_type.toLowerCase().replace(/[\s-]/g, '_');
    setLoggingMeal(mealKey);
    try {
      // Map plan meal types to valid meal_type values
      let mealType = mealKey;
      if (!['breakfast', 'lunch', 'dinner', 'snack', 'pre_training', 'post_training'].includes(mealType)) {
        if (mealType.includes('snack')) mealType = 'snack';
        else if (mealType.includes('pre')) mealType = 'pre_training';
        else if (mealType.includes('post')) mealType = 'post_training';
        else mealType = 'snack';
      }

      await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          meal_type: mealType,
          description: `${meal.description} (${meal.foods.join(', ')})`,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          water_ml: 0,
        }),
      });
    } catch {
      setError('Failed to log meal');
    } finally {
      setLoggingMeal(null);
    }
  }

  async function addToGroceryList() {
    if (!plan?.plan_json?.meals) return;
    try {
      const items = plan.plan_json.meals.flatMap((m) => m.foods);
      await fetch('/api/grocery-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, source: 'meal_plan', date: selectedDate }),
      });
      router.push('/grocery-list');
    } catch {
      setError('Failed to add to grocery list');
    }
  }

  const planData = plan?.plan_json;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/nutrition')} className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <span className="material-symbols-outlined text-sm">arrow_back</span> Nutrition
          </button>
          <h1 className="text-2xl font-bold">Meal Planner</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            AI-powered daily meal plans
          </p>
        </div>
      </div>

      {/* Date Picker */}
      <Card>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
      </Card>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Generate Button */}
      {!planData && (
        <Button onClick={generatePlan} fullWidth size="lg" disabled={generating}>
          {generating ? (
            <span className="flex items-center gap-2"><Spinner size="sm" /> Generating Plan...</span>
          ) : (
            `Generate Plan for ${formatDate(selectedDate)}`
          )}
        </Button>
      )}

      {/* Plan Content */}
      {planData && (
        <>
          {/* Summary Card */}
          <Card>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Daily Totals
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{planData.total_calories}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>{planData.total_protein_g}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protein</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{planData.total_carbs_g}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Carbs</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#a855f7' }}>{planData.total_fat_g}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fat</p>
              </div>
            </div>
          </Card>

          {/* Meals */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Meals</h2>
              <Button onClick={addToGroceryList} variant="secondary" size="sm">
                <span className="material-symbols-outlined text-sm">shopping_cart</span> Grocery List
              </Button>
            </div>

            {planData.meals.map((meal, idx) => {
              const mealKey = meal.meal_type.toLowerCase().replace(/[\s-]/g, '_');
              return (
                <Card key={idx}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{getMealIcon(meal.meal_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium capitalize" style={{ color: 'var(--text-muted)' }}>
                              {meal.meal_type.replace(/_/g, ' ')}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                              {meal.time}
                            </span>
                          </div>
                          <p className="text-sm font-semibold mt-0.5">{meal.description}</p>
                        </div>
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                          {meal.calories} kcal
                        </span>
                      </div>

                      {/* Food items */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {meal.foods.map((food, fi) => (
                          <span key={fi} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                            {food}
                          </span>
                        ))}
                      </div>

                      {/* Macros + Log button */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-3">
                          <span className="text-[10px] font-medium" style={{ color: '#3b82f6' }}>P: {meal.protein_g}g</span>
                          <span className="text-[10px] font-medium" style={{ color: '#f59e0b' }}>C: {meal.carbs_g}g</span>
                          <span className="text-[10px] font-medium" style={{ color: '#a855f7' }}>F: {meal.fat_g}g</span>
                        </div>
                        <button
                          onClick={() => logMealFromPlan(meal)}
                          disabled={loggingMeal === mealKey}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                          {loggingMeal === mealKey ? 'Logging...' : 'Log This'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Hydration Plan */}
          {planData.hydration_plan && planData.hydration_plan.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Hydration Plan ({planData.total_water_ml}ml total)
              </h2>
              <div className="flex flex-col gap-2">
                {planData.hydration_plan.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                      {h.time}
                    </span>
                    <span className="font-medium" style={{ color: '#3b82f6' }}>{h.amount_ml}ml</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.note}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tips */}
          {planData.tips && planData.tips.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Nutrition Tips
              </h2>
              <ul className="flex flex-col gap-2">
                {planData.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent)' }}>•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Regenerate */}
          <Button onClick={generatePlan} variant="secondary" fullWidth size="md" disabled={generating}>
            {generating ? <Spinner size="sm" /> : 'Regenerate Plan'}
          </Button>
        </>
      )}
    </div>
  );
}
