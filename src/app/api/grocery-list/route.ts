import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, insert, update, remove } from '@/lib/db';
import { generateId } from '@/lib/utils';

interface GroceryItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  checked: boolean;
  source: string; // 'manual' | 'meal_plan' | 'recipe'
  source_date?: string;
  created_at: string;
}

const CATEGORY_MAP: Record<string, string> = {
  // Proteins
  chicken: 'Protein', turkey: 'Protein', beef: 'Protein', mince: 'Protein',
  steak: 'Protein', salmon: 'Protein', tuna: 'Protein', fish: 'Protein',
  prawns: 'Protein', eggs: 'Protein', egg: 'Protein', tofu: 'Protein',
  bacon: 'Protein', sausage: 'Protein', ham: 'Protein',
  // Dairy
  milk: 'Dairy', cheese: 'Dairy', yogurt: 'Dairy', yoghurt: 'Dairy',
  butter: 'Dairy', cream: 'Dairy', greek: 'Dairy',
  // Carbs & Grains
  rice: 'Grains', pasta: 'Grains', bread: 'Grains', oats: 'Grains',
  porridge: 'Grains', cereal: 'Grains', noodles: 'Grains', wrap: 'Grains',
  tortilla: 'Grains', bagel: 'Grains', granola: 'Grains', quinoa: 'Grains',
  // Fruits & Veg
  banana: 'Fruit & Veg', apple: 'Fruit & Veg', berries: 'Fruit & Veg',
  blueberries: 'Fruit & Veg', strawberries: 'Fruit & Veg',
  spinach: 'Fruit & Veg', broccoli: 'Fruit & Veg', avocado: 'Fruit & Veg',
  tomato: 'Fruit & Veg', tomatoes: 'Fruit & Veg', lettuce: 'Fruit & Veg',
  pepper: 'Fruit & Veg', peppers: 'Fruit & Veg', onion: 'Fruit & Veg',
  sweet_potato: 'Fruit & Veg', potato: 'Fruit & Veg', potatoes: 'Fruit & Veg',
  carrot: 'Fruit & Veg', carrots: 'Fruit & Veg', mushrooms: 'Fruit & Veg',
  // Pantry
  olive_oil: 'Pantry', oil: 'Pantry', honey: 'Pantry', peanut_butter: 'Pantry',
  nuts: 'Pantry', almonds: 'Pantry', seeds: 'Pantry', sauce: 'Pantry',
  // Drinks
  water: 'Drinks', juice: 'Drinks', smoothie: 'Drinks',
};

function categorize(item: string): string {
  const lower = item.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return 'Other';
}

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const items = await queryWhere<GroceryItem>(
    'grocery_list',
    (i) => i.user_id === userId
  );

  // Sort: unchecked first, then by category
  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.category.localeCompare(b.category);
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();

  // Batch add from meal plan or recipe
  if (body.items && Array.isArray(body.items)) {
    const existing = await queryWhere<GroceryItem>(
      'grocery_list',
      (i) => i.user_id === userId && !i.checked
    );
    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

    const newItems: GroceryItem[] = [];
    for (const itemName of body.items) {
      const name = String(itemName).trim();
      if (!name || existingNames.has(name.toLowerCase())) continue;
      existingNames.add(name.toLowerCase());

      const item: GroceryItem = {
        id: generateId(),
        user_id: userId,
        name,
        category: categorize(name),
        checked: false,
        source: body.source || 'manual',
        source_date: body.date,
        created_at: new Date().toISOString(),
      };
      newItems.push(item);
    }

    for (const item of newItems) {
      await insert('grocery_list', item);
    }

    return NextResponse.json({ added: newItems.length });
  }

  // Single item add
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
  }

  const item: GroceryItem = {
    id: generateId(),
    user_id: userId,
    name,
    category: body.category || categorize(name),
    checked: false,
    source: 'manual',
    created_at: new Date().toISOString(),
  };

  await insert('grocery_list', item);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  const updated = await update<GroceryItem>(
    'grocery_list',
    (i) => i.id === id && i.user_id === userId,
    updates
  );

  if (!updated) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const clearChecked = searchParams.get('clearChecked');

  if (clearChecked === 'true') {
    await remove<GroceryItem>(
      'grocery_list',
      (i) => i.user_id === userId && i.checked
    );
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  await remove<GroceryItem>(
    'grocery_list',
    (i) => i.id === id && i.user_id === userId
  );

  return NextResponse.json({ success: true });
}
