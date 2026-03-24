export type SessionType = 'team_training' | 'academy' | 'match' | 'gym' | 'pe_lesson' | 'individual';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_training' | 'post_training';
export type SkipReason = 'fatigue' | 'soreness' | 'injury' | 'other';
export type RecoveryStatus = 'green' | 'amber' | 'red';

export interface User {
  id: string;
  name: string;
  age: number;
  weight_kg: number | null;
  height_cm: number | null;
  position: string | null;
  team_name: string | null;
  academy_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  intensity: number; // 1-10 RPE
  notes: string | null;
  skipped: boolean;
  skip_reason: SkipReason | null;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_ml: number;
  created_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_minutes: number | null;
  quality: number; // 1-5
  notes: string | null;
  created_at: string;
}

export interface WellnessCheck {
  id: string;
  user_id: string;
  date: string;
  energy_level: number; // 1-10
  soreness_level: number; // 1-10
  fatigue_level: number; // 1-10
  mood: number; // 1-5
  injury_notes: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  plan_json: any;
  calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  created_at: string;
}

export interface RecoveryMetrics {
  acute_load: number;
  chronic_load: number;
  acwr: number;
  recovery_score: number;
  status: RecoveryStatus;
  avg_sleep_hours_7d: number;
  avg_energy_7d: number;
  avg_soreness_7d: number;
  recommendations: string[];
}

export interface DailyNutritionTarget {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface FavouriteMeal {
  id: string;
  user_id: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  times_logged: number;
  created_at: string;
}

export interface GamificationProfile {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_log_date: string | null;
  badges_json: EarnedBadge[];
  created_at: string;
  updated_at: string;
}

export interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'sleep' | 'nutrition' | 'training' | 'recovery' | 'general';
}

export interface WeeklyChallenge {
  id: string;
  user_id: string;
  challenge_type: string;
  description: string;
  target_value: number;
  current_value: number;
  week_start: string;
  completed: boolean;
  xp_reward: number;
  created_at: string;
}

export interface FoodAnalysis {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'high' | 'medium' | 'low';
  items?: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
}
