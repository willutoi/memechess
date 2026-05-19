import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

function calcElo(playerElo, opponentElo, score) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(playerElo + K * (score - expected));
}

const DIFF_ELO = { beginner: 800, intermediate: 1500, hard: 2200 };

export async function POST(req) {
  try {
    const prisma = await getPrisma();
    const { username, result, difficulty, moveCount = 0, duration = 0, pgn = '' } = await req.json();
    if (!username || !result || !difficulty) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const aiElo = DIFF_ELO[difficulty] || 1200;
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    const newElo = Math.max(100, calcElo(user.elo, aiElo, score));
    const coinsGained = result === 'win'
      ? (difficulty === 'hard' ? 150 : difficulty === 'intermediate' ? 80 : 30)
      : result === 'draw' ? 15 : 0;

    // Record game history
    await prisma.gameHistory.create({
      data: {
        userId: user.id,
        result,
        difficulty,
        eloChange: newElo - user.elo,
        coinsGained,
        moveCount,
        duration,
        pgn,
      }
    });

    const updated = await prisma.user.update({
      where: { username },
      data: {
        elo: newElo,
        wins:   result === 'win'  ? { increment: 1 } : undefined,
        losses: result === 'loss' ? { increment: 1 } : undefined,
        draws:  result === 'draw' ? { increment: 1 } : undefined,
        games_played: { increment: 1 },
        meme_coins: { increment: coinsGained },
      }
    });

    // ── Quest Progress ──────────────────────────────────────────────────
    const questRewards = await updateQuestProgress(prisma, user.id, result);

    // ── Achievements ────────────────────────────────────────────────────
    const newAchievements = await checkAchievements(prisma, user.id, updated);

    return NextResponse.json({
      ...updated,
      coinsGained: coinsGained + questRewards,
      eloChange: newElo - user.elo,
      questRewards,
      newAchievements,
    });
  } catch (error) {
    console.error('Game Result Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function updateQuestProgress(prisma, userId, result) {
  let bonusCoins = 0;
  const now = new Date();
  const quests = await prisma.userQuest.findMany({
    where: { userId, completed: false, expiresAt: { gt: now } },
    include: { quest: true }
  });

  for (const uq of quests) {
    let progress = uq.progress;
    const q = uq.quest;

    if (q.key === 'play_3_games' || q.key === 'play_5_games') {
      progress += 1;
    } else if ((q.key === 'win_1_game' || q.key === 'win_3_games') && result === 'win') {
      progress += 1;
    } else if (q.key === 'win_hard' && result === 'win') {
      progress += 1;
    }

    const completed = progress >= q.target;
    await prisma.userQuest.update({
      where: { id: uq.id },
      data: { progress, completed, claimedAt: completed && !uq.claimedAt ? now : uq.claimedAt }
    });

    if (completed && !uq.claimedAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { meme_coins: { increment: q.reward } }
      });
      bonusCoins += q.reward;
    }
  }
  return bonusCoins;
}

async function checkAchievements(prisma, userId, user) {
  const ACHIEVEMENTS = [
    { key: 'first_win',    condition: user.wins >= 1 },
    { key: 'ten_wins',     condition: user.wins >= 10 },
    { key: 'fifty_wins',   condition: user.wins >= 50 },
    { key: 'elo_1500',     condition: user.elo >= 1500 },
    { key: 'elo_2000',     condition: user.elo >= 2000 },
    { key: 'veteran',      condition: user.games_played >= 100 },
    { key: 'rich',         condition: user.meme_coins >= 5000 },
  ];

  const unlocked = [];
  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true }
  });
  const existingIds = new Set(existing.map(e => e.achievementId));

  for (const a of ACHIEVEMENTS) {
    if (!a.condition) continue;
    const ach = await prisma.achievement.findUnique({ where: { key: a.key } });
    if (!ach || existingIds.has(ach.id)) continue;
    await prisma.userAchievement.create({ data: { userId, achievementId: ach.id } });
    if (ach.reward > 0) {
      await prisma.user.update({ where: { id: userId }, data: { meme_coins: { increment: ach.reward } } });
    }
    unlocked.push(ach);
  }
  return unlocked;
}
