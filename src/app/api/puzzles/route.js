import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// Curated meme-themed puzzles
const PUZZLES = [
  {
    id: 'puzzle_sigma_mate',
    title: 'Sigma Mate in 1 🗿',
    description: 'The opponent has zero aura. Find the mate in 1 to secure the ultimate Gigachad victory.',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', // White to move
    turn: 'w',
    solution: ['Qxf7#', 'Qxf7'],
    rewardCoins: 150,
    rewardElo: 20,
    hint: 'Use the Queen to infiltrate their F7 weakness. Pure Sigma style.'
  },
  {
    id: 'puzzle_elon_margin',
    title: 'Musk\'s Margin Call 🚀',
    description: 'Your portfolio is down 99%. Find the backrank mate to liquidate the shorts and save Tesla.',
    fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', // White to move
    turn: 'w',
    solution: ['Re8#', 'Re8'],
    rewardCoins: 100,
    rewardElo: 15,
    hint: 'Look for the unguarded back rank. Send the Rook to the moon!'
  },
  {
    id: 'puzzle_smothered_checkmate',
    title: 'Smothered Brainrot 🧠',
    description: 'Opponent pieces are crowding their own King. Deliver the satisfying smothered checkmate in 1.',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', // White to move
    turn: 'w',
    solution: ['Nf7#', 'Nf7'],
    rewardCoins: 200,
    rewardElo: 25,
    hint: 'Jump the Knight to the final square where the King cannot breathe.'
  },
  {
    id: 'puzzle_queen_sacrifice',
    title: 'Sigma Queen Sac 👑',
    description: 'Sacrifice your Queen for maximum aura points and checkmate on the next move.',
    fen: '6rk/5Q1p/7R/8/8/8/8/6K1 w - - 0 1', // White to move
    turn: 'w',
    solution: ['Qxh7#', 'Qxh7'],
    rewardCoins: 250,
    rewardElo: 30,
    hint: 'The Queen goes first. Smash the pawn on h7.'
  }
];

// GET /api/puzzles?username=xxx
export async function GET(req) {
  try {
    const prisma = await getPrisma();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    let solvedList = [];
    if (username) {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { solved_puzzles: true }
      });
      if (user && user.solved_puzzles) {
        solvedList = user.solved_puzzles.split(',').filter(Boolean);
      }
    }

    const puzzlesWithStatus = PUZZLES.map(p => ({
      ...p,
      solved: solvedList.includes(p.id)
    }));

    return NextResponse.json(puzzlesWithStatus);
  } catch (error) {
    console.error('Puzzles GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/puzzles/solve
export async function POST(req) {
  try {
    const prisma = await getPrisma();
    const { username, puzzleId, move } = await req.json();

    if (!username || !puzzleId || !move) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const puzzle = PUZZLES.find(p => p.id === puzzleId);
    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // Validate solution
    const isCorrect = puzzle.solution.some(
      s => s.toLowerCase() === move.toLowerCase() || s.replace('#', '').toLowerCase() === move.replace('#', '').toLowerCase()
    );

    if (!isCorrect) {
      return NextResponse.json({ correct: false, error: 'Incorrect move, try again!' });
    }

    // Award rewards if not solved before
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const solvedList = user.solved_puzzles.split(',').filter(Boolean);
    const alreadySolved = solvedList.includes(puzzleId);

    let updatedUser = user;
    let coinsGained = 0;
    let eloGained = 0;

    if (!alreadySolved) {
      solvedList.push(puzzleId);
      coinsGained = puzzle.rewardCoins;
      eloGained = puzzle.rewardElo;

      updatedUser = await prisma.user.update({
        where: { username },
        data: {
          solved_puzzles: solvedList.join(','),
          meme_coins: { increment: coinsGained },
          elo: { increment: eloGained }
        }
      });
      window.dispatchEvent && window.dispatchEvent(new CustomEvent('memechess_user_updated'));
    }

    return NextResponse.json({
      correct: true,
      alreadySolved,
      coinsGained,
      eloGained,
      newElo: updatedUser.elo,
      newCoins: updatedUser.meme_coins
    });
  } catch (error) {
    console.error('Puzzle Solve POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
