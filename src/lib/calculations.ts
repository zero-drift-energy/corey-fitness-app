import { TrainingSession, SleepLog, WellnessCheck, RecoveryMetrics, DailyNutritionTarget, RecoveryStatus } from '@/types';
import { ACWR_OPTIMAL_LOW, ACWR_OPTIMAL_HIGH, ACWR_DANGER, SLEEP_TARGET_HOURS } from './constants';

// Training load for a single session
export function sessionLoad(session: TrainingSession): number {
  if (session.skipped) return 0;
  return session.duration_minutes * session.intensity;
}

// Acute load: sum of all session loads in the last 7 days
export function acuteLoad(sessions: TrainingSession[]): number {
  return sessions.reduce((sum, s) => sum + sessionLoad(s), 0);
}

// Chronic load: average weekly load over the last 28 days
export function chronicLoad(sessions28d: TrainingSession[]): number {
  const totalLoad = sessions28d.reduce((sum, s) => sum + sessionLoad(s), 0);
  return totalLoad / 4; // 28 days = 4 weeks
}

// Acute:Chronic Workload Ratio
export function calculateACWR(acute: number, chronic: number): number {
  if (chronic === 0) return acute > 0 ? 2.0 : 1.0;
  return Math.round((acute / chronic) * 100) / 100;
}

// Recovery status based on ACWR
export function recoveryStatus(acwr: number): RecoveryStatus {
  if (acwr >= ACWR_OPTIMAL_LOW && acwr <= ACWR_OPTIMAL_HIGH) return 'green';
  if (acwr > ACWR_DANGER) return 'red';
  return 'amber';
}

// Recovery score (0-100)
export function calculateRecoveryScore(
  acwr: number,
  avgSleepHours: number,
  avgEnergy: number,
  avgSoreness: number,
  avgFatigue: number
): number {
  // ACWR component (40%)
  let acwrScore: number;
  if (acwr >= ACWR_OPTIMAL_LOW && acwr <= 1.2) {
    acwrScore = 100;
  } else if (acwr < ACWR_OPTIMAL_LOW) {
    acwrScore = Math.max(0, (acwr / ACWR_OPTIMAL_LOW) * 100);
  } else {
    acwrScore = Math.max(0, 100 - ((acwr - 1.2) / (ACWR_DANGER - 1.2)) * 100);
  }

  // Sleep component (30%)
  const sleepScore = Math.min(100, (avgSleepHours / SLEEP_TARGET_HOURS) * 100);

  // Wellness component (30%) - energy positive, soreness/fatigue negative
  const energyNorm = (avgEnergy / 10) * 100;
  const sorenessNorm = ((10 - avgSoreness) / 10) * 100;
  const fatigueNorm = ((10 - avgFatigue) / 10) * 100;
  const wellnessScore = (energyNorm + sorenessNorm + fatigueNorm) / 3;

  const total = (acwrScore * 0.4) + (sleepScore * 0.3) + (wellnessScore * 0.3);
  return Math.round(Math.max(0, Math.min(100, total)));
}

// Generate recovery recommendations
export function generateRecommendations(
  acwr: number,
  avgSleepHours: number,
  avgEnergy: number,
  avgSoreness: number,
  avgFatigue: number
): string[] {
  const recs: string[] = [];

  if (acwr > ACWR_OPTIMAL_HIGH) {
    recs.push('Your training load has spiked recently. Consider reducing intensity for 2-3 days.');
  }
  if (acwr > ACWR_DANGER) {
    recs.push('HIGH INJURY RISK: Your acute:chronic ratio is very high. Take a rest day or do only light recovery work.');
  }
  if (acwr < ACWR_OPTIMAL_LOW) {
    recs.push('Your training load is below your usual level. You can gradually increase if feeling good.');
  }

  if (avgSleepHours < 8) {
    recs.push(`You're averaging ${avgSleepHours.toFixed(1)} hours of sleep. Aim for 9+ hours — sleep is when your muscles recover.`);
  } else if (avgSleepHours < 9) {
    recs.push('Try to get closer to 9 hours of sleep for optimal recovery.');
  }

  if (avgSoreness > 7) {
    recs.push('Your muscle soreness is high. Focus on foam rolling, light stretching, and consider a contrast shower (hot/cold).');
  } else if (avgSoreness > 5) {
    recs.push('Moderate soreness detected. Make sure to warm up thoroughly and do a proper cool-down after sessions.');
  }

  if (avgFatigue > 7) {
    recs.push('Fatigue levels are high. Check your carb intake — you may need more fuel on training days.');
  }

  if (avgEnergy < 4) {
    recs.push('Low energy levels. Make sure you\'re eating enough carbs and getting quality sleep. Consider an earlier bedtime tonight.');
  }

  if (recs.length === 0) {
    recs.push('Looking good! Your training load, sleep, and recovery are all in a healthy range. Keep it up! 💪');
  }

  return recs;
}

