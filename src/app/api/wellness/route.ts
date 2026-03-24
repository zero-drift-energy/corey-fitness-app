import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, upsert } from '@/lib/db';
import { WellnessCheck } from '@/types';
import { generateId, daysAgo } from '@/lib/utils';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  const days = Number(req.nextUrl.searchParams.get('days') || '7');
  const since = daysAgo(days);

  const checks = await queryWhere<WellnessCheck>('wellness_checks',
    (w) => w.user_id === userId && w.date >= since
  );
  checks.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(checks);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const check: WellnessCheck = {
    id: body.id || generateId(),
    user_id: userId,
    date: body.date,
    energy_level: body.energy_level,
    soreness_level: body.soreness_level,
    fatigue_level: body.fatigue_level,
    mood: body.mood,
    injury_notes: body.injury_notes || null,
    created_at: new Date().toISOString(),
  };

  // Only one wellness check per day per user
  const result = await upsert<WellnessCheck>(
    'wellness_checks',
    (w) => w.user_id === userId && w.date === body.date,
    check
  );

  return NextResponse.json(result);
}
