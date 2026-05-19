import { getPrisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// Curated meme-themed puzzles
const PUZZLES = [
  {
    id: 'puzzle_sigma_mate',
    title: 'Sigma Mate in 1 🗿',
    description: 'The opponent has zero aura. Find the mate in 1 to secure the ultimate Gigachad victory.',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3', // Scholar's mate setup (White to move and checkmate)
    turn: 'w',
    solution: ['Qxf7#'], // Qxf7# or just Qxf7
    rewardCoins: 150,
    rewardElo: 20,
    hint: 'Use the Queen to infiltrate their F7 weakness. Pure Sigma style.'
  },
  {
    id: 'puzzle_elon_margin',
    title: 'Musk\'s Margin Call 🚀',
    description: 'Your portfolio is down 99%. Find the fork to liquidate the shorts and save Tesla.',
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    // Let's make a real fork puzzle:
    // e.g. White to move, Knight fork on c7 or similar.
    // Let's construct a simple knight fork position:
    // White: Ke1, Rd1, Nc3, pawns a2,b2,c2,d4
    // Black: Ke8, Rd8, Nc6, pawns a7,b7,c7,d5
    // Wait, let's use a standard chess fork:
    // White: Kf1, Nd5, Pawns. Black: Kf7, Rd8, Pawns. Nd5 can fork Ke7 / Rd8 etc.
    // Let's use a simpler one:
    // White: Ke1, Nc7+ forks Black King on e8 and Rook on a8.
    // Setup: White to move, Knight on e6 can jump to c7.
    // FEN: r3kbnr/ppp2ppp/2n1b3/3qp3/8/5N2/PPPPQPPP/RNB1KB1R w KQkq - 4 6
    // If White plays Nb5 or Nd4... let's just make it simple.
    // FEN: r3k2r/ppp2ppp/2n1bn2/1B1pp3/8/2N1PN2/PPPP1PPP/R3K2R w KQkq - 4 8
    // How about a clear mate in 1 or 2?
    // Let's do: White to move, Rook checkmate on backrank.
    // FEN: 6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1
    // Solution: Re8#
    fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    turn: 'w',
    solution: ['Re8#', 'Re8'],
    rewardCoins: 100,
    rewardElo: 15,
    hint: 'Look for the unguarded back rank. Send the Rook to the moon!'
  },
  {
    id: 'puzzle_smothered_checkmate',
    title: 'Smothered Brainrot 🧠',
    description: 'Opponent pieces are crowding their own King. Deliver the most satisfying smothered checkmate.',
    // Typical smothered mate setup
    // White Knight on f7 checkmating Black King on h8, surrounded by Kg8, Rf8, pawns g7, h7.
    // FEN: 6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1
    fen: '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1',
    turn: 'w',
    solution: ['Nf7#', 'Nh6#'], // Smothered mate with Knight on f7
    rewardCoins: 200,
    rewardElo: 25,
    hint: 'Jump the Knight to the final square where the King cannot breathe.'
  },
  {
    id: 'puzzle_queen_sacrifice',
    title: 'Sigma Queen Sac 👑',
    description: 'Sacrifice your Queen for maximum aura points and checkmate in 2 moves.',
    // Legal's Mate or similar Queen sac
    // Let's do a simple mate in 2:
    // FEN: r1bqk1sr/ppp2ppp/2np4/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6
    // Actually, let's use:
    // White: Queen on h5, Rook on f1, King on g1, Pawn on f2, g2, h2, Bishop on c4
    // Black: King on g8, Rook on f8, Pawn on f7, g7, h7
    // Let's do a classic:
    // FEN: 6rk/5Qpp/8/8/8/8/8/6K1 w - - 0 1
    // If we want a simple Queen sacrifice:
    // White plays Qxh7+ Kxh7 Rh5#
    // Setup FEN: 6rk/5Q1p/8/8/8/8/7R/6K1 w - - 0 1
    // White plays Qxh7+ Kxh7 Rxh7#
    fen: '6rk/5Q1p/7R/8/8/8/8/6K1 w - - 0 1',
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