// Full recovery metrics calculation
export function calculateRecoveryMetrics(
  sessions7d: TrainingSession[],
  sessions28d: TrainingSession[],
  sleepLogs7d: SleepLog[],
  wellnessChecks7d: WellnessCheck[]
): RecoveryMetrics {
  const acute = acuteLoad(sessions7d);
  const chronic = chronicLoad(sessions28d);
  const acwr = calculateACWR(acute, chronic);

  const avgSleep = sleepLogs7d.length > 0
    ? sleepLogs7d.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sleepLogs7d.length / 60
    : 0;

  const avgEnergy = wellnessChecks7d.length > 0
    ? wellnessChecks7d.reduce((sum, w) => sum + w.energy_level, 0) / wellnessChecks7d.length
    : 5;

  const avgSoreness = wellnessChecks7d.length > 0
    ? wellnessChecks7d.reduce((sum, w) => sum + w.soreness_level, 0) / wellnessChecks7d.length
    : 5;

  const avgFatigue = wellnessChecks7d.length > 0
    ? wellnessChecks7d.reduce((sum, w) => sum + w.fatigue_level, 0) / wellnessChecks7d.length
    : 5;

  const score = calculateRecoveryScore(acwr, avgSleep, avgEnergy, avgSoreness, avgFatigue);
  const status = recoveryStatus(acwr);
  const recommendations = generateRecommendations(acwr, avgSleep, avgEnergy, avgSoreness, avgFatigue);

  return {
    acute_load: acute,
    chronic_load: Math.round(chronic),
    acwr,
    recovery_score: score,
    status,
    avg_sleep_hours_7d: Math.round(avgSleep * 10) / 10,
    avg_energy_7d: Math.round(avgEnergy * 10) / 10,
    avg_soreness_7d: Math.round(avgSoreness * 10) / 10,
    recommendations,
  };
}

// Daily nutrition target based on weight and training
export function calculateNutritionTarget(
  weightKg: number,
  hasTraining: boolean,
  isMatchDay: boolean
): DailyNutritionTarget {
  // Harris-Benedict BMR for 16-year-old male (approximate)
  // Using a simplified formula: BMR ~ 10 * weight + 6.25 * height - 5 * age + 5
  // We approximate with weight only: BMR ~ 25 * weightKg (reasonable for a teen male ~175cm)
  const bmr = 25 * weightKg;

  let activityFactor: number;
  if (isMatchDay) {
    activityFactor = 2.0;
  } else if (hasTraining) {
    activityFactor = 1.75;
  } else {
    activityFactor = 1.4;
  }

  // Add growth surplus for a growing teenager
  const growthSurplus = 400;
  const calories = Math.round(bmr * activityFactor + growthSurplus);

  // Macros
  const proteinPerKg = hasTraining ? 1.6 : 1.4;
  const protein_g = Math.round(weightKg * proteinPerKg);
  const proteinCals = protein_g * 4;

  const carbsPerKg = isMatchDay ? 7 : hasTraining ? 6 : 4;
  const carbs_g = Math.round(weightKg * carbsPerKg);
  const carbsCals = carbs_g * 4;

  const remainingCals = Math.max(0, calories - proteinCals - carbsCals);
  const fat_g = Math.round(remainingCals / 9);

  // Water: base 2L + 500ml per hour of training (assume 1.5hr avg session)
  const water_ml = hasTraining ? 3000 : 2500;

  return { calories, protein_g, carbs_g, fat_g, water_ml };
}
