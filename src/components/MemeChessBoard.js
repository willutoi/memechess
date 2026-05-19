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

const TIME_CONTROLS = [
  { label: '1+0', name: 'Bullet', seconds: 60 },
  { label: '3+2', name: 'Blitz', seconds: 180 },
  { label: '10+0', name: 'Rapid', seconds: 600 },
  { label: '∞', name: 'Classical', seconds: 0 },
];

export default function MemeChessBoard({ activePack = 'classic', activeAudioPack = 'classic', username = '' }) {
  const [playerColor, setPlayerColor] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  const [timeControl, setTimeControl] = useState(TIME_CONTROLS[2]); // Rapid default
  
  const [game, setGame] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiPhrase, setAiPhrase] = useState(AI_PHRASES[0]);

  // Click-to-move state
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Chess clocks
  const [playerTime, setPlayerTime] = useState(600);
  const [aiTime, setAiTime] = useState(600);
  const [gameActive, setGameActive] = useState(false);

  // History & Captured Pieces
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);

  // Game duration tracking
  const gameStartTimeRef = useRef(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((text, color = '#6366f1') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Post-game reward notification state
  const [rewardPopup, setRewardPopup] = useState(null);

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
  const recordGameResult = async (res, finalMoveCount) => {
    const storedUser = localStorage.getItem('memechess_user');
    if (!storedUser) return;
    const duration = gameStartTimeRef.current ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000) : 0;
    try {
      const response = await fetch('/api/game-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: storedUser, result: res, difficulty, moveCount: finalMoveCount || 0, duration })
      });
      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new CustomEvent('memechess_user_updated'));
        // Show reward popup
        const msgs = [];
        if (data.coinsGained > 0) msgs.push(`+${data.coinsGained} 🪙 MemeCoins`);
        const eloSign = data.eloChange >= 0 ? '+' : '';
        msgs.push(`${eloSign}${data.eloChange} ELO`);
        if (data.questRewards > 0) msgs.push(`Quest bonus: +${data.questRewards} 🪙`);
        if (data.newAchievements?.length) {
          data.newAchievements.forEach(a => addToast(`🏆 Achievement unlocked: ${a.icon} ${a.title}`, '#fbbf24'));
        }
        setRewardPopup(msgs);
        setTimeout(() => setRewardPopup(null), 6000);
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
    const startSecs = timeControl.seconds || 0;
    setGame(newGame);
    setPlayerColor(color);
    setGameStatus('');
    setMoveFrom('');
    setOptionSquares({});
    setPlayerTime(startSecs || 99999);
    setAiTime(startSecs || 99999);
    setGameActive(true);
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setRewardPopup(null);
    gameStartTimeRef.current = Date.now();

    if (color === 'b') {
      makeAIMove(newGame);
    } else {
      setAiThinking(false);
    }
  }, [makeAIMove, timeControl]);

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
          ? '#B8C4A8'
          : '#FAF8F5';

        if (isSelected) {
          bgStyle = '#f59e0b';
        }

        let pieceDisplay = null;
        if (piece) {
          const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
          const key = `${piece.color}${piece.type.toUpperCase()}`;
          const isWhitePiece = piece.color === 'w';

          // Apply thick pixel art black outlines & solid offset shadow to look EXACTLY like high-end retro assets
          pieceDisplay = (
            <span style={{ 
              fontSize: 'clamp(1.5rem, 8.5vw, 2.5rem)',
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
        <div className="neo-panel" style={{ padding:'2.5rem 2rem', position: 'relative' }}>
          {/* Stickers */}
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', left: '-20px', transform: 'rotate(-8deg)' }}>⚔️ ARE YOU READY?</div>
          <div className="neo-sticker sticker-cyan" style={{ bottom: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>🗿 CHOOSE YOUR FATE</div>

          <div style={{ fontSize:'3.5rem', marginBottom:'0.5rem' }}>👑</div>
          <h2 className="text-gradient" style={{ fontSize:'2rem', fontWeight:800, marginBottom:'1rem' }}>MemeChess Arena</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color:'var(--accent-primary)', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:800, letterSpacing: '0.05em' }}>⏱️ TIME CONTROL</p>
            <div style={{ display:'flex', gap:'0.8rem', justifyContent:'center', flexWrap:'wrap' }}>
              {TIME_CONTROLS.map(tc => {
                const isActive = timeControl.name === tc.name;
                return (
                  <button
                    key={tc.name}
                    onClick={() => setTimeControl(tc)}
                    style={{
                      padding: '8px 14px', borderRadius: 10,
                      border: '2px solid var(--border-dark)',
                      background: isActive ? 'var(--accent-primary)' : '#ffffff',
                      color: isActive ? '#ffffff' : 'var(--foreground)',
                      boxShadow: isActive ? '1px 1px 0px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                      transform: isActive ? 'translate(2px, 2px)' : 'none',
                      cursor: 'pointer', fontWeight: 700, transition: 'all 0.1s', fontSize: '0.85rem'
                    }}
                  >
                    <div>{tc.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{tc.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color:'var(--accent-secondary)', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:800, letterSpacing: '0.05em' }}>🤖 AI DIFFICULTY</p>
            <div style={{ display:'flex', gap:'0.8rem', justifyContent:'center' }}>
              {['beginner', 'intermediate', 'hard'].map(level => {
                const isActive = difficulty === level;
                return (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    style={{
                      padding: '8px 16px', borderRadius: 10,
                      border: '2px solid var(--border-dark)',
                      background: isActive ? 'var(--accent-secondary)' : '#ffffff',
                      color: isActive ? '#ffffff' : 'var(--foreground)',
                      boxShadow: isActive ? '1px 1px 0px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                      transform: isActive ? 'translate(2px, 2px)' : 'none',
                      cursor: 'pointer', fontWeight: 800, textTransform: 'capitalize', transition: 'all 0.1s'
                    }}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <p style={{ color:'var(--foreground)', opacity: 0.8, marginBottom:'2rem', fontSize:'0.95rem', fontWeight: 600 }}>Pick your side and start accumulating ELO & Coins fr fr!</p>
          
          <div style={{ display:'flex', gap:'1.5rem', justifyContent:'center' }}>
            <button onClick={() => startGame('w')} className="btn-primary" style={{ padding:'1rem 2rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem' }}>
              <span style={{ fontSize:'2rem' }}>♙</span> Play White
            </button>
            <button onClick={() => startGame('b')} className="btn-secondary" style={{ padding:'1rem 2rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem' }}>
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
    <div className="board-layout-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="board-grid-wrapper">
        
        {/* Left Column: Board and Clocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Board Status / Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '2px solid var(--border-dark)', padding: '10px 14px', borderRadius: 12, boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: '800' }}>
              Opponent (AI): <b style={{ color: game.turn() !== playerColor ? 'var(--accent-primary)' : 'var(--foreground)' }}>{formatTime(aiTime)}</b>
            </span>
            <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--accent-secondary)', fontWeight: '800' }}>
              Difficulty: {difficulty}
            </span>
          </div>

          {/* Captured Pieces Black */}
          <div style={{ display: 'flex', minHeight: 24, gap: 4, opacity: 0.9, fontSize: '1.25rem', paddingLeft: 6 }}>
            {capturedBlack.map((p, idx) => {
              const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
              return <span key={idx} style={{ filter: 'drop-shadow(1px 1px 0px #000)' }}>{skinMap[`b${p.toUpperCase()}`]}</span>;
            })}
          </div>

          {/* Responsive Chessboard Container */}
          <div className="neo-panel" style={{ 
            overflow: 'visible', 
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            position: 'relative',
            padding: 4
          }}>
            {/* Playful Stickers overlapping the board */}
            <div className="neo-sticker sticker-pink" style={{ top: '-12px', left: '-15px', transform: 'rotate(-8deg)', fontSize: '0.65rem' }}>✨ 200 IQ MOVE</div>
            <div className="neo-sticker sticker-yellow" style={{ bottom: '-10px', right: '-15px', transform: 'rotate(6deg)', fontSize: '0.65rem' }}>🧠 BIG BRAIN ONLY</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-dark)' }}>
              {renderBoard()}
            </div>
          </div>

          {/* Captured Pieces White */}
          <div style={{ display: 'flex', minHeight: 24, gap: 4, opacity: 0.9, fontSize: '1.25rem', paddingLeft: 6 }}>
            {capturedWhite.map((p, idx) => {
              const skinMap = EMOJI_SKINS[activePack] || EMOJI_SKINS.classic;
              return <span key={idx} style={{ filter: 'drop-shadow(1px 1px 0px #000)' }}>{skinMap[`w${p.toUpperCase()}`]}</span>;
            })}
          </div>

          {/* Footer info & Clocks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 800, background: '#ffffff', border: '2px solid var(--border-dark)', padding: '10px 14px', borderRadius: 12, boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
            <span>Your Time: <b style={{ color: game.turn() === playerColor ? 'var(--accent-primary)' : 'var(--foreground)' }}>{formatTime(playerTime)}</b></span>
            <span style={{ color: 'var(--accent-secondary)' }}>Skin: {activePack}</span>
          </div>

          {gameStatus && (
            <div style={{ background: 'rgba(124,58,237,0.05)', border: '2px solid var(--border-dark)', borderRadius: 12, padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
              <span>{gameStatus}</span>
              <button onClick={() => setPlayerColor(null)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}>
                Reset Match
              </button>
            </div>
          )}
        </div>

        {/* Right Column: AI speech bubble and Move Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AI Speech Bubble */}
          <div style={{ background: '#ffffff', border: '2px solid var(--border-dark)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
            <span style={{ fontSize: '1.8rem' }}>🤖</span>
            <p style={{ margin: 0, fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 700, color: 'var(--foreground)' }}>{aiPhrase}</p>
          </div>

          {/* Side Panel: Move Log */}
          <div className="neo-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 220, maxHeight: 360, overflowY: 'auto', boxSizing: 'border-box', background: '#ffffff', position: 'relative' }}>
            {/* Sticker */}
            <div className="neo-sticker sticker-purple" style={{ top: '-10px', right: '-12px', transform: 'rotate(-4deg)', fontSize: '0.62rem' }}>📜 HISTORY</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-dark)', paddingBottom: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Move Log</h3>
              <button onClick={() => setPlayerColor(null)} style={{ background: '#fee2e2', border: '2px solid var(--border-dark)', color: '#b91c1c', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, boxShadow: '2px 2px 0px 0px var(--border-dark)', transition: 'all 0.1s' }} onMouseEnter={e=>e.target.style.transform='translate(-1px,-1px)'} onMouseLeave={e=>e.target.style.transform='none'}>
                🏳️ Resign
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr', gap: '6px 8px', fontSize: '0.88rem', color: 'var(--foreground)', overflowY: 'auto', fontWeight: 700 }}>
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <span style={{ opacity: 0.5 }}>{i + 1}.</span>
                  <span>{moveHistory[i * 2]}</span>
                  <span style={{ opacity: 0.8 }}>{moveHistory[i * 2 + 1] || ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 999, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#ffffff', border: `2px solid var(--border-dark)`, borderRadius: 10, padding: '10px 16px', color: 'var(--foreground)', fontWeight: 800, fontSize: '0.9rem', boxShadow: `4px 4px 0px 0px var(--border-dark)`, animation: 'fadeSlideIn 0.3s ease', maxWidth: 280 }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Reward Popup after game ends */}
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
            <div className="neo-sticker sticker-pink" style={{ top: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>📈 GG WP!</div>
            <div className="neo-sticker sticker-green" style={{ bottom: '-15px', left: '-15px', transform: 'rotate(-6deg)' }}>✨ BIG AURA</div>

            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>🎉</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>Match Completed</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.92rem', opacity: 0.8, fontWeight: 600 }}>Here are your rewards for finishing the battle:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
              {rewardPopup.map((msg, i) => {
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
            <button className="btn-primary" onClick={() => setRewardPopup(null)} style={{ width: '100%', padding: '12px 24px', fontSize: '1.05rem' }}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
