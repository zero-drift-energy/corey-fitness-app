import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FOOD_LOOKUP_PROMPT = `You are a sports nutrition database for a 16-year-old footballer.
The user will search for a food item. Return detailed nutritional information per standard serving.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "results": [
    {
      "food_name": "Chicken Breast (grilled)",
      "serving_size": "150g",
      "calories": 248,
      "protein_g": 46,
      "carbs_g": 0,
      "fat_g": 5,
      "fibre_g": 0,
      "sugar_g": 0,
      "key_nutrients": ["High protein", "Low fat", "Iron", "B vitamins"]
    }
  ]
}

Rules:
- Return up to 5 relevant results for the search query
- Include common variations (e.g. grilled vs fried, whole vs skimmed)
- Use realistic UK portion sizes suitable for a teen athlete
- Include the most common/popular form of the food first
- If the query is vague, return the most likely interpretations
- key_nutrients should list 2-4 standout nutritional qualities`;

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('userId')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { query } = body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'Provide a search query' }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: FOOD_LOOKUP_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Look up: ${query.trim()}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const data = JSON.parse(jsonStr);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Food lookup error:', err);
    return NextResponse.json({ error: 'Failed to look up food' }, { status: 500 });
  }
}
