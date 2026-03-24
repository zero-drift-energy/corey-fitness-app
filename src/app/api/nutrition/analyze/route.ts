import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_PROMPT = `You are a sports nutrition expert analyzing food for a 16-year-old footballer.
Identify the food items and estimate their nutritional content.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "food_name": "Brief description of the meal",
  "calories": 500,
  "protein_g": 30,
  "carbs_g": 50,
  "fat_g": 15,
  "confidence": "high",
  "items": [
    {"name": "Item 1", "calories": 300, "protein_g": 20, "carbs_g": 30, "fat_g": 8},
    {"name": "Item 2", "calories": 200, "protein_g": 10, "carbs_g": 20, "fat_g": 7}
  ]
}

confidence should be "high" if it's a common food you can estimate well, "medium" if somewhat uncertain, "low" if very uncertain.
Always estimate on the generous side for a teen athlete - they need fuel, not restriction.`;

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('userId')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { text, image } = body;

  if (!text && !image) {
    return NextResponse.json({ error: 'Provide text or image' }, { status: 400 });
  }

  try {
    let messages: Anthropic.MessageParam[];

    if (image) {
      // Vision-based analysis
      // Extract media type from base64 data URI if present
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      let imageData = image;

      if (image.startsWith('data:')) {
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mediaType = match[1] as typeof mediaType;
          imageData = match[2];
        }
      }

      messages = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageData },
          },
          {
            type: 'text',
            text: 'What food is in this image? Estimate the nutritional content.',
          },
        ],
      }];
    } else {
      // Text-based analysis
      messages = [{
        role: 'user',
        content: `I ate: ${text}\n\nEstimate the nutritional content of this meal.`,
      }];
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: ANALYSIS_PROMPT,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    // Parse JSON from response - handle possible markdown wrapping
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Food analysis error:', err);
    return NextResponse.json({ error: 'Failed to analyze food' }, { status: 500 });
  }
}
