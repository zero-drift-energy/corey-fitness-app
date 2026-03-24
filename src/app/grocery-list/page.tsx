'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  source: string;
  source_date?: string;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Protein': '🥩',
  'Dairy': '🧀',
  'Grains': '🌾',
  'Fruit & Veg': '🥦',
  'Pantry': '🏺',
  'Drinks': '🥤',
  'Other': '📦',
};

export default function GroceryListPage() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/grocery-list');
      if (!res.ok) throw new Error('Failed to load grocery list');
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/grocery-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.trim() }),
      });
      setNewItem('');
      await fetchItems();
    } catch {
      setError('Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(item: GroceryItem) {
    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i));
    try {
      await fetch('/api/grocery-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, checked: !item.checked }),
      });
    } catch {
      // Revert on error
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: item.checked } : i));
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/grocery-list?id=${id}`, { method: 'DELETE' });
    } catch {
      await fetchItems();
    }
  }

  async function clearChecked() {
    try {
      await fetch('/api/grocery-list?clearChecked=true', { method: 'DELETE' });
      await fetchItems();
    } catch {
      setError('Failed to clear items');
    }
  }

  // Group items by category
  const grouped = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    items.forEach((item) => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

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
          <button onClick={() => router.push('/nutrition')} className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <span className="material-symbols-outlined text-sm">arrow_back</span> Nutrition
          </button>
          <h1 className="text-2xl font-bold">Grocery List</h1>
          {totalCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {checkedCount}/{totalCount} items checked
            </p>
          )}
        </div>
        {checkedCount > 0 && (
          <Button onClick={clearChecked} variant="ghost" size="sm">
            Clear Done
          </Button>
        )}
      </div>

      {/* Add Item */}
      <Card>
        <form onSubmit={addItem} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
            />
          </div>
          <Button type="submit" size="md" disabled={adding || !newItem.trim()}>
            {adding ? <Spinner size="sm" /> : '+'}
          </Button>
        </form>
      </Card>

      {error && (
        <Card className="!border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🛒</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Your grocery list is empty
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Add items manually or generate them from a meal plan or recipe
            </p>
          </div>
        </Card>
      )}

      {/* Grouped Items */}
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{CATEGORY_ICONS[category] || '📦'}</span>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {category}
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {categoryItems.length}
            </span>
          </div>

          {categoryItems.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleItem(item)}
                  className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: item.checked ? 'var(--accent)' : 'var(--border-subtle)',
                    backgroundColor: item.checked ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {item.checked && (
                    <span className="material-symbols-outlined text-sm" style={{ color: '#fff' }}>check</span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.checked ? 'line-through' : ''}`} style={{ color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {item.name}
                  </p>
                  {item.source !== 'manual' && (
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      from {item.source.replace('_', ' ')}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs p-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
