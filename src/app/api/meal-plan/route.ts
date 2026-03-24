import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { queryWhere, insert, findOne } from '@/lib/db';
import { User, TrainingSession, MealPlan } from '@/types';
import { generateId, today } from '@/lib/utils';
import { calculateNutritionTarget } from '@/lib/calculations';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const date = body.date || today();

  const [user, sessions] = await Promise.all([
    findOne<User>('users', (u) => u.id === userId),
    queryWhere<TrainingSession>('training_sessions',
      (s) => s.user_id === userId && s.date === date
    ),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const hasTraining = sessions.some((s) => !s.skipped);
  const isMatchDay = sessions.some((s) => s.session_type === 'match' && !s.skipped);
  const weightKg = user.weight_kg || 70;

  const targets = calculateNutritionTarget(weightKg, hasTraining, isMatchDay);

  const trainingContext = sessions.length > 0
    ? sessions
        .map(
          (s) =>
            `${s.session_type} at ${s.start_time || 'unknown time'}, ${s.duration_minutes}min, RPE ${s.intensity}/10`
        )
        .join('; ')
    : 'Rest day (no training scheduled)';

  const prompt = `Generate a structured meal plan for a ${user.age}-year-old football/soccer player for ${date}.

Athlete info:
- Name: ${user.name}
- Weight: ${weightKg}kg
- Height: ${user.height_cm ? user.height_cm + 'cm' : 'unknown'}
- Position: ${user.position || 'unknown'}

Training today: ${trainingContext}
Day type: ${isMatchDay ? 'MATCH DAY' : hasTraining ? 'Training day' : 'Rest day'}

Nutrition targets:
- Calories: ${targets.calories}kcal
- Protein: ${targets.protein_g}g
- Carbs: ${targets.carbs_g}g
- Fat: ${targets.fat_g}g
- Water: ${targets.water_ml}ml

Requirements:
- Include 5-6 meals: breakfast, morning snack (optional), lunch, pre-training snack, post-training snack, dinner
- If it's a match day, include a pre-match meal 3 hours before and a post-match recovery meal
- If it's a rest day, still include a balanced plan but with slightly fewer carbs
- Use foods a teenager would actually eat — keep it realistic and appealing
- Include estimated macros for each meal
- Ensure meals add up close to the targets
- Include hydration reminders

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "meals": [
    {
      "meal_type": "breakfast",
      "time": "7:30",
      "description": "...",
      "foods": ["item 1", "item 2"],
      "calories": 500,
      "protein_g": 30,
      "carbs_g": 60,
      "fat_g": 15
    }
  ],
  "hydration_plan": [
    { "time": "7:00", "amount_ml": 500, "note": "..." }
  ],
  "total_calories": 2800,
  "total_protein_g": 140,
  "total_carbs_g": 350,
  "total_fat_g": 80,
  "total_water_ml": 3000,
  "tips": ["tip 1", "tip 2"]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract the text content from the response
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 });
  }

  let planJson: any;
  try {
    planJson = JSON.parse(textBlock.text);
  } catch {
    return NextResponse.json({ error: 'Failed to parse meal plan response' }, { status: 500 });
  }

  const mealPlan: MealPlan = {
    id: generateId(),
    user_id: userId,
    date,
    plan_json: planJson,
    calorie_target: targets.calories,
    protein_target_g: targets.protein_g,
    carbs_target_g: targets.carbs_g,
    fat_target_g: targets.fat_g,
    created_at: new Date().toISOString(),
  };

  await insert('meal_plans', mealPlan);
  return NextResponse.json(mealPlan);
}
