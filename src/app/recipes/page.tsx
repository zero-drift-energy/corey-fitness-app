'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface Ingredient {
  item: string;
  amount: string;
}

interface Recipe {
  name: string;
  description: string;
  prep_time_mins: number;
  cook_time_mins: number;
  difficulty: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
}

const FOCUS_OPTIONS = [
  { value: 'general', label: 'All Recipes', icon: '🍽️' },
  { value: 'high_protein', label: 'High Protein', icon: '💪' },
  { value: 'pre_training', label: 'Pre-Training', icon: '⚡' },
  { value: 'recovery', label: 'Recovery', icon: '🔄' },
  { value: 'quick', label: 'Quick & Easy', icon: '⏱️' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState('general');
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [addingToList, setAddingToList] = useState<number | null>(null);

  async function fetchRecipes(selectedFocus: string) {
    setLoading(true);
    setError(null);
    setRecipes([]);
    setExpandedRecipe(null);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: selectedFocus }),
      });
      if (!res.ok) throw new Error('Failed to load recipes');
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function addIngredientsToGrocery(recipe: Recipe, idx: number) {
    setAddingToList(idx);
    try {
      const items = recipe.ingredients.map((i) => `${i.item} (${i.amount})`);
      await fetch('/api/grocery-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, source: 'recipe' }),
      });
      router.push('/grocery-list');
    } catch {
      setError('Failed to add ingredients');
    } finally {
      setAddingToList(null);
    }
  }

  async function logRecipeAsMeal(recipe: Recipe) {
    try {
      await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          meal_type: 'lunch',
          description: recipe.name,
          calories: recipe.calories,
          protein_g: recipe.protein_g,
          carbs_g: recipe.carbs_g,
          fat_g: recipe.fat_g,
          water_ml: 0,
        }),
      });
    } catch {
      setError('Failed to log meal');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/nutrition')} className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
          <span className="material-symbols-outlined text-sm">arrow_back</span> Nutrition
        </button>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          AI-suggested meals for your training needs
        </p>
      </div>

      {/* Focus Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FOCUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setFocus(opt.value);
              fetchRecipes(opt.value);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              backgroundColor: focus === opt.value ? 'var(--accent)' : 'var(--bg-input)',
              color: focus === opt.value ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${focus === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
            }}
          >
            <span>{opt.icon}</span> {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🧑‍🍳</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Choose a category above to get recipe ideas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Recipes are personalised to your training and nutrition targets
            </p>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Finding recipes for you...</p>
        </div>
      )}

      {/* Recipe Cards */}
      {recipes.map((recipe, idx) => {
        const isExpanded = expandedRecipe === idx;
        return (
          <Card key={idx} onClick={() => setExpandedRecipe(isExpanded ? null : idx)}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{recipe.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{recipe.description}</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                {recipe.calories} kcal
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                {recipe.prep_time_mins + recipe.cook_time_mins} min
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: 'var(--bg-input)', color: DIFFICULTY_COLORS[recipe.difficulty] || 'var(--text-muted)' }}>
                {recipe.difficulty}
              </span>
              {recipe.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Macros */}
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] font-medium" style={{ color: '#3b82f6' }}>P: {recipe.protein_g}g</span>
              <span className="text-[10px] font-medium" style={{ color: '#f59e0b' }}>C: {recipe.carbs_g}g</span>
              <span className="text-[10px] font-medium" style={{ color: '#a855f7' }}>F: {recipe.fat_g}g</span>
            </div>

            {/* Expanded view */}
            {isExpanded && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                {/* Ingredients */}
                <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Ingredients</h3>
                <ul className="flex flex-col gap-1 mb-4">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                      <span className="font-medium">{ing.amount}</span> {ing.item}
                    </li>
                  ))}
                </ul>

                {/* Instructions */}
                <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Method</h3>
                <ol className="flex flex-col gap-2 mb-4">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button onClick={() => addIngredientsToGrocery(recipe, idx)} variant="secondary" size="sm" disabled={addingToList === idx}>
                    <span className="material-symbols-outlined text-sm">shopping_cart</span>
                    {addingToList === idx ? 'Adding...' : 'Add to List'}
                  </Button>
                  <Button onClick={() => logRecipeAsMeal(recipe)} variant="secondary" size="sm">
                    <span className="material-symbols-outlined text-sm">edit_note</span> Log Meal
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
