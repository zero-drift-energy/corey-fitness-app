export const SESSION_TYPES = [
  { value: 'team_training', label: 'Team Training', icon: '⚽' },
  { value: 'academy', label: 'Academy', icon: '🏟️' },
  { value: 'match', label: 'Match', icon: '🏆' },
  { value: 'gym', label: 'Gym', icon: '💪' },
  { value: 'pe_lesson', label: 'PE Lesson', icon: '🏫' },
  { value: 'individual', label: 'Individual', icon: '🏃' },
] as const;

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
  { value: 'pre_training', label: 'Pre-Training', icon: '⚡' },
  { value: 'post_training', label: 'Post-Training', icon: '🔄' },
] as const;

export const SKIP_REASONS = [
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'soreness', label: 'Muscle Soreness' },
  { value: 'injury', label: 'Injury' },
  { value: 'other', label: 'Other' },
] as const;

export const POSITIONS = [
  'Goalkeeper', 'Centre-Back', 'Full-Back', 'Wing-Back',
  'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
  'Winger', 'Striker', 'Centre-Forward',
] as const;

export const DEFAULT_SESSION_DURATIONS: Record<string, number> = {
  team_training: 90,
  academy: 120,
  match: 90,
  gym: 60,
  pe_lesson: 60,
  individual: 45,
};

export const DEFAULT_SESSION_INTENSITY: Record<string, number> = {
  team_training: 7,
  academy: 7,
  match: 9,
  gym: 6,
  pe_lesson: 5,
  individual: 6,
};

// Recovery thresholds
export const ACWR_OPTIMAL_LOW = 0.8;
export const ACWR_OPTIMAL_HIGH = 1.3;
export const ACWR_DANGER = 1.5;

// Teen athlete sleep target
export const SLEEP_TARGET_HOURS = 9;
export const SLEEP_MIN_HOURS = 8;
export const SLEEP_MAX_HOURS = 10;

// Water target in ml
export const WATER_TARGET_ML = 3000;
export const WATER_GLASS_ML = 250;
