import { NextRequest, NextResponse } from 'next/server';
import { findOne, insert, update } from '@/lib/db';
import { GamificationProfile } from '@/types';
import { generateId, today } from '@/lib/utils';
import { XP_REWARDS, getLevelForXP, updateStreak, createDefaultProfile } from '@/lib/gamification';

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let profile = await findOne<GamificationProfile>('gamification_profiles', (p) => p.user_id === userId);
  if (!profile) {
    profile = createDefaultProfile(userId);
    await insert('gamification_profiles', profile);
  }

  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { action } = await req.json();
  const xpAmount = XP_REWARDS[action as keyof typeof XP_REWARDS];
  if (!xpAmount) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  let profile = await findOne<GamificationProfile>('gamification_profiles', (p) => p.user_id === userId);
  if (!profile) {
    profile = createDefaultProfile(userId);
    await insert('gamification_profiles', profile);
  }

  const todayStr = today();
  const oldLevel = getLevelForXP(profile.total_xp);

  // Update streak
  const streakResult = updateStreak(profile, todayStr);
  let totalXPGain = xpAmount + streakResult.milestoneXP;

  const newTotalXP = profile.total_xp + totalXPGain;
  const newLevel = getLevelForXP(newTotalXP);
  const levelledUp = newLevel.level > oldLevel.level;

  const updatedProfile = await update<GamificationProfile>(
    'gamification_profiles',
    (p) => p.user_id === userId,
    {
      total_xp: newTotalXP,
      current_level: newLevel.level,
      current_streak_days: streakResult.newStreak,
      longest_streak_days: Math.max(profile.longest_streak_days, streakResult.newStreak),
      last_log_date: todayStr,
      updated_at: new Date().toISOString(),
    }
  );

  return NextResponse.json({
    profile: updatedProfile,
    xp_gained: totalXPGain,
    levelled_up: levelledUp,
    new_level: levelledUp ? newLevel : null,
    streak: streakResult.newStreak,
    streak_milestone: streakResult.milestoneXP > 0 ? streakResult.milestoneXP : null,
  });
}
