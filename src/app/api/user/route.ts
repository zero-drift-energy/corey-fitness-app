import { NextRequest, NextResponse } from 'next/server';
import { query, insert, update, findOne } from '@/lib/db';
import { User } from '@/types';
import { generateId } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('userId')?.value;
  if (userId) {
    const user = await findOne<User>('users', (u) => u.id === userId);
    if (user) return NextResponse.json(user);
  }
  // Fallback: return first user
  const users = await query<User>('users');
  if (users.length > 0) return NextResponse.json(users[0]);
  return NextResponse.json(null, { status: 404 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = req.cookies.get('userId')?.value;

  if (userId) {
    const existing = await findOne<User>('users', (u) => u.id === userId);
    if (existing) {
      const updated = await update<User>('users', (u) => u.id === userId, {
        ...body,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json(updated);
    }
  }

  const newUser: User = {
    id: generateId(),
    name: body.name,
    age: body.age || 16,
    weight_kg: body.weight_kg || null,
    height_cm: body.height_cm || null,
    position: body.position || null,
    team_name: body.team_name || null,
    academy_name: body.academy_name || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await insert('users', newUser);

  const response = NextResponse.json(newUser);
  response.cookies.set('userId', newUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
