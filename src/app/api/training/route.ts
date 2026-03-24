import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, insert } from '@/lib/db';
import { TrainingSession } from '@/types';
import { generateId, daysAgo } from '@/lib/utils';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  const days = Number(req.nextUrl.searchParams.get('days') || '7');
  const since = daysAgo(days);

  const sessions = await queryWhere<TrainingSession>('training_sessions',
    (s) => s.user_id === userId && s.date >= since
  );
  sessions.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const session: TrainingSession = {
    id: generateId(),
    user_id: userId,
    session_type: body.session_type,
    date: body.date,
    start_time: body.start_time || null,
    duration_minutes: body.duration_minutes,
    intensity: body.intensity,
    notes: body.notes || null,
    skipped: body.skipped || false,
    skip_reason: body.skip_reason || null,
    created_at: new Date().toISOString(),
  };

  await insert('training_sessions', session);
  return NextResponse.json(session);
}
