import { NextRequest, NextResponse } from 'next/server';
import { queryWhere } from '@/lib/db';
import { TrainingSession, SleepLog, WellnessCheck } from '@/types';
import { daysAgo } from '@/lib/utils';
import { calculateRecoveryMetrics } from '@/lib/calculations';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const since7d = daysAgo(7);
  const since28d = daysAgo(28);

  const [sessions7d, sessions28d, sleepLogs7d, wellnessChecks7d] = await Promise.all([
    queryWhere<TrainingSession>('training_sessions',
      (s) => s.user_id === userId && s.date >= since7d
    ),
    queryWhere<TrainingSession>('training_sessions',
      (s) => s.user_id === userId && s.date >= since28d
    ),
    queryWhere<SleepLog>('sleep_logs',
      (s) => s.user_id === userId && s.date >= since7d
    ),
    queryWhere<WellnessCheck>('wellness_checks',
      (w) => w.user_id === userId && w.date >= since7d
    ),
  ]);

  const metrics = calculateRecoveryMetrics(sessions7d, sessions28d, sleepLogs7d, wellnessChecks7d);

  // Check if wellness check exists for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const wellnessToday = wellnessChecks7d.some((w) => w.date === todayStr);

  return NextResponse.json({ ...metrics, wellness_today: wellnessToday });
}
