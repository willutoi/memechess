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
      const res = await fetch('/api/puzzles/solve', {
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
          ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
          : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';

        if (isSelected) bgStyle = 'rgba(251, 191, 36, 0.7)';

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
          <p style={{ color: '#818cf8', fontWeight: 600 }}>Loading brainrot puzzles...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '3rem' }}>🔒</p>
          <h2>Log In First</h2>
          <p style={{ opacity: 0.7, margin: '1rem 0' }}>You need an active account to earn ELO and MemeCoins from puzzles!</p>
          <Link href="/"><button className="btn-primary">Go to Login</button></Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>
          <Sparkles size={22} color="#fbbf24" /> Brainrot Puzzles
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '6px 12px', borderRadius: '18px', color: '#ffd700', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🪙 {user.meme_coins}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '6px 12px', borderRadius: '18px', color: '#a5b4fc', fontWeight: 'bold', fontSize: '0.9rem' }}>
            👑 {user.elo} ELO
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Puzzle list */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📂 Selection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {puzzles.map(p => {
              const isSelected = selectedPuzzle?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPuzzle(p)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 12, border: isSelected ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.06)',
                    background: isSelected ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.02)',
                    color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>{p.title}</p>
                    <p style={{ fontSize: '0.72rem', opacity: 0.6, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Award size={12} color="#ffd700" /> +{p.rewardCoins} MC · +{p.rewardElo} ELO
                    </p>
                  </div>
                  {p.solved && <CheckCircle2 size={20} color="#34d399" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle/Right Side: Interactive Chess Board & Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedPuzzle && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{selectedPuzzle.title}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75 }}>{selectedPuzzle.description}</p>
              </div>

              {/* Side notice / Turn indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem' }}>
                <span>Turn: <b style={{ color: selectedPuzzle.turn === 'w' ? '#fff' : '#818cf8' }}>{selectedPuzzle.turn === 'w' ? 'White' : 'Black'}</b></span>
                <button
                  onClick={() => setHintShown(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'none', border: 'none', color: '#fbbf24',
                    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem',
                    textDecoration: 'underline'
                  }}
                >
                  <Lightbulb size={14} /> Get Hint
                </button>
              </div>

              {hintShown && (
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '10px', fontSize: '0.8rem', color: '#fbbf24' }}>
                  💡 Hint: {selectedPuzzle.hint}
                </div>
              )}

              {/* Chessboard */}
              <div style={{ 
                borderRadius: 12, 
                overflow: 'hidden', 
                border: '3px solid rgba(99,102,241,0.35)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                width: '100%',
                maxWidth: '440px',
                margin: '0 auto'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%' }}>
                  {renderBoard()}
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: feedback.correct ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${feedback.correct ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 10, padding: '12px', fontSize: '0.85rem',
                  color: feedback.correct ? '#34d399' : '#f87171',
                  fontWeight: 700, animation: 'pulse 1.5s infinite'
                }}>
                  {feedback.correct ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
