"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Howl } from 'howler';
import { io } from 'socket.io-client';
import { createMatchLifecycle, getGameOutcome } from '../lib/match-lifecycle.mjs';

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
    // Energetic meme sounds
    move: 'https://www.myinstants.com/media/sounds/vine-boom.mp3',
    capture: 'https://www.myinstants.com/media/sounds/movie_1.mp3', // Bruh
    check: 'https://www.myinstants.com/media/sounds/taco-bell-bong-sfx.mp3',
    gameOver: 'https://www.myinstants.com/media/sounds/spongebob-fail.mp3'
  },
  phonk: {
    // Heavy bass hits
    move: 'https://www.myinstants.com/media/sounds/hitmarker_2.mp3',
    capture: 'https://www.myinstants.com/media/sounds/bass-boost.mp3',
    check: 'https://www.myinstants.com/media/sounds/fbi-open-up-sfx.mp3',
    gameOver: 'https://www.myinstants.com/media/sounds/gta-v-wasted.mp3'
  }
};

const pieceImages = {
  classic: {
    wP: '/skins/classic/wP.svg', wN: '/skins/classic/wN.svg', wB: '/skins/classic/wB.svg', wR: '/skins/classic/wR.svg', wQ: '/skins/classic/wQ.svg', wK: '/skins/classic/wK.svg',
    bP: '/skins/classic/bP.svg', bN: '/skins/classic/bN.svg', bB: '/skins/classic/bB.svg', bR: '/skins/classic/bR.svg', bQ: '/skins/classic/bQ.svg', bK: '/skins/classic/bK.svg'
  },
  crypto: {
    wP: '/skins/crypto/P.png', wN: '/skins/crypto/N.png', wB: '/skins/crypto/B.png', wR: '/skins/crypto/R.png', wQ: '/skins/crypto/Q.png', wK: '/skins/crypto/K.png',
    bP: '/skins/crypto/P.png', bN: '/skins/crypto/N.png', bB: '/skins/crypto/B.png', bR: '/skins/crypto/R.png', bQ: '/skins/crypto/Q.png', bK: '/skins/crypto/K.png'
  },
  sigma: {
    wP: '/skins/sigma/P.png', wN: '/skins/sigma/N.png', wB: '/skins/sigma/B.png', wR: '/skins/sigma/R.png', wQ: '/skins/sigma/Q.png', wK: '/skins/sigma/K.png',
    bP: '/skins/sigma/P.png', bN: '/skins/sigma/N.png', bB: '/skins/sigma/B.png', bR: '/skins/sigma/R.png', bQ: '/skins/sigma/Q.png', bK: '/skins/sigma/K.png'
  }
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

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALUES[piece.type];
        const pstVal = PST[piece.type][piece.color === 'w' ? r : 7 - r][c];
        const totalVal = val + pstVal;
        score += piece.color === 'w' ? totalVal : -totalVal;
      }
    }
  }
  return score;
}

