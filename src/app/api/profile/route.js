import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/profile?username=xxx
export async function GET(req) {
  try {
    const prisma = await getPrisma();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        games: {
          orderBy: { playedAt: 'desc' },
          take: 20,
        },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { password_hash, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Profile GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/profile — update bio, avatar, country
export async function PATCH(req) {
  try {
    const prisma = await getPrisma();
    const { username, bio, avatar, country } = await req.json();
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const user = await prisma.user.update({
      where: { username },
      data: {
        bio: bio !== undefined ? bio.slice(0, 160) : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        country: country !== undefined ? country.slice(0, 64) : undefined,
      }
    });

    const { password_hash, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Profile PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
