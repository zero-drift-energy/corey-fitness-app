import { NextRequest, NextResponse } from 'next/server';
import { queryWhere, insert } from '@/lib/db';
import { SleepLog } from '@/types';
import { generateId, daysAgo } from '@/lib/utils';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  const days = Number(req.nextUrl.searchParams.get('days') || '7');

  let logs: SleepLog[];
  if (date) {
    logs = await queryWhere<SleepLog>('sleep_logs',
      (l) => l.user_id === userId && l.date === date
    );
  } else {
    const since = daysAgo(days);
    logs = await queryWhere<SleepLog>('sleep_logs',
      (l) => l.user_id === userId && l.date >= since
    );
  }
  logs.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const log: SleepLog = {
    id: generateId(),
    user_id: userId,
    date: body.date,
    bedtime: body.bedtime || null,
    wake_time: body.wake_time || null,
    duration_minutes: body.duration_minutes || null,
    quality: body.quality,
    notes: body.notes || null,
    created_at: new Date().toISOString(),
  };

  await insert('sleep_logs', log);
  return NextResponse.json(log);
}