const TIME_CONTROLS = [
  { label: '1+0', name: 'Bullet', seconds: 60 },
  { label: '3+2', name: 'Blitz', seconds: 180, increment: 2 },
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
  const [matchId, setMatchId] = useState(null);
  const [unlimitedTime, setUnlimitedTime] = useState(false);

  // Multiplayer State
  const socketRef = useRef(null);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [onlineOpponent, setOnlineOpponent] = useState('');

  // History & Captured Pieces
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);

  // Game duration tracking
  const lifecycleRef = useRef(null);
  if (lifecycleRef.current === null) lifecycleRef.current = createMatchLifecycle();
  const gameRef = useRef(game);
  const clocksRef = useRef({ player: 600, opponent: 600 });
  const searchingRef = useRef(false);

  useEffect(() => () => lifecycleRef.current.stop(), []);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((text, color = '#6366f1') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Post-game reward notification state
  const [rewardPopup, setRewardPopup] = useState(null);

  // Brainrot Visual Effects state
  const [screenShake, setScreenShake] = useState(false);
  const [visualPopups, setVisualPopups] = useState([]);

  const triggerBrainrotEffects = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    const texts = ["SIGMA!", "SKIBIDI", "COPE", "REKT", "FATALITY", "WIGGLE", "GET GOOD", "SHEESH", "NO SHOT", "SUS"];
    const text = texts[Math.floor(Math.random() * texts.length)];
    const id = Date.now() + Math.random();
    const top = 10 + Math.random() * 60;
    const left = 10 + Math.random() * 60;
    const color = ["#ef4444", "#eab308", "#3b82f6", "#a855f7", "#22c55e"][Math.floor(Math.random() * 5)];

    setVisualPopups(prev => [...prev, { id, text, top: `${top}%`, left: `${left}%`, color }]);
    setTimeout(() => {
      setVisualPopups(prev => prev.filter(p => p.id !== id));
    }, 1200);
  }, []);

  // ── Sounds Ref
  const soundsRef = useRef({});
  useEffect(() => {
    const pack = AUDIO_PACKS[activeAudioPack] || AUDIO_PACKS.classic;
    const s = {};
    for (const [k, url] of Object.entries(pack)) {
      s[k] = new Howl({ src: [url], volume: 0.55, html5: true });
    }
    soundsRef.current = s;
    return () => Object.values(s).forEach(sound => sound.unload());
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

  // Result eligibility is claimed synchronously before any network request.
  const recordGameResult = useCallback(async (res, match) => {
    const storedUser = localStorage.getItem('memechess_user');
    if (!storedUser) return;
    const duration = Math.floor((Date.now() - match.startedAt) / 1000);
    try {
      const response = await fetch('/api/game-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: storedUser, result: res, difficulty: match.difficulty, moveCount: match.moveCount, duration })
      });
      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new CustomEvent('memechess_user_updated'));
        if (!lifecycleRef.current.isCurrent(match.id)) return;
        const msgs = [];
        if (data.coinsGained > 0) msgs.push(`+${data.coinsGained} 🪙 MemeCoins`);
        const eloSign = data.eloChange >= 0 ? '+' : '';
        msgs.push(`${eloSign}${data.eloChange} ELO`);
        if (data.questRewards > 0) msgs.push(`Quest bonus: +${data.questRewards} 🪙`);
        if (data.newAchievements?.length) {
          data.newAchievements.forEach(a => addToast(`🏆 Achievement unlocked: ${a.icon} ${a.title}`, '#fbbf24'));
        }
        setRewardPopup(msgs);
        setTimeout(() => {
          if (lifecycleRef.current.isCurrent(match.id)) setRewardPopup(null);
        }, 6000);
      }
    } catch (e) {
      console.error(e);
    }
  }, [addToast]);

  const finishMatch = useCallback((outcome, status, matchId) => {
    const match = lifecycleRef.current.finish(outcome, matchId);
    if (!match) return false;
    setGameActive(false);
    setAiThinking(false);
    setMoveFrom('');
    setOptionSquares({});
    setGameStatus(status);
    playSound('gameOver');
    if (outcome) recordGameResult(outcome, match);
    return true;
  }, [playSound, recordGameResult]);

  // Keep side effects outside React state updater functions (Strict Mode may replay them).
  useEffect(() => {
    const match = lifecycleRef.current.current;
    if (!gameActive || !match?.seconds) return;
    const timer = setInterval(() => {
      if (!lifecycleRef.current.isActive(match.id)) return;
      const isPlayer = gameRef.current.turn() === match.color;
      const key = isPlayer ? 'player' : 'opponent';
      const remaining = Math.max(0, clocksRef.current[key] - 1);
      clocksRef.current[key] = remaining;
      (isPlayer ? setPlayerTime : setAiTime)(remaining);
      if (remaining === 0) {
        finishMatch(isPlayer ? 'loss' : 'win', isPlayer ? '⌛ Timeout! Opponent wins!' : '🏆 Timeout! You win!', match.id);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameActive, matchId, finishMatch]);

  const applyMove = useCallback((nextGame, move, matchId) => {
    const match = lifecycleRef.current.current;
    if (!lifecycleRef.current.isActive(matchId)) return;
    match.moveCount++;
    gameRef.current = nextGame;
    setGame(nextGame);
    setMoveFrom('');
    setOptionSquares({});
    setMoveHistory(history => [...history, move.san]);
    if (move.captured) {
      (move.color === 'w' ? setCapturedWhite : setCapturedBlack)(pieces => [...pieces, move.captured]);
      triggerBrainrotEffects();
    }
    if (match.increment) {
      const isPlayer = move.color === match.color;
      const key = isPlayer ? 'player' : 'opponent';
      clocksRef.current[key] += match.increment;
      (isPlayer ? setPlayerTime : setAiTime)(clocksRef.current[key]);
    }
    const outcome = getGameOutcome(nextGame, match.color);
    if (outcome) {
      const status = outcome === 'draw' ? '🤝 Draw!' : outcome === 'win' ? '🏆 You win!' : '☠️ Checkmate! You lose.';
      finishMatch(outcome, status, match.id);
    } else {
      setGameStatus(nextGame.isCheck() ? '⚡ Check!' : '');
      playSound(nextGame.isCheck() ? 'check' : move.captured ? 'capture' : 'move');
    }
  }, [finishMatch, playSound, triggerBrainrotEffects]);

  const beginMatch = useCallback((details) => {
    const newGame = new Chess();
    const match = lifecycleRef.current.start({ ...details, startedAt: Date.now() });
    gameRef.current = newGame;
    clocksRef.current = { player: match.seconds, opponent: match.seconds };
    searchingRef.current = false;
    setGame(newGame);
    setPlayerColor(match.color);
    setGameStatus('');
    setMoveFrom('');
    setOptionSquares({});
    setPlayerTime(match.seconds);
    setAiTime(match.seconds);
    setMatchId(match.id);
    setUnlimitedTime(match.seconds === 0);
    setGameActive(true);
    setAiThinking(false);
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setRewardPopup(null);
    setOnlineOpponent(match.opponent || '');
    setIsSearchingMatch(false);
    return newGame;
  }, []);

  // AI Move Engine
  const makeAIMove = useCallback((currentGame) => {
    const match = lifecycleRef.current.current;
    if (!lifecycleRef.current.isActive() || match.room || currentGame.isGameOver()) return;
    const difficulty = match.difficulty;
    setAiThinking(true);

    lifecycleRef.current.defer(() => {
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
        const aiColor = currentGame.turn();
        const isAIWhite = aiColor === 'w';
        let bestMove = null;
        let bestValue = isAIWhite ? -Infinity : Infinity;
        
        const minimax = (gameInstance, depth, alpha, beta, isMaximizing) => {
          if (depth === 0 || gameInstance.isGameOver()) {
            return evaluateBoard(gameInstance.board());
          }
          const instMoves = gameInstance.moves();
          if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < instMoves.length; i++) {
              const cpy = new Chess(gameInstance.fen());
              cpy.move(instMoves[i]);
              const score = minimax(cpy, depth - 1, alpha, beta, false);
              maxEval = Math.max(maxEval, score);
              alpha = Math.max(alpha, score);
              if (beta <= alpha) break; // Beta cutoff
            }
            return maxEval;
          } else {
            let minEval = Infinity;
            for (let i = 0; i < instMoves.length; i++) {
              const cpy = new Chess(gameInstance.fen());
              cpy.move(instMoves[i]);
              const score = minimax(cpy, depth - 1, alpha, beta, true);
              minEval = Math.min(minEval, score);
              beta = Math.min(beta, score);
              if (beta <= alpha) break; // Alpha cutoff
            }
            return minEval;
          }
        };

        // Increase depth from 2 to 3 for harder AI, thanks to alpha-beta pruning speedup
        moves.forEach(m => {
          const cpy = new Chess(currentGame.fen());
          cpy.move(m.san);
          const score = minimax(cpy, 2, -Infinity, Infinity, !isAIWhite);
          if (isAIWhite) {
            if (score > bestValue) {
              bestValue = score;
              bestMove = m;
            }
          } else {
            if (score < bestValue) {
              bestValue = score;
              bestMove = m;
            }
          }
        });

        selectedMove = bestMove || moves[Math.floor(Math.random() * moves.length)];
      }

      const gameCopy = new Chess(currentGame.fen());
      try {
        const result = gameCopy.move(selectedMove);
        applyMove(gameCopy, result, match.id);
      } catch (e) {
        console.error("AI execution error:", e);
      }
      setAiThinking(false);
    }, 600, match.id);
  }, [applyMove]);

  // Starting locally cancels queue membership before a late match can arrive.
  const startGame = useCallback((color) => {
    const socket = socketRef.current;
    searchingRef.current = false;
    socket?.emit('cancel_match');
    socket?.emit('leave_match');
    const newGame = beginMatch({ color, difficulty, seconds: timeControl.seconds, increment: timeControl.increment || 0 });
    if (color === 'b') makeAIMove(newGame);
  }, [beginMatch, difficulty, makeAIMove, timeControl]);

  const leaveGame = useCallback(() => {
    const socket = socketRef.current;
    const match = lifecycleRef.current.current;
    if (match?.active && !match.room) finishMatch('loss', 'You resigned.', match.id);
    socket?.emit('cancel_match');
    socket?.emit('leave_match', match?.room ? { room: match.room } : undefined);
    searchingRef.current = false;
    lifecycleRef.current.stop();
    setGameActive(false);
    setAiThinking(false);
    setPlayerColor(null);
    setMoveFrom('');
    setOptionSquares({});
    setOnlineOpponent('');
    setIsSearchingMatch(false);
    setRewardPopup(null);
    setGameStatus('');
  }, [finishMatch]);

  useEffect(() => {
    const s = io();
    socketRef.current = s;
    s.on('match_found', (data) => {
      if (!searchingRef.current) {
        s.emit('leave_match', { room: data.roomId });
        return;
      }
      // Both clients use the same clock until the server negotiates time controls.
      beginMatch({ color: data.color, room: data.roomId, opponent: data.opponent, seconds: 600, increment: 0, difficulty: 'beginner' });
      setGameStatus(`⚔️ Match found vs ${data.opponent}! You are ${data.color === 'w' ? 'White' : 'Black'}.`);
      playSound('move');
    });
    s.on('move', (data) => {
      const match = lifecycleRef.current.current;
      if (!lifecycleRef.current.isActive() || !match.room || data?.room !== match.room || gameRef.current.turn() === match.color) return;
      const gameCopy = new Chess(gameRef.current.fen());
      try {
        const move = gameCopy.move(data.move);
        applyMove(gameCopy, move, match.id);
      } catch (error) {
        console.error('Invalid opponent move:', error);
      }
    });
    s.on('opponent_left', (data) => {
      const match = lifecycleRef.current.current;
      if (match?.room === data?.roomId) finishMatch(null, 'Opponent left the match.', match.id);
    });
    s.on('disconnect', () => {
      searchingRef.current = false;
      setIsSearchingMatch(false);
      const match = lifecycleRef.current.current;
      if (match?.room) finishMatch(null, 'Connection lost. Start a new match to reconnect.', match.id);
    });
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [applyMove, beginMatch, finishMatch, playSound]);

  const findOnlineMatch = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || searchingRef.current) return;
    lifecycleRef.current.stop();
    setGameActive(false);
    setAiThinking(false);
    searchingRef.current = true;
    setIsSearchingMatch(true);
    setGameStatus('🔍 Searching for an opponent...');
    socket.emit('find_match', username || 'Anonymous');
  }, [username]);

  const executeMove = useCallback((from, to) => {
    const socket = socketRef.current;
    const match = lifecycleRef.current.current;
    const currentGame = gameRef.current;
    if (!lifecycleRef.current.isActive() || aiThinking || currentGame.isGameOver() || currentGame.turn() !== match.color) return false;
    const gameCopy = new Chess(currentGame.fen());
    try {
      const result = gameCopy.move({ from, to, promotion: 'q' });
      if (!result) return false;
      if (match.room && socket) socket.emit('move', { room: match.room, move: result.san });
      applyMove(gameCopy, result, match.id);
      if (!match.room && lifecycleRef.current.isActive(match.id)) makeAIMove(gameCopy);
      return true;
    } catch (e) {
      console.error('User Move Error:', e);
      return false;
    }
  }, [aiThinking, applyMove, makeAIMove]);

  // Click-to-move handler
  const handleSquareClick = (squareName) => {
    if (!lifecycleRef.current.isActive() || !playerColor || aiThinking || game.isGameOver()) return;
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
    if (unlimitedTime) return '∞';
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

        // Unicode fallback symbols
        const UNICODE_PIECES = {
          wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
          bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚'
        };

        let pieceDisplay = null;
        if (piece) {
          const key = `${piece.color}${piece.type.toUpperCase()}`;
          const isWhitePiece = piece.color === 'w';
          const safePack = pieceImages[activePack] ? activePack : 'classic';
          const src = pieceImages[safePack][key];
          const isImgSkin = safePack !== 'classic';
          
          let pieceStyle = { width: '85%', height: '85%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' };
          
          if (isImgSkin) {
            if (!isWhitePiece) {
              pieceStyle.filter = 'invert(1) hue-rotate(180deg) brightness(0.9) drop-shadow(2px 3px 0px rgba(0,0,0,0.4))';
            } else {
              pieceStyle.filter = 'drop-shadow(2px 3px 0px rgba(0,0,0,0.4))';
            }
          } else {
            pieceStyle.filter = 'drop-shadow(2px 3px 0px rgba(0,0,0,0.4))';
          }

          pieceDisplay = (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <img
                src={src}
                alt={key}
                style={pieceStyle}
                draggable={false}
                onError={(e) => {
                  // If image fails to load, show unicode piece as fallback
                  e.target.style.display = 'none';
                  const span = document.createElement('span');
                  span.textContent = UNICODE_PIECES[key] || '?';
                  span.style.cssText = 'font-size:clamp(1.5rem,8vw,2.4rem);line-height:1;user-select:none;filter:drop-shadow(2px 2px 0 rgba(0,0,0,0.5))';
                  e.target.parentNode.appendChild(span);
                }}
              />
            </div>
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
                left: 5,
                fontSize: '0.75rem',
                fontWeight: '900',
                color: isDark ? '#ffffff' : '#2c3e2c',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1
              }}>
                {rank}
              </span>
            )}
            {showFileLabel && (
              <span style={{
                position: 'absolute',
                bottom: 3,
                right: 5,
                fontSize: '0.75rem',
                fontWeight: '900',
                color: isDark ? '#ffffff' : '#2c3e2c',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1
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
          
          <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap: 'wrap' }}>
            <button onClick={() => startGame('w')} className="btn-primary" style={{ padding:'0.8rem 1.5rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem' }}>
              <span style={{ fontSize:'1.5rem' }}>♙</span> Play White (AI)
            </button>
            <button onClick={() => startGame('b')} className="btn-secondary" style={{ padding:'0.8rem 1.5rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem' }}>
              <span style={{ fontSize:'1.5rem' }}>♟</span> Play Black (AI)
            </button>
            <button onClick={findOnlineMatch} disabled={isSearchingMatch} className="btn-primary" style={{ padding:'0.8rem 1.5rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem', background: isSearchingMatch ? '#94a3b8' : 'var(--accent-purple)' }}>
              <span style={{ fontSize:'1.5rem' }}>🌍</span> {isSearchingMatch ? 'Searching...' : 'Play Online'}
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
              Opponent: <b style={{ color: game.turn() !== playerColor ? 'var(--accent-primary)' : 'var(--foreground)' }}>
                {onlineOpponent ? `${onlineOpponent} (Online)` : `AI (${formatTime(aiTime)})`}
              </b>
            </span>
            <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--accent-secondary)', fontWeight: '800' }}>
              {onlineOpponent ? 'Ranked Match' : `Difficulty: ${difficulty}`}
            </span>
          </div>

          {/* Captured Pieces Black */}
          <div style={{ display: 'flex', minHeight: 24, gap: 4, opacity: 0.9, fontSize: '1.25rem', paddingLeft: 6 }}>
            {capturedBlack.map((p, idx) => {
              const src = pieceImages[activePack][`b${p.toUpperCase()}`];
              const isImg = activePack !== 'classic';
              return (
                <span key={idx} style={{ display: 'inline-block', width: 24, height: 24 }}>
                  <img src={src} alt="captured" style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: isImg ? 'invert(1) hue-rotate(180deg) brightness(0.9) drop-shadow(1px 1px 0px rgba(0,0,0,0.5))' : 'none'
                  }} />
                </span>
              );
            })}
          </div>

          {/* Responsive Chessboard Container */}
          <div className={`neo-panel ${screenShake ? 'shake-animation' : ''}`} style={{ 
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-dark)', position: 'relative' }}>
              {renderBoard()}
              
              {/* Visual Popups rendering */}
              {visualPopups.map(p => (
                <div key={p.id} className="floating-popup" style={{
                  position: 'absolute',
                  top: p.top,
                  left: p.left,
                  color: p.color,
                  textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 4px 4px 0 #000',
                  fontWeight: 900,
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  pointerEvents: 'none',
                  zIndex: 50,
                  transform: 'translate(-50%, -50%) rotate(-10deg)',
                }}>
                  {p.text}
                </div>
              ))}
            </div>
          </div>

          {/* Captured Pieces White */}
          <div style={{ display: 'flex', minHeight: 24, gap: 4, opacity: 0.9, fontSize: '1.25rem', paddingLeft: 6 }}>
            {capturedWhite.map((p, idx) => {
              const src = pieceImages[activePack][`w${p.toUpperCase()}`];
              const isImg = activePack !== 'classic';
              return (
                <span key={idx} style={{ display: 'inline-block', width: 24, height: 24 }}>
                  <img src={src} alt="captured" style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: isImg ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.5))' : 'none'
                  }} />
                </span>
              );
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
              <button onClick={leaveGame} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}>
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
              <button onClick={leaveGame} style={{ background: '#fee2e2', border: '2px solid var(--border-dark)', color: '#b91c1c', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, boxShadow: '2px 2px 0px 0px var(--border-dark)', transition: 'all 0.1s' }} onMouseEnter={e=>e.target.style.transform='translate(-1px,-1px)'} onMouseLeave={e=>e.target.style.transform='none'}>
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

      {/* Embedded CSS for animations */}
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .shake-animation {
          animation: shake 0.3s;
          animation-iteration-count: 1;
        }
        @keyframes floatUpFade {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(-10deg); }
          20% { opacity: 1; transform: translate(-50%, -60%) scale(1.2) rotate(-5deg); }
          80% { opacity: 1; transform: translate(-50%, -90%) scale(1) rotate(5deg); }
          100% { opacity: 0; transform: translate(-50%, -100%) scale(0.8) rotate(10deg); }
        }
        .floating-popup {
          animation: floatUpFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>

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
