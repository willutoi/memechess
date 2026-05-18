import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

const ELO_BOTS = [
  { username: 'StockBot_Sigma', elo: 2850, wins: 999, games_played: 1000, meme_coins: 9999999 },
  { username: 'GigaChad_GM', elo: 2400, wins: 312, games_played: 400, meme_coins: 420000 },
  { username: 'Skibidi_NM', elo: 1900, wins: 155, games_played: 220, meme_coins: 80000 },
  { username: 'Rizz_Master', elo: 1600, wins: 88, games_played: 160, meme_coins: 25000 },
  { username: 'KaiCenat_Chess', elo: 1350, wins: 40, games_played: 90, meme_coins: 7500 },
];

const COIN_BOTS = [
  { username: 'GigaChad_Sigma', meme_coins: 9999999, elo: 2200 },
  { username: 'Skibidi_Toilet69', meme_coins: 420000, elo: 1800 },
  { username: 'KaiCenat_Rizz', meme_coins: 1337, elo: 1200 },
  { username: 'DogeFather_Musk', meme_coins: 900, elo: 900 },
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'elo';

    const realUsers = await prisma.user.findMany({
      select: { username: true, meme_coins: true, elo: true, wins: true, losses: true, games_played: true }
    });

    let allUsers, sorted;

    if (tab === 'elo') {
      allUsers = [...realUsers, ...ELO_BOTS];
      const seen = new Set();
      const unique = allUsers.filter(u => seen.has(u.username) ? false : seen.add(u.username));
      sorted = unique.sort((a, b) => b.elo - a.elo).slice(0, 10);
    } else {
      allUsers = [...realUsers, ...COIN_BOTS];
      const seen = new Set();
      const unique = allUsers.filter(u => seen.has(u.username) ? false : seen.add(u.username));
      sorted = unique.sort((a, b) => b.meme_coins - a.meme_coins).slice(0, 10);
    }

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
