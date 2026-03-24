import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, insert, update, remove } from '@/lib/db';
import { FavouriteMeal } from '@/types';
import { generateId } from '@/lib/utils';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const favourites = await queryWhere<FavouriteMeal>(
    'favourite_meals',
    (f) => f.user_id === userId
  );

  // Sort by most frequently logged
  favourites.sort((a, b) => b.times_logged - a.times_logged);

  return NextResponse.json(favourites);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, calories, protein_g, carbs_g, fat_g } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const favourite: FavouriteMeal = {
    id: generateId(),
    user_id: userId,
    name,
    description: description || '',
    calories: calories || 0,
    protein_g: protein_g || 0,
    carbs_g: carbs_g || 0,
    fat_g: fat_g || 0,
    times_logged: 0,
    created_at: new Date().toISOString(),
  };

  await insert('favourite_meals', favourite);
  return NextResponse.json(favourite, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Favourite ID is required' }, { status: 400 });
  }

  const updated = await update<FavouriteMeal>(
    'favourite_meals',
    (f) => f.id === id && f.user_id === userId,
    updates
  );

  if (!updated) {
    return NextResponse.json({ error: 'Favourite not found' }, { status: 404 });
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

  if (!id) {
    return NextResponse.json({ error: 'Favourite ID is required' }, { status: 400 });
  }

  const removed = await remove<FavouriteMeal>(
    'favourite_meals',
    (f) => f.id === id && f.user_id === userId
  );

  if (!removed) {
    return NextResponse.json({ error: 'Favourite not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
