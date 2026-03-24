import { GamificationProfile, BadgeDefinition, EarnedBadge, WeeklyChallenge } from '@/types';

// ===== LEVELS =====
export const LEVELS = [
  { level: 1, title: 'Grassroots Grinder', minXP: 0, icon: '🌱' },
  { level: 2, title: 'Academy Hopeful', minXP: 500, icon: '⭐' },
  { level: 3, title: 'Youth Team Regular', minXP: 1000, icon: '🔥' },
  { level: 4, title: 'Reserve Squad', minXP: 2000, icon: '💪' },
  { level: 5, title: 'First Team Debut', minXP: 3500, icon: '⚡' },
  { level: 6, title: 'Starting XI', minXP: 5000, icon: '🏟️' },
  { level: 7, title: 'Fan Favourite', minXP: 7500, icon: '🎯' },
  { level: 8, title: 'Club Captain', minXP: 10000, icon: '©️' },
  { level: 9, title: 'Club Legend', minXP: 15000, icon: '👑' },
] as const;

// ===== XP REWARDS =====
export const XP_REWARDS = {
  log_meal: 10,
  log_training: 25,
  log_sleep: 15,
  wellness_checkin: 10,
  hit_calorie_target: 20,
  hit_protein_target: 15,
  sleep_9_plus_hours: 20,
  chat_coach: 5,
  streak_7: 100,
  streak_14: 250,
  streak_30: 500,
} as const;

// ===== BADGES =====
export const ALL_BADGES: BadgeDefinition[] = [
  { id: 'early_bird', name: 'Early Bird', description: '5 days with 9+ hours sleep', icon: '🌅', category: 'sleep' },
  { id: 'hydration_king', name: 'Hydration King', description: 'Hit water target 7 days in a row', icon: '💧', category: 'nutrition' },
  { id: 'iron_legs', name: 'Iron Legs', description: 'Complete all training sessions in a week', icon: '🦵', category: 'training' },
  { id: 'nutrition_pro', name: 'Nutrition Pro', description: 'Log every meal for 7 days straight', icon: '🥗', category: 'nutrition' },
  { id: 'recovery_master', name: 'Recovery Master', description: 'Keep match readiness green for 7 days', icon: '💚', category: 'recovery' },
  { id: 'hat_trick_hero', name: 'Hat-trick Hero', description: 'Log training, meal & sleep in one day, 3 days running', icon: '⚽', category: 'general' },
  { id: 'clean_sheet', name: 'Clean Sheet', description: 'Zero skipped sessions in 14 days', icon: '🧤', category: 'training' },
  { id: 'golden_boot', name: 'Golden Boot', description: 'Reach 5000 XP', icon: '👟', category: 'general' },
  { id: 'century_club', name: 'Century Club', description: 'Log 100 meals', icon: '💯', category: 'nutrition' },
  { id: 'marathon_man', name: 'Marathon Man', description: '30-day logging streak', icon: '🏃', category: 'general' },
];

// ===== WEEKLY CHALLENGE TEMPLATES =====
export const CHALLENGE_TEMPLATES = [
  { type: 'protein_target', description: 'Hit your protein target 5 out of 7 days', target: 5, xp: 150 },
  { type: 'sleep_9hrs', description: 'Get 9+ hours sleep 4 nights this week', target: 4, xp: 120 },
  { type: 'wellness_daily', description: 'Complete a wellness check-in every day', target: 7, xp: 100 },
  { type: 'hydration_3l', description: 'Drink 3L of water 5 days this week', target: 5, xp: 100 },
  { type: 'log_all_meals', description: 'Log at least 3 meals every day', target: 7, xp: 200 },
  { type: 'training_complete', description: 'Complete every scheduled training session', target: 5, xp: 175 },
];

// ===== HELPER FUNCTIONS =====

type Level = { level: number; title: string; minXP: number; icon: string };

export function getLevelForXP(xp: number): Level {
  let current: Level = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(currentXP: number): Level | null {
  const currentLevel = getLevelForXP(currentXP);
  const nextIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
}

export function getXPProgress(totalXP: number): { current: number; needed: number; percentage: number } {
  const currentLevel = getLevelForXP(totalXP);
  const nextLevel = getNextLevel(totalXP);
  if (!nextLevel) return { current: totalXP - currentLevel.minXP, needed: 1, percentage: 100 };
  const xpInLevel = totalXP - currentLevel.minXP;
  const xpNeeded = nextLevel.minXP - currentLevel.minXP;
  return {
    current: xpInLevel,
    needed: xpNeeded,
    percentage: Math.round((xpInLevel / xpNeeded) * 100),
  };
}

export function updateStreak(profile: GamificationProfile, todayStr: string): { newStreak: number; streakBroken: boolean; milestoneXP: number } {
  const lastLog = profile.last_log_date;
  if (!lastLog) {
    return { newStreak: 1, streakBroken: false, milestoneXP: 0 };
  }

  const today = new Date(todayStr);
  const last = new Date(lastLog);
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day, no change
    return { newStreak: profile.current_streak_days, streakBroken: false, milestoneXP: 0 };
  } else if (diffDays === 1) {
    // Consecutive day
    const newStreak = profile.current_streak_days + 1;
    let milestoneXP = 0;
    if (newStreak === 7) milestoneXP = XP_REWARDS.streak_7;
    else if (newStreak === 14) milestoneXP = XP_REWARDS.streak_14;
    else if (newStreak === 30) milestoneXP = XP_REWARDS.streak_30;
    return { newStreak, streakBroken: false, milestoneXP };
  } else {
    // Streak broken
    return { newStreak: 1, streakBroken: true, milestoneXP: 0 };
  }
}

export function hasBadge(profile: GamificationProfile, badgeId: string): boolean {
  return profile.badges_json.some(b => b.badge_id === badgeId);
}

export function getRandomChallenge(): typeof CHALLENGE_TEMPLATES[number] {
  return CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];
}

// Default empty profile
export function createDefaultProfile(userId: string): GamificationProfile {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    total_xp: 0,
    current_level: 1,
    current_streak_days: 0,
    longest_streak_days: 0,
    last_log_date: null,
    badges_json: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
