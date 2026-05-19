const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'memechess_salt_v1').digest('hex');
}

async function main() {
  console.log('Cleaning up existing database records...');
  // Delete all users and histories
  await prisma.userQuest.deleteMany({});
  await prisma.userAchievement.deleteMany({});
  await prisma.gameHistory.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.quest.deleteMany({});
  await prisma.achievement.deleteMany({});

  console.log('Creating admin account...');
  const passwordHash = hashPassword('admin123'); // Password for testing is admin123
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password_hash: passwordHash,
      meme_coins: 999999999,
      elo: 2500,
      wins: 100,
      losses: 0,
      draws: 0,
      games_played: 100,
      active_skin_pack: 'sigma',
      active_audio_pack: 'phonk',
      owned_items: 'classic,default,crypto,sigma,brainrot,phonk,bp_level_1,bp_level_2,bp_level_3,bp_level_4,bp_level_5,bp_level_6,bp_level_7',
      solved_puzzles: 'puzzle_sigma_mate,puzzle_elon_margin,puzzle_smothered_checkmate,puzzle_queen_sacrifice',
      avatar: '👑',
      bio: 'The ultimate MemeChess Overlord. Owner of all skins and ELO.'
    }
  });

  console.log('Seeding base quests...');
  const DAILY_QUESTS = [
    { key: 'play_3_games',  title: 'Play 3 Games',       description: 'Play any 3 games today',           reward: 50,  target: 3, type: 'daily' },
    { key: 'win_1_game',    title: 'Get a Win',          description: 'Win at least 1 game today',        reward: 75,  target: 1, type: 'daily' },
    { key: 'win_hard',      title: 'Hard Mode Win',      description: 'Beat the AI on Hard difficulty',   reward: 200, target: 1, type: 'daily' },
    { key: 'play_5_games',  title: 'Marathon Player',    description: 'Play 5 games in a single day',     reward: 120, target: 5, type: 'daily' },
    { key: 'win_3_games',   title: 'Win Streak',         description: 'Win 3 games today',                reward: 180, target: 3, type: 'daily' },
  ];

  for (const q of DAILY_QUESTS) {
    await prisma.quest.create({ data: q });
  }

  console.log('Seeding base achievements...');
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
    const ach = await prisma.achievement.create({ data: a });
    // Connect achievements to admin user
    await prisma.userAchievement.create({
      data: { userId: admin.id, achievementId: ach.id }
    });
  }

  console.log('Database cleanup and admin setup completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
