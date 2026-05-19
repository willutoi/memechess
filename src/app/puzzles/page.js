"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lightbulb, CheckCircle2, AlertCircle, Sparkles, Award } from 'lucide-react';
import { Chess } from 'chess.js';
import { Howl } from 'howler';

const EMOJI_SKINS = {
  classic: {
    wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
    bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚'
  },
  crypto: {
    wP: '🪙', wN: '🐕', wB: '💎', wR: '🚀', wQ: '📈', wK: '🧑‍🚀', 
    bP: '💸', bN: '🐻', bB: '🤡', bR: '🏢', bQ: '📉', bK: '👴'
  },
  sigma: {
    wP: '🍷', wN: '🗿', wB: '🏋️', wR: '🏰', wQ: '👑', wK: '😎', 
    bP: '💀', bN: '🤓', bB: '🍼', bR: '🏚️', bQ: '💸', bK: '😭'
  },
};

const SOUNDS = {
  move: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  correct: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  incorrect: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg'
};

export default function PuzzlesPage() {
  const [user, setUser] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [gameState, setGameState] = useState(null); // Chess instance
  const [boardFen, setBoardFen] = useState('');
  const [selectedSquare, setSelectedSquare] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [hintShown, setHintShown] = useState(false);
  const [feedback, setFeedback] = useState(null); // { correct: boolean, message: string }
  const [loading, setLoading] = useState(true);
  const [rewardPopup, setRewardPopup] = useState(null);

  const soundsRef = useRef({});

  useEffect(() => {
    // Load sounds
    const s = {};
    for (const [k, url] of Object.entries(SOUNDS)) {
      s[k] = new Howl({ src: [url], volume: 0.5 });
    }
    soundsRef.current = s;

    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) {
      fetchUser(storedUser);
      fetchPuzzles(storedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (username) => {
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.ok) setUser(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPuzzles = async (username) => {
    try {
      const res = await fetch(`/api/puzzles?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setPuzzles(data);
        if (data.length > 0) {
          selectPuzzle(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectPuzzle = (puzzle) => {
    setSelectedPuzzle(puzzle);
    const chess = new Chess(puzzle.fen);
    setGameState(chess);
    setBoardFen(chess.fen());
    setSelectedSquare('');
    setOptionSquares({});
    setHintShown(false);
    setFeedback(null);
  };

  const playSound = (name) => {
    try { soundsRef.current[name]?.play(); } catch (_) {}
  };

  const handleSquareClick = (square) => {
    if (!gameState || (feedback && feedback.correct)) return;

    if (!selectedSquare) {
      const piece = gameState.get(square);
      // Ensure the piece color matches the puzzle's turn
      if (piece && piece.color === selectedPuzzle.turn) {
        setSelectedSquare(square);
        const moves = gameState.moves({ square, verbose: true });
        const options = {};
        moves.forEach(m => { options[m.to] = true; });
        setOptionSquares(options);
      }
    } else {
      if (optionSquares[square]) {
        // Execute move
        const chessCopy = new Chess(gameState.fen());
        try {
          const result = chessCopy.move({ from: selectedSquare, to: square, promotion: 'q' });
          if (result) {
            setGameState(chessCopy);
            setBoardFen(chessCopy.fen());
            setSelectedSquare('');
            setOptionSquares({});
            playSound('move');

            // Verify move with the API
            verifyPuzzleMove(result.san);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        const piece = gameState.get(square);
        if (piece && piece.color === selectedPuzzle.turn) {
          setSelectedSquare(square);
          const moves = gameState.moves({ square, verbose: true });
          const options = {};
          moves.forEach(m => { options[m.to] = true; });
          setOptionSquares(options);
        } else {
          setSelectedSquare('');
          setOptionSquares({});
        }
      }
    }
  };

  const verifyPuzzleMove = async (moveSan) => {
    if (!user || !selectedPuzzle) return;

    try {
      const res = await fetch('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          puzzleId: selectedPuzzle.id,
          move: moveSan
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.correct) {
          playSound('correct');
          setFeedback({
            correct: true,
            message: data.alreadySolved 
              ? 'Correct! You already solved this puzzle before.' 
              : `Correct! Gained +${data.coinsGained} MemeCoins & +${data.eloGained} ELO 🗿`
          });
          
          setRewardPopup({
            title: 'Puzzle Solved! 🧩',
            message: data.alreadySolved 
              ? 'You already solved this puzzle previously.' 
              : 'Rewards successfully claimed:',
            rewards: data.alreadySolved ? [] : [
              `+${data.coinsGained} MemeCoins`,
              `+${data.eloGained} ELO`
            ]
          });

          // Update user state locally
          if (!data.alreadySolved) {
            setUser(prev => ({
              ...prev,
              meme_coins: data.newCoins,
              elo: data.newElo
            }));
            window.dispatchEvent(new CustomEvent('memechess_user_updated'));
            // Refresh puzzles list
            fetchPuzzles(user.username);
          }
        } else {
          playSound('incorrect');
          setFeedback({
            correct: false,
            message: 'Wrong move! Try again.'
          });
          // Reset board to starting puzzle FEN
          setTimeout(() => {
            const resetChess = new Chess(selectedPuzzle.fen);
            setGameState(resetChess);
            setBoardFen(resetChess.fen());
          }, 1200);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderBoard = () => {
    if (!gameState || !selectedPuzzle) return null;

    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const boardCells = [];

    ranks.forEach((rank, rIdx) => {
      files.forEach((file, fIdx) => {
        const squareName = `${file}${rank}`;
        const isDark = (rIdx + fIdx) % 2 === 1;
        const piece = gameState.get(squareName);

        const isSelected = selectedSquare === squareName;
        const isTarget = optionSquares[squareName];
        const hasPiece = !!piece;

        let bgStyle = isDark 
          ? '#B8C4A8'
          : '#FAF8F5';

        if (isSelected) bgStyle = '#f59e0b';

        let pieceDisplay = null;
        if (piece) {
          const activePack = user?.active_skin_pack || 'classic';
          const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
          const key = `${piece.color}${piece.type.toUpperCase()}`;
          const isWhitePiece = piece.color === 'w';

          pieceDisplay = (
            <span style={{ 
              fontSize: 'clamp(1.5rem, 8.5vw, 2.5rem)',
              fontWeight: '900',
              color: activePack === 'classic' ? (isWhitePiece ? '#ffffff' : '#111827') : 'inherit',
              userSelect: 'none', 
              textShadow: '2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000',
              filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.95))',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {skinMap[key]}
            </span>
          );
        }

        boardCells.push(
          <div
            key={squareName}
            onClick={() => handleSquareClick(squareName)}
            style={{
              aspectRatio: '1',
              background: bgStyle,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isTarget ? 'inset 0 0 15px rgba(239, 68, 68, 0.7)' : 'none',
            }}
          >
            {pieceDisplay}
            {isTarget && !hasPiece && (
              <div style={{
                position: 'absolute',
                width: '28%',
                height: '28%',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.65)',
                pointerEvents: 'none'
              }} />
            )}
          </div>
        );
      });
    });

    return boardCells;
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>♟️</div>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>Loading brainrot puzzles...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="neo-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '400px', background: '#ffffff', position: 'relative' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>🔒 RESTRICTED</div>

          <p style={{ fontSize: '3rem', margin: 0 }}>🔒</p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0' }}>Log In First</h2>
          <p style={{ opacity: 0.8, margin: '1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>You need an active account to earn ELO and MemeCoins from puzzles!</p>
          <Link href="/"><button className="btn-primary" style={{ width: '100%' }}>Go to Login</button></Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.5rem', gap: '2rem' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2.2rem', fontWeight: 900 }}>
          <Sparkles size={26} color="#d97706" /> Brainrot Puzzles
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', border: '2px solid var(--border-dark)', padding: '6px 14px', borderRadius: '14px', color: '#b45309', fontWeight: 900, fontSize: '0.9rem', boxShadow: '2px 2px 0px 0px var(--border-dark)' }}>
            🪙 {user.meme_coins.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(79,70,229,0.05)', border: '2px solid var(--border-dark)', padding: '6px 14px', borderRadius: '14px', color: 'var(--accent-primary)', fontWeight: 900, fontSize: '0.9rem', boxShadow: '2px 2px 0px 0px var(--border-dark)' }}>
            👑 {user.elo} ELO
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="puzzles-grid" style={{ maxWidth: '1000px', alignItems: 'start' }}>
        {/* Left Side: Puzzle list */}
        <div className="neo-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto', background: '#ffffff', position: 'relative' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-purple" style={{ top: '-12px', left: '-15px', transform: 'rotate(-4deg)', fontSize: '0.62rem' }}>🧩 PUZZLE PACK</div>

          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, borderBottom: '2px solid var(--border-dark)', paddingBottom: '6px' }}>Selection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {puzzles.map(p => {
              const isSelected = selectedPuzzle?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPuzzle(p)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 12, 
                    border: '2px solid var(--border-dark)',
                    background: isSelected ? 'rgba(217,119,6,0.05)' : '#ffffff',
                    color: 'var(--foreground)', cursor: 'pointer', textAlign: 'left',
                    boxShadow: isSelected ? '1px 1px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                    transform: isSelected ? 'translate(2px, 2px)' : 'none',
                    transition: 'all 0.1s'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 900, margin: 0, fontSize: '0.9rem' }}>{p.title}</p>
                    <p style={{ fontSize: '0.78rem', opacity: 0.8, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                      <Award size={12} color="#b45309" /> +{p.rewardCoins} MC · +{p.rewardElo} ELO
                    </p>
                  </div>
                  {p.solved && <CheckCircle2 size={20} color="#059669" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle/Right Side: Interactive Chess Board & Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedPuzzle && (
            <div className="neo-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', background: '#ffffff', position: 'relative' }}>
              {/* Sticker */}
              <div className="neo-sticker sticker-pink" style={{ top: '-15px', right: '-15px', transform: 'rotate(6deg)', fontSize: '0.65rem' }}>🔥 100% SOLVABLE</div>

              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 900 }}>{selectedPuzzle.title}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.75, fontWeight: 600 }}>{selectedPuzzle.description}</p>
              </div>

              {/* Side notice / Turn indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '2px solid var(--border-dark)', padding: '10px 14px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 800, boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
                <span>Turn: <b style={{ color: selectedPuzzle.turn === 'w' ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>{selectedPuzzle.turn === 'w' ? 'White' : 'Black'}</b></span>
                <button
                  onClick={() => setHintShown(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'none', border: 'none', color: '#b45309',
                    cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem',
                    textDecoration: 'underline'
                  }}
                >
                  <Lightbulb size={14} /> Get Hint
                </button>
              </div>

              {hintShown && (
                <div style={{ background: '#fef3c7', border: '2px solid var(--border-dark)', borderRadius: 10, padding: '12px', fontSize: '0.85rem', color: '#b45309', fontWeight: 700, boxShadow: '2px 2px 0px var(--border-dark)' }}>
                  💡 Hint: {selectedPuzzle.hint}
                </div>
              )}

              {/* Chessboard */}
              <div style={{ 
                borderRadius: 12, 
                overflow: 'hidden', 
                border: '2px solid var(--border-dark)',
                boxShadow: '3px 3px 0px 0px var(--border-dark)',
                background: '#ffffff',
                width: '100%',
                maxWidth: '440px',
                margin: '0 auto',
                padding: 4
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-dark)' }}>
                  {renderBoard()}
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: feedback.correct ? '#d1fae5' : '#fee2e2',
                  border: '2px solid var(--border-dark)',
                  borderRadius: 10, padding: '12px', fontSize: '0.88rem',
                  color: feedback.correct ? '#047857' : '#b91c1c',
                  fontWeight: 800, boxShadow: '2px 2px 0px var(--border-dark)',
                  animation: 'pulse 1.5s infinite'
                }}>
                  {feedback.correct ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Replay/Reset Action Button */}
              {(selectedPuzzle.solved || (feedback && feedback.correct)) && (
                <button
                  onClick={() => {
                    const chess = new Chess(selectedPuzzle.fen);
                    setGameState(chess);
                    setBoardFen(chess.fen());
                    setSelectedSquare('');
                    setOptionSquares({});
                    setFeedback(null);
                  }}
                  className="btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '10px 16px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 800
                  }}
                >
                  🔄 Reset & Replay Puzzle
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Modal reward popup */}
      {rewardPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="neo-panel" style={{
            background: '#ffffff',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            width: '90%',
            maxWidth: 380,
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Stickers on reward popup */}
            <div className="neo-sticker sticker-pink" style={{ top: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>📈 PUZZLE CLEAR!</div>
            <div className="neo-sticker sticker-green" style={{ bottom: '-15px', left: '-15px', transform: 'rotate(-6deg)' }}>✨ 300 IQ</div>

            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>🎉</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)' }}>{rewardPopup.title}</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.92rem', opacity: 0.8, fontWeight: 600 }}>{rewardPopup.message}</p>
            {rewardPopup.rewards && rewardPopup.rewards.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                {rewardPopup.rewards.map((msg, i) => {
                  const isElo = msg.includes('ELO');
                  const icon = isElo ? '👑' : '🪙';
                  const color = isElo ? '#b45309' : '#059669';
                  const bg = isElo ? 'rgba(217,119,6,0.05)' : 'rgba(16,185,129,0.05)';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '12px', borderRadius: 12, background: bg, border: '2px solid var(--border-dark)', color: color, fontWeight: 900, fontSize: '1.15rem', boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
                      <span>{icon}</span>
                      <span>{msg.replace('🪙', '').replace('MemeCoins', '').trim()}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn-primary" onClick={() => setRewardPopup(null)} style={{ width: '100%', padding: '12px 24px', fontSize: '1.05rem' }}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
