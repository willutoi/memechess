"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Howl } from 'howler';

// Incredibly pleasant and satisfying CORS-safe sounds
const AUDIO_PACKS = {
  classic: {
    // Satisfying crisp pops and wood clicks
    move: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
    capture: 'https://actions.google.com/sounds/v1/foley/tennis_ball_hard_hits.ogg',
    check: 'https://actions.google.com/sounds/v1/doors/gate_latch_click.ogg',
    gameOver: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'
  },
  brainrot: {
    // Energetic cartoon splats and tech pops
    move: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg',
    capture: 'https://actions.google.com/sounds/v1/cartoon/splat.ogg',
    check: 'https://actions.google.com/sounds/v1/science_fiction/incoming_transmission.ogg',
    gameOver: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle_up.ogg'
  },
  phonk: {
    // Heavy bass hits and sharp mechanical clicks
    move: 'https://actions.google.com/sounds/v1/impacts/crash.ogg',
    capture: 'https://actions.google.com/sounds/v1/weapons/laser_gun.ogg',
    check: 'https://actions.google.com/sounds/v1/alarms/industrial_alarm_loop.ogg',
    gameOver: 'https://actions.google.com/sounds/v1/impacts/sub_bass_drop.ogg'
  }
};

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

const AI_PHRASES = [
  "Make a move, meatbag! ⚡",
  "Are you Googling 'how to play chess'? 😂",
  "Stockfish 16 is crying laughing at your Elo. 💀",
  "Sigma grindset: always sac the queen. 🗿",
  "Bro thinks he's Magnus Carlsen 💀",
  "14,000,605 futures. You lose in ALL of them. 🔮",
  "Negative aura move right there. 😬",
  "This is so cap bro. 🧢",
];

const PIECE_VALUES = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 9000 };

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALUES[piece.type];
        score += piece.color === 'w' ? val : -val;
      }
    }
  }
  return score;
}

