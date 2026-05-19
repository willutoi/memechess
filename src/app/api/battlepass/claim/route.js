import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

const BP_REWARDS = [
  { level: 1, title: 'Classic Skin Pack ♟️', type: 'item', requirementText: 'Free Starter Reward', check: () => true, rewardVal: 'classic', coinReward: 0 },
  { level: 2, title: '250 MemeCoins 🪙', type: 'coins', requirementText: 'Win at least 2 games', check: (u) => u.wins >= 2, rewardVal: '', coinReward: 250 },
  { level: 3, title: 'Sigma Title Badge 🗿', type: 'badge', requirementText: 'Reach 1300 ELO', check: (u) => u.elo >= 1300, rewardVal: 'Sigma Gym Bro 🗿', coinReward: 0 },
  { level: 4, title: '500 MemeCoins 🪙', type: 'coins', requirementText: 'Play 10 games total', check: (u) => u.games_played >= 10, rewardVal: '', coinReward: 500 },
  { level: 5, title: 'GigaChad Status 🍷', type: 'badge', requirementText: 'Win at least 8 games', check: (u) => u.wins >= 8, rewardVal: 'Alpha GigaChad 🍷', coinReward: 0 },
  { level: 6, title: '1000 MemeCoins 🪙', type: 'coins', requirementText: 'Reach 1450 ELO', check: (u) => u.elo >= 1450, rewardVal: '', coinReward: 1000 },
  { level: 7, title: 'Stockfish Slayer 🧠', type: 'badge', requirementText: 'Win 20 games total', check: (u) => u.wins >= 20, rewardVal: 'Stockfish Slayer 🧠', coinReward: 0 }
];

// POST /api/battlepass/claim
export async function POST(req) {
  try {
    const prisma = await getPrisma();
    const { username, level } = await req.json();

    if (!username || !level) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const reward = BP_REWARDS.find(r => r.level === parseInt(level));
    if (!reward) {
      return NextResponse.json({ error: 'Invalid level reward' }, { status: 400 });
    }

    // Verify requirements
    if (!reward.check(user)) {
      return NextResponse.json({ error: `Requirements not met: ${reward.requirementText}` }, { status: 400 });
    }

    // Check if already claimed
    const owned = user.owned_items.split(',').filter(Boolean);
    const claimKey = `bp_level_${level}`;
    if (owned.includes(claimKey)) {
      return NextResponse.json({ error: 'Already claimed!' }, { status: 400 });
    }

    // Add claim key
    owned.push(claimKey);

    // Apply reward
    let dataUpdate = {
      owned_items: owned.join(',')
    };

    if (reward.type === 'coins') {
      dataUpdate.meme_coins = { increment: reward.coinReward };
    } else if (reward.type === 'badge') {
      // Set bio or add custom badge/title
      const newBio = user.bio ? `${user.bio} | Title: ${reward.rewardVal}` : `Title: ${reward.rewardVal}`;
      dataUpdate.bio = newBio.slice(0, 160);
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: dataUpdate
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      rewardText: reward.type === 'coins' ? `+${reward.coinReward} MemeCoins` : `unlocked "${reward.rewardVal}" title!`
    });
  } catch (error) {
    console.error('Battlepass Claim POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
