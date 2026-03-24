import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { findOne, queryWhere } from '@/lib/db';
import { User, NutritionLog } from '@/types';
import { calculateNutritionTarget } from '@/lib/calculations';
import { today, daysAgo } from '@/lib/utils';

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
  const { focus } = body; // 'high_protein' | 'pre_training' | 'recovery' | 'quick' | 'general'

  const [user, recentLogs] = await Promise.all([
    findOne<User>('users', (u) => u.id === userId),
    queryWhere<NutritionLog>('nutrition_logs', (n) => {
      return n.user_id === userId && n.date >= daysAgo(7);
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const weight = user.weight_kg || 70;
  const targets = calculateNutritionTarget(weight, true, false);

  // Gather recently eaten foods for context
  const recentFoods = recentLogs
    .filter((l) => l.description && l.description !== 'Water')
    .map((l) => l.description)
    .slice(-20);

  const focusMap: Record<string, string> = {
    high_protein: 'Focus on HIGH PROTEIN meals (30g+ protein per serving). Great for muscle recovery and growth.',
    pre_training: 'Focus on PRE-TRAINING meals - high carb, moderate protein, low fat. Easy to digest 2-3 hours before training.',
    recovery: 'Focus on POST-TRAINING RECOVERY meals - good mix of protein and carbs to refuel glycogen and repair muscles.',
    quick: 'Focus on QUICK & EASY meals that take 15 minutes or less to prepare. Perfect for busy school days.',
    general: 'Provide a variety of balanced meals suitable for a teenage footballer.',
  };
  const focusInstruction = focusMap[focus || 'general'] || 'Provide a variety of balanced meals.';

  const prompt = `Generate 5 recipe suggestions for a ${user.age}-year-old football/soccer player.

Athlete: ${user.name}, ${weight}kg, ${user.position || 'unknown position'}
Daily targets: ${targets.calories}kcal, ${targets.protein_g}g protein, ${targets.carbs_g}g carbs, ${targets.fat_g}g fat

${focusInstruction}

Recently eaten foods (avoid too much repetition): ${recentFoods.join(', ') || 'No recent data'}

Requirements:
- Realistic meals a teenager would enjoy
- UK-available ingredients
- Include prep time and difficulty level
- Each recipe should have clear ingredients and simple instructions
- Include macro breakdown per serving

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "prep_time_mins": 15,
      "cook_time_mins": 20,
      "difficulty": "easy",
      "servings": 1,
      "calories": 500,
      "protein_g": 35,
      "carbs_g": 55,
      "fat_g": 15,
      "ingredients": [
        { "item": "chicken breast", "amount": "150g" },
        { "item": "rice", "amount": "75g dry" }
      ],
      "instructions": [
        "Step 1...",
        "Step 2..."
      ],
      "tags": ["high-protein", "quick"]
    }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse recipe response' }, { status: 500 });
  }
}