export default function MemeChessBoard({ activePack = 'classic', activeAudioPack = 'classic' }) {
  const [playerColor, setPlayerColor] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  
  const [game, setGame] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiPhrase, setAiPhrase] = useState(AI_PHRASES[0]);

  // Click-to-move state
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Chess clocks (10 minutes each)
  const [playerTime, setPlayerTime] = useState(600);
  const [aiTime, setAiTime] = useState(600);
  const [gameActive, setGameActive] = useState(false);

  // History & Captured Pieces
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);

  // ── Sounds Ref
  const soundsRef = useRef({});
  useEffect(() => {
    const pack = AUDIO_PACKS[activeAudioPack] || AUDIO_PACKS.classic;
    const s = {};
    for (const [k, url] of Object.entries(pack)) {
      s[k] = new Howl({ src: [url], volume: 0.55 });
    }
    soundsRef.current = s;
  }, [activeAudioPack]);

  const playSound = useCallback((type) => {
    try { soundsRef.current[type]?.play(); } catch(_) {}
  }, []);

  // ── AI Phrases Loop
  useEffect(() => {
    const id = setInterval(() => {
      setAiPhrase(p => {
        const r = AI_PHRASES.filter(x => x !== p);
        return r[Math.floor(Math.random() * r.length)];
      });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Clocks Timer Hook
  useEffect(() => {
    if (!gameActive || game.isGameOver()) return;

    const timer = setInterval(() => {
      const turn = game.turn();
      if (turn === playerColor) {
        setPlayerTime(t => {
          if (t <= 1) {
            setGameStatus('⌛ Timeout! AI Wins!');
            setGameActive(false);
            playSound('gameOver');
            recordGameResult('loss');
            return 0;
          }
          return t - 1;
        });
      } else {
        setAiTime(t => {
          if (t <= 1) {
            setGameStatus('🏆 Timeout! You Win!');
            setGameActive(false);
            playSound('gameOver');
            recordGameResult('win');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, playerColor, game, playSound]);

  // Record ELO in DB
  const recordGameResult = async (res) => {
    const storedUser = localStorage.getItem('memechess_user');
    if (!storedUser) return;
    try {
      const response = await fetch('/api/game-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: storedUser, result: res, difficulty })
      });
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('memechess_user_updated'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Move Engine
  const makeAIMove = useCallback((currentGame) => {
    if (currentGame.isGameOver()) return;
    setAiThinking(true);

    setTimeout(() => {
      const moves = currentGame.moves({ verbose: true });
      if (!moves.length) { setAiThinking(false); return; }

      let selectedMove;

      if (difficulty === 'beginner') {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (difficulty === 'intermediate') {
        let bestVal = -Infinity;
        const choices = [];
        moves.forEach(m => {
          const val = m.captured ? PIECE_VALUES[m.captured] : 0;
          if (val > bestVal) {
            bestVal = val;
            choices.length = 0;
            choices.push(m);
          } else if (val === bestVal) {
            choices.push(m);
          }
        });
        selectedMove = choices[Math.floor(Math.random() * choices.length)];
      } else {
        let bestMove = null;
        let bestValue = Infinity;
        
        const minimax = (gameInstance, depth, isMaximizing) => {
          if (depth === 0 || gameInstance.isGameOver()) {
            return evaluateBoard(gameInstance.board());
          }
          const instMoves = gameInstance.moves();
          if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < instMoves.length; i++) {
              const cpy = new Chess(gameInstance.fen());
              cpy.move(instMoves[i]);
              const score = minimax(cpy, depth - 1, false);
              maxEval = Math.max(maxEval, score);
            }
            return maxEval;
          } else {
            let minEval = Infinity;
            for (let i = 0; i < instMoves.length; i++) {
              const cpy = new Chess(gameInstance.fen());
              cpy.move(instMoves[i]);
              const score = minimax(cpy, depth - 1, true);
              minEval = Math.min(minEval, score);
            }
            return minEval;
          }
        };

        moves.forEach(m => {
          const cpy = new Chess(currentGame.fen());
          cpy.move(m.san);
          const score = minimax(cpy, 2, true);
          if (score < bestValue) {
            bestValue = score;
            bestMove = m;
          }
        });

        selectedMove = bestMove || moves[Math.floor(Math.random() * moves.length)];
      }

      const gameCopy = new Chess(currentGame.fen());
      try {
        const result = gameCopy.move(selectedMove);
        setGame(gameCopy);

        if (result.captured) {
          if (result.color === 'w') {
            setCapturedWhite(c => [...c, result.captured]);
          } else {
            setCapturedBlack(c => [...c, result.captured]);
          }
        }

        setMoveHistory(h => [...h, result.san]);

        if (gameCopy.isGameOver()) {
          setGameActive(false);
          const isDraw = gameCopy.isDraw();
          setGameStatus(isDraw ? '🤝 Draw!' : '☠️ Checkmate!');
          playSound('gameOver');
          recordGameResult(isDraw ? 'draw' : playerColor === 'w' ? 'loss' : 'win');
        } else if (gameCopy.isCheck()) {
          setGameStatus('⚡ Check!');
          playSound('check');
        } else {
          setGameStatus('');
          playSound(result.captured ? 'capture' : 'move');
        }
      } catch (e) {
        console.error("AI execution error:", e);
      }

      setAiThinking(false);
    }, 600);
  }, [difficulty, playerColor, playSound]);

  // Start Game Handler
  const startGame = useCallback((color) => {
    const newGame = new Chess();
    setGame(newGame);
    setPlayerColor(color);
    setGameStatus('');
    setMoveFrom('');
    setOptionSquares({});
    setPlayerTime(600);
    setAiTime(600);
    setGameActive(true);
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);

    if (color === 'b') {
      makeAIMove(newGame);
    } else {
      setAiThinking(false);
    }
  }, [makeAIMove]);

  // Execute Move
  const executeMove = useCallback((from, to) => {
    if (!playerColor || aiThinking || game.isGameOver()) return false;
    if (game.turn() !== playerColor) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move({ from, to, promotion: 'q' });
      if (!result) return false;

      setGame(gameCopy);
      setMoveFrom('');
      setOptionSquares({});

      if (result.captured) {
        if (result.color === 'w') {
          setCapturedWhite(c => [...c, result.captured]);
        } else {
          setCapturedBlack(c => [...c, result.captured]);
        }
      }

      setMoveHistory(h => [...h, result.san]);

      if (gameCopy.isGameOver()) {
        setGameActive(false);
        const isDraw = gameCopy.isDraw();
        setGameStatus(isDraw ? '🤝 Draw!' : '🏆 You Win!');
        playSound('gameOver');
        recordGameResult(isDraw ? 'draw' : 'win');
      } else if (gameCopy.isCheck()) {
        setGameStatus('⚡ Check!');
        playSound('check');
      } else {
        setGameStatus('');
        playSound(result.captured ? 'capture' : 'move');
      }

      if (!gameCopy.isGameOver()) {
        makeAIMove(gameCopy);
      }
      return true;
    } catch (e) {
      console.error("User Move Error:", e);
      return false;
    }
  }, [playerColor, aiThinking, game, playSound, makeAIMove]);

  // Click-to-move handler
  const handleSquareClick = (squareName) => {
    if (!playerColor || aiThinking || game.isGameOver()) return;
    if (game.turn() !== playerColor) return;

    if (!moveFrom) {
      const piece = game.get(squareName);
      if (piece && piece.color === playerColor) {
        setMoveFrom(squareName);
        const moves = game.moves({ square: squareName, verbose: true });
        const options = {};
        moves.forEach(m => { options[m.to] = true; });
        setOptionSquares(options);
      }
    } else {
      if (optionSquares[squareName]) {
        executeMove(moveFrom, squareName);
      } else {
        const piece = game.get(squareName);
        if (piece && piece.color === playerColor) {
          setMoveFrom(squareName);
          const moves = game.moves({ square: squareName, verbose: true });
          const options = {};
          moves.forEach(m => { options[m.to] = true; });
          setOptionSquares(options);
        } else {
          setMoveFrom('');
          setOptionSquares({});
        }
      }
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Render Board
  const renderBoard = () => {
    const ranks = playerColor === 'b' ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = playerColor === 'b' ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    const boardCells = [];

    ranks.forEach((rank, rIdx) => {
      files.forEach((file, fIdx) => {
        const squareName = `${file}${rank}`;
        const isDark = (rIdx + fIdx) % 2 === 1;
        const piece = game.get(squareName);

        const isSelected = moveFrom === squareName;
        const isTarget = optionSquares[squareName];
        const hasPiece = !!piece;

        let bgStyle = isDark 
          ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
          : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';

        if (isSelected) {
          bgStyle = 'rgba(251, 191, 36, 0.7)';
        }

        let pieceDisplay = null;
        if (piece) {
          const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
          const key = `${piece.color}${piece.type.toUpperCase()}`;
          const isWhitePiece = piece.color === 'w';

          // Apply thick pixel art black outlines & solid offset shadow to look EXACTLY like high-end retro assets
          pieceDisplay = (
            <span style={{ 
              fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
              fontWeight: '900',
              color: activePack === 'classic' ? (isWhitePiece ? '#ffffff' : '#111827') : 'inherit',
              userSelect: 'none', 
              // Perfect 8-bit black stroke outline + solid drop shadow
              textShadow: '2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
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

        const showRankLabel = fIdx === 0;
        const showFileLabel = rIdx === 7;

        boardCells.push(
          <div
            key={squareName}
            onClick={() => handleSquareClick(squareName)}
            onDragOver={(e) => {
              if (!aiThinking && playerColor && game.turn() === playerColor) {
                e.preventDefault();
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const src = e.dataTransfer.getData('text/plain');
              executeMove(src, squareName);
            }}
            style={{
              aspectRatio: '1',
              background: bgStyle,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !aiThinking && hasPiece && piece.color === playerColor ? 'grab' : 'pointer',
              transition: 'all 0.18s ease-in-out',
              boxShadow: isTarget ? 'inset 0 0 15px rgba(239, 68, 68, 0.7)' : 'none',
            }}
          >
            {pieceDisplay && (
              <div
                draggable={!aiThinking && piece.color === playerColor}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', squareName);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pieceDisplay}
              </div>
            )}

            {isTarget && !hasPiece && (
              <div style={{
                position: 'absolute',
                width: '28%',
                height: '28%',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.65)',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                pointerEvents: 'none'
              }} />
            )}

            {showRankLabel && (
              <span style={{
                position: 'absolute',
                top: 4,
                left: 4,
                fontSize: '0.62rem',
                fontWeight: 800,
                opacity: 0.65,
                color: isDark ? '#e0e7ff' : '#1e1b4b',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {rank}
              </span>
            )}
            {showFileLabel && (
              <span style={{
                position: 'absolute',
                bottom: 2,
                right: 4,
                fontSize: '0.62rem',
                fontWeight: 800,
                opacity: 0.65,
                color: isDark ? '#e0e7ff' : '#1e1b4b',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {file}
              </span>
            )}
          </div>
        );
      });
    });

    return boardCells;
  };

  if (!playerColor) {
    return (
      <div style={{ width:'100%', maxWidth:520, margin:'0 auto', textAlign:'center' }}>
        <div className="glass-panel" style={{ padding:'2.5rem 2rem' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'0.5rem' }}>👑</div>
          <h2 className="text-gradient" style={{ fontSize:'2rem', fontWeight:800, marginBottom:'1rem' }}>MemeChess Arena</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color:'#818cf8', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:600 }}>CHOOSE AI DIFFICULTY</p>
            <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center' }}>
              {['beginner', 'intermediate', 'hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(99,102,241,0.4)',
                    background: difficulty === level ? '#6366f1' : 'rgba(99,102,241,0.08)',
                    color: difficulty === level ? '#fff' : '#a5b4fc',
                    cursor: 'pointer',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <p style={{ color:'#818cf8', marginBottom:'2rem', fontSize:'0.95rem' }}>Pick your side and start accumulating ELO & Coins!</p>
          
          <div style={{ display:'flex', gap:'1.5rem', justifyContent:'center' }}>
            <button onClick={() => startGame('w')} style={{ padding:'1rem 2rem', borderRadius:12, border:'2px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.9)', color:'#1e1b4b', fontWeight:800, fontSize:'1.1rem', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem', transition:'all 0.2s' }} onMouseEnter={e=>e.target.style.transform='scale(1.05)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}>
              <span style={{ fontSize:'2rem' }}>♙</span> Play White
            </button>
            <button onClick={() => startGame('b')} style={{ padding:'1rem 2rem', borderRadius:12, border:'2px solid rgba(99,102,241,0.5)', background:'rgba(30,27,81,0.9)', color:'#e0e7ff', fontWeight:800, fontSize:'1.1rem', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem', transition:'all 0.2s' }} onMouseEnter={e=>e.target.style.transform='scale(1.05)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}>
              <span style={{ fontSize:'2rem' }}>♟</span> Play Black
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Responsive: detect mobile to adjust font sizes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div style={{ width:'100%', maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap: 16 }}>
      <div style={{ width: '100%' }}>
        {/* AI Speech Bubble */}
        <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:'10px 14px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'1.4rem' }}>🤖</span>
          <p style={{ margin:0, fontSize:'0.85rem', fontStyle:'italic', color:'#c7d2fe' }}>{aiPhrase}</p>
        </div>

        {/* Board Status / Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 'bold' }}>
            Opponent Time (AI): <b style={{ color: game.turn() !== playerColor ? '#fbbf24' : '#fff' }}>{formatTime(aiTime)}</b>
          </span>
          <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: '#818cf8', fontWeight: 'bold' }}>
            Difficulty: {difficulty}
          </span>
        </div>

        {/* Captured Pieces Black */}
        <div style={{ display: 'flex', minHeight: 24, gap: 4, marginBottom: 4, opacity: 0.8, fontSize: '1.2rem' }}>
          {capturedBlack.map((p, idx) => {
            const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
            return <span key={idx}>{skinMap[`b${p.toUpperCase()}`]}</span>;
          })}
        </div>

        {/* Responsive Chessboard Container */}
        <div style={{ 
          borderRadius: 16, 
          overflow: 'hidden', 
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 50px rgba(99,102,241,0.25)', 
          border: '3px solid rgba(99,102,241,0.35)',
          background: 'rgba(9, 9, 11, 0.9)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%' }}>
            {renderBoard()}
          </div>
        </div>

        {/* Captured Pieces White */}
        <div style={{ display: 'flex', minHeight: 24, gap: 4, marginTop: 4, opacity: 0.8, fontSize: '1.2rem' }}>
          {capturedWhite.map((p, idx) => {
            const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
            return <span key={idx}>{skinMap[`w${p.toUpperCase()}`]}</span>;
          })}
        </div>

        {/* Footer info & Clocks */}
        <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems: 'center', fontSize:'0.9rem', fontWeight:600 }}>
          <span>Your Time: <b style={{ color: game.turn() === playerColor ? '#fbbf24' : '#fff' }}>{formatTime(playerTime)}</b></span>
          <span style={{ color:'#818cf8' }}>Skin: {activePack}</span>
        </div>

        {gameStatus && (
          <div style={{ background:'rgba(168,85,247,0.25)', border:'1px solid rgba(168,85,247,0.4)', borderRadius:8, padding:'10px 16px', textAlign:'center', fontWeight:700, color:'#e9d5ff', marginTop:12 }}>
            {gameStatus}
            <button onClick={() => setPlayerColor(null)} style={{ marginLeft:12, background:'rgba(99,102,241,0.3)', border:'1px solid #6366f1', color:'#a5b4fc', padding:'4px 12px', borderRadius:6, cursor:'pointer', fontSize:'0.82rem' }}>
              Reset Match
            </button>
          </div>
        )}
      </div>

      {/* Side Panel: Move Log — stacks below board on mobile */}
      <div className="glass-panel" style={{ padding: 15, display: 'flex', flexDirection: 'column', maxHeight: 260, overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 10 }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>📋 Move Log</h3>
          <button onClick={() => setPlayerColor(null)} style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#f87171', padding:'4px 12px', borderRadius:8, cursor:'pointer', fontSize:'0.8rem', fontWeight:700 }}>
            🏳️ Resign
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr', gap: '4px 8px', fontSize: '0.82rem', color: '#c7d2fe', overflowY: 'auto' }}>
          {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <span style={{ opacity: 0.5 }}>{i + 1}.</span>
              <span style={{ fontWeight: 600 }}>{moveHistory[i * 2]}</span>
              <span style={{ opacity: 0.75 }}>{moveHistory[i * 2 + 1] || ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
