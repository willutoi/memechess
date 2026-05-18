import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username || username.trim() === '') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          meme_coins: username.toLowerCase() === 'admin' ? 999999999 : 500,
          active_skin_pack: 'classic',
        }
      });
    } else if (username.toLowerCase() === 'admin' && user.meme_coins < 999999999) {
      user = await prisma.user.update({
        where: { username },
        data: { meme_coins: 999999999 }
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
