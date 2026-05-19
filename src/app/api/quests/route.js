import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/quests?username=xxx  — fetch user's active quests
// POST /api/quests               — seed/refresh daily quests for user
export async function GET(req) {
  try {
    const prisma = await getPrisma();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date();
    const quests = await prisma.userQuest.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      include: { quest: true },
      orderBy: { assignedAt: 'desc' }
    });

    return NextResponse.json(quests);
  } catch (error) {
    console.error('Quests GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const prisma = await getPrisma();
    const { username } = await req.json();
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check if daily quests already assigned today
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const existing = await prisma.userQuest.findFirst({
      where: {
        userId: user.id,
        assignedAt: { gte: todayStart },
        quest: { type: 'daily' }
      },
      include: { quest: true }
    });

    if (existing) {
      // Already seeded today, just return current quests
      const quests = await prisma.userQuest.findMany({
        where: { userId: user.id, expiresAt: { gt: now } },
        include: { quest: true }
      });
      return NextResponse.json({ seeded: false, quests });
    }

    // Ensure base quests exist in DB
    await ensureQuestsExist(prisma);

    const allDailyQuests = await prisma.quest.findMany({ where: { type: 'daily' } });
    const created = [];
    for (const q of allDailyQuests) {
      const uq = await prisma.userQuest.create({
        data: { userId: user.id, questId: q.id, expiresAt: tomorrow },
        include: { quest: true }
      });
      created.push(uq);
    }

    return NextResponse.json({ seeded: true, quests: created });
  } catch (error) {
    console.error('Quests POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function ensureQuestsExist(prisma) {
  const DAILY_QUESTS = [
    { key: 'play_3_games',  title: 'Play 3 Games',       description: 'Play any 3 games today',           reward: 50,  target: 3, type: 'daily' },
    { key: 'win_1_game',    title: 'Get a Win',          description: 'Win at least 1 game today',        reward: 75,  target: 1, type: 'daily' },
    { key: 'win_hard',      title: 'Hard Mode Win',      description: 'Beat the AI on Hard difficulty',   reward: 200, target: 1, type: 'daily' },
    { key: 'play_5_games',  title: 'Marathon Player',    description: 'Play 5 games in a single day',     reward: 120, target: 5, type: 'daily' },
    { key: 'win_3_games',   title: 'Win Streak',         description: 'Win 3 games today',                reward: 180, target: 3, type: 'daily' },
  ];

  for (const q of DAILY_QUESTS) {
    await prisma.quest.upsert({
      where: { key: q.key },
      update: {},
      create: q,
    });
  }

  const ACHIEVEMENTS_DEF = [
    { key: 'first_win',  title: 'First Blood',      description: 'Win your first game',             icon: '🏆', reward: 100 },
    { key: 'ten_wins',   title: 'On a Roll',         description: 'Win 10 games total',             icon: '🔥', reward: 200 },
    { key: 'fifty_wins', title: 'Chess God',         description: 'Win 50 games total',             icon: '👑', reward: 500 },
    { key: 'elo_1500',   title: 'Expert Player',     description: 'Reach 1500 ELO',                 icon: '⚡', reward: 300 },
    { key: 'elo_2000',   title: 'Grandmaster Tier',  description: 'Reach 2000 ELO',                 icon: '💎', reward: 1000 },
    { key: 'veteran',    title: 'Veteran',           description: 'Play 100 games',                 icon: '🗿', reward: 400 },
    { key: 'rich',       title: 'MemeCoin Whale',    description: 'Accumulate 5000 MemeCoins',      icon: '🪙', reward: 0 },
  ];

  for (const a of ACHIEVEMENTS_DEF) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: {},
      create: a,
    });
  }
}
