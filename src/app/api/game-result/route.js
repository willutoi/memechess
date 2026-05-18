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
    const { username, result, difficulty } = await req.json();
    if (!username || !result || !difficulty) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const aiElo = DIFF_ELO[difficulty] || 1200;
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    const newElo = Math.max(100, calcElo(user.elo, aiElo, score));
    const coinsGained = result === 'win' ? (difficulty === 'hard' ? 150 : difficulty === 'intermediate' ? 80 : 30) : result === 'draw' ? 15 : 0;

    const updated = await prisma.user.update({
      where: { username },
      data: {
        elo: newElo,
        wins: result === 'win' ? { increment: 1 } : undefined,
        losses: result === 'loss' ? { increment: 1 } : undefined,
        games_played: { increment: 1 },
        meme_coins: { increment: coinsGained },
      }
    });

    return NextResponse.json({ ...updated, coinsGained, eloChange: newElo - user.elo });
  } catch (error) {
    console.error('Game Result Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
