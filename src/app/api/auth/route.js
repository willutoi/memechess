import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'memechess_salt_v1').digest('hex');
}

export async function POST(req) {
  try {
    const prisma = await getPrisma();
    const { username, password, action } = await req.json();

    if (!username || username.trim() === '') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (!password || password.trim() === '') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const trimmedUser = username.trim().toLowerCase();
    const hash = hashPassword(password.trim());

    let user = await prisma.user.findUnique({ where: { username: trimmedUser } });

    if (action === 'register') {
      if (user) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
      user = await prisma.user.create({
        data: {
          username: trimmedUser,
          password_hash: hash,
          meme_coins: trimmedUser === 'admin' ? 999999999 : 500,
          active_skin_pack: 'classic',
          active_audio_pack: 'classic',
        }
      });
      // Seed daily quests for new user
      await seedDailyQuests(prisma, user.id);
      return NextResponse.json({ ...user, isNew: true });
    }

    // Login
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Legacy users (password_hash = "") — allow login and set password
    if (user.password_hash === '') {
      user = await prisma.user.update({
        where: { username: trimmedUser },
        data: { password_hash: hash }
      });
    } else if (user.password_hash !== hash) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function seedDailyQuests(prisma, userId) {
  try {
    const quests = await prisma.quest.findMany({ where: { type: 'daily' } });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    for (const q of quests) {
      await prisma.userQuest.create({
        data: { userId, questId: q.id, expiresAt: tomorrow }
      });
    }
  } catch (_) {}
}
