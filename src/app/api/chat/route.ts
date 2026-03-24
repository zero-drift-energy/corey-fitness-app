import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { queryWhere, insert, findOne } from '@/lib/db';
import {
  User,
  TrainingSession,
  NutritionLog,
  SleepLog,
  WellnessCheck,
  ChatMessage,
} from '@/types';
import { generateId, daysAgo, today } from '@/lib/utils';
import { calculateRecoveryMetrics } from '@/lib/calculations';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('userId')?.value || null;
}

function buildSystemPrompt(
  user: User,
  sessions7d: TrainingSession[],
  sessions28d: TrainingSession[],
  nutritionLogs: NutritionLog[],
  sleepLogs: SleepLog[],
  wellnessChecks: WellnessCheck[]
): string {
  const metrics = calculateRecoveryMetrics(sessions7d, sessions28d, sleepLogs, wellnessChecks);

  const recentTraining = sessions7d
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map(
      (s) =>
        `- ${s.date}: ${s.session_type} | ${s.duration_minutes}min | RPE ${s.intensity}/10${s.skipped ? ` (SKIPPED: ${s.skip_reason})` : ''}${s.notes ? ` | "${s.notes}"` : ''}`
    )
    .join('\n');

  const recentNutrition = nutritionLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
    .map(
      (n) =>
        `- ${n.date} ${n.meal_type}: ${n.description || 'no description'}${n.calories ? ` | ${n.calories}kcal` : ''}${n.protein_g ? ` | P:${n.protein_g}g` : ''}${n.carbs_g ? ` C:${n.carbs_g}g` : ''}${n.fat_g ? ` F:${n.fat_g}g` : ''} | Water: ${n.water_ml}ml`
    )
    .join('\n');

  const recentSleep = sleepLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map(
      (s) =>
        `- ${s.date}: ${s.duration_minutes ? Math.round(s.duration_minutes / 60 * 10) / 10 + 'hrs' : 'unknown duration'} | Quality: ${s.quality}/5${s.bedtime ? ` | Bed: ${s.bedtime}` : ''}${s.wake_time ? ` | Wake: ${s.wake_time}` : ''}${s.notes ? ` | "${s.notes}"` : ''}`
    )
    .join('\n');

  const recentWellness = wellnessChecks
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map(
      (w) =>
        `- ${w.date}: Energy ${w.energy_level}/10 | Soreness ${w.soreness_level}/10 | Fatigue ${w.fatigue_level}/10 | Mood ${w.mood}/5${w.injury_notes ? ` | Injury: "${w.injury_notes}"` : ''}`
    )
    .join('\n');

  return `You are Corey's AI Sports Performance Coach — a knowledgeable, supportive, and practical coach for a young athlete. Today is ${today()}.

## About the Athlete
- Name: ${user.name}
- Age: ${user.age}
- Weight: ${user.weight_kg ? user.weight_kg + 'kg' : 'not recorded'}
- Height: ${user.height_cm ? user.height_cm + 'cm' : 'not recorded'}
- Position: ${user.position || 'not specified'}
- Team: ${user.team_name || 'not specified'}
- Academy: ${user.academy_name || 'not specified'}

## Current Recovery Status
- Recovery Score: ${metrics.recovery_score}/100 (${metrics.status.toUpperCase()})
- Acute Load (7d): ${metrics.acute_load}
- Chronic Load (28d avg weekly): ${metrics.chronic_load}
- ACWR: ${metrics.acwr}
- Avg Sleep (7d): ${metrics.avg_sleep_hours_7d} hours
- Avg Energy (7d): ${metrics.avg_energy_7d}/10
- Avg Soreness (7d): ${metrics.avg_soreness_7d}/10
- Recommendations: ${metrics.recommendations.join('; ')}

## Recent Training (Last 7 Days)
${recentTraining || 'No sessions logged'}

## Recent Nutrition (Last 7 Days)
${recentNutrition || 'No meals logged'}

## Recent Sleep (Last 7 Days)
${recentSleep || 'No sleep data logged'}

## Recent Wellness (Last 7 Days)
${recentWellness || 'No wellness checks logged'}

## Your Expertise & Guidelines
You are an expert in:
- Youth sports science and periodization (ages 14-18)
- Sports nutrition for growing athletes: calorie needs, macros, hydration, meal timing around training
- Sleep optimization: circadian rhythm, sleep hygiene, recovery sleep for teens (9+ hours recommended)
- Training load management: acute:chronic workload ratio (ACWR), RPE monitoring, deload strategies
- Injury prevention: overuse injury risk, warm-up/cool-down protocols, load spikes
- Recovery strategies: active recovery, foam rolling, stretching, contrast therapy
- Mental wellness: managing pressure, confidence building, handling setbacks

## Communication Style
- Be encouraging and supportive — this is a teenager, not a pro athlete
- Keep explanations simple and practical. Use analogies a teen would understand
- Give specific, actionable advice (not vague generalities)
- Reference the athlete's actual data when giving advice — be contextual
- If the athlete seems overtrained, fatigued, or injured, prioritize rest and recovery over training
- Flag any concerning patterns (e.g., consecutive poor sleep, high soreness + high training load)
- Use short paragraphs. Be concise but thorough
- If you notice missing data (e.g., no meals logged today), gently remind them to log it
- Never recommend supplements beyond basic whey protein/creatine without noting they should consult a professional
- Always consider that this is a growing teenager — nutrition advice should include growth surplus calories

## Important Safety Notes
- If the athlete mentions pain, persistent injury, or anything medically concerning, recommend they see a physiotherapist or doctor
- Do not diagnose injuries or medical conditions
- If ACWR is in the red zone, strongly recommend rest
- Always prioritize long-term health over short-term performance`;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  const messages = await queryWhere<ChatMessage>('chat_messages', (m) => m.user_id === userId);
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return NextResponse.json(messages.slice(-50));
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Fetch all context in parallel
  const since7d = daysAgo(7);
  const since28d = daysAgo(28);

  const [user, previousMessages, sessions7d, sessions28d, nutritionLogs, sleepLogs, wellnessChecks] =
    await Promise.all([
      findOne<User>('users', (u) => u.id === userId),
      queryWhere<ChatMessage>('chat_messages', (m) => m.user_id === userId),
      queryWhere<TrainingSession>('training_sessions', (s) => s.user_id === userId && s.date >= since7d),
      queryWhere<TrainingSession>('training_sessions', (s) => s.user_id === userId && s.date >= since28d),
      queryWhere<NutritionLog>('nutrition_logs', (n) => n.user_id === userId && n.date >= since7d),
      queryWhere<SleepLog>('sleep_logs', (s) => s.user_id === userId && s.date >= since7d),
      queryWhere<WellnessCheck>('wellness_checks', (w) => w.user_id === userId && w.date >= since7d),
    ]);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Save the user message
  const userMessage: ChatMessage = {
    id: generateId(),
    user_id: userId,
    role: 'user',
    content: message,
    created_at: new Date().toISOString(),
  };
  await insert('chat_messages', userMessage);

  // Build conversation history (last 20 messages)
  const recentMessages = previousMessages
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-20);

  const conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [
    ...recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const systemPrompt = buildSystemPrompt(
    user,
    sessions7d,
    sessions28d,
    nutritionLogs,
    sleepLogs,
    wellnessChecks
  );

  // Stream the response from Claude
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationMessages,
  });

  // Collect the full response for saving to DB
  let fullResponse = '';

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Save the assistant message after streaming completes
        const assistantMessage: ChatMessage = {
          id: generateId(),
          user_id: userId,
          role: 'assistant',
          content: fullResponse,
          created_at: new Date().toISOString(),
        };
        await insert('chat_messages', assistantMessage);

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
