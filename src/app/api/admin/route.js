import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'memechess_admin_2024';
const BOT_NAMES = ['StockBot_Sigma', 'GigaChad_GM', 'Skibidi_NM', 'Rizz_Master', 'KaiCenat_Chess', 'GigaChad_Sigma', 'Skibidi_Toilet69', 'KaiCenat_Rizz', 'DogeFather_Musk'];

// GET: list all users (admin only)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get('password');

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prisma = await getPrisma();
    const users = await prisma.user.findMany({
      select: { id: true, username: true, meme_coins: true, elo: true, wins: true, losses: true, games_played: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    const usersWithBotFlag = users.map(u => ({
      ...u,
      isBot: BOT_NAMES.includes(u.username)
    }));

    return NextResponse.json(usersWithBotFlag);
  } catch (error) {
    console.error('Admin GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: remove a user account (admin only, bots protected)
export async function DELETE(req) {
  try {
    const { username, password } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    if (BOT_NAMES.includes(username)) {
      return NextResponse.json({ error: 'Cannot delete bot accounts' }, { status: 403 });
    }

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete child rows to prevent foreign key violations
    await prisma.gameHistory.deleteMany({ where: { userId: user.id } });
    await prisma.userQuest.deleteMany({ where: { userId: user.id } });
    await prisma.userAchievement.deleteMany({ where: { userId: user.id } });

    await prisma.user.delete({ where: { username } });

    return NextResponse.json({ success: true, message: `User "${username}" deleted.` });
  } catch (error) {
    console.error('Admin DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
