import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, insert } from '@/lib/db';
import { NutritionLog } from '@/types';
import { generateId, daysAgo } from '@/lib/utils';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  const days = Number(req.nextUrl.searchParams.get('days') || '1');

  let logs: NutritionLog[];
  if (date) {
    logs = await queryWhere<NutritionLog>('nutrition_logs',
      (l) => l.user_id === userId && l.date === date
    );
  } else {
    const since = daysAgo(days);
    logs = await queryWhere<NutritionLog>('nutrition_logs',
      (l) => l.user_id === userId && l.date >= since
    );
  }
  logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const log: NutritionLog = {
    id: generateId(),
    user_id: userId,
    date: body.date,
    meal_type: body.meal_type,
    description: body.description || null,
    calories: body.calories || null,
    protein_g: body.protein_g || null,
    carbs_g: body.carbs_g || null,
    fat_g: body.fat_g || null,
    water_ml: body.water_ml || 0,
    created_at: new Date().toISOString(),
  };

  await insert('nutrition_logs', log);
  return NextResponse.json(log);
}
