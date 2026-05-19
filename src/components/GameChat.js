"use client";

import { useState, useRef, useEffect } from 'react';

const MEME_PHRASES = [
  { text: "gg ez", emoji: "😎" },
  { text: "lol", emoji: "💀" },
  { text: "nice move", emoji: "👏" },
  { text: "no way 💀", emoji: "😱" },
  { text: "skill issue", emoji: "🗿" },
  { text: "yikes", emoji: "😬" },
  { text: "fr fr", emoji: "🔥" },
  { text: "mid", emoji: "😐" },
  { text: "W move", emoji: "📈" },
  { text: "L move", emoji: "📉" },
  { text: "nah bro 😭", emoji: "😭" },
  { text: "you're cooked", emoji: "👨‍🍳" },
];

export default function GameChat({ username }) {
  const [messages, setMessages] = useState([
    { id: 'sys1', sender: '🤖 AI', text: 'Welcome to MemeChess! Chat here.', ts: Date.now(), isAI: true }
  ]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  const getAIResponse = (playerText) => {
    const lower = playerText.toLowerCase();
    if (lower.includes('gg') || lower.includes('ez')) {
      return [
        "bro saying gg ez with that low elo? 💀",
        "gg indeed, go next 🗿",
        "who said it was ez? look at the timer",
        "bro thinks he won already 😭"
      ][Math.floor(Math.random() * 4)];
    }
    if (lower.includes('skill') || lower.includes('issue')) {
      return [
        "bold words for someone in checkmate range 💀",
        "ratio + skill issue + L 🗿",
        "your chess lines are mid fr fr",
        "my depth-2 minimax says otherwise 🤖"
      ][Math.floor(Math.random() * 4)];
    }
    if (lower.includes('nice') || lower.includes('move') || lower.includes('w move')) {
      return [
        "obviously a W move, I calculate all timelines 📈",
        "respect, but my next move is pure dev aura",
        "calculated 🗿",
        "bro noticed my absolute genius 🍷"
      ][Math.floor(Math.random() * 4)];
    }
    if (lower.includes('nah') || lower.includes('yikes') || lower.includes('l move')) {
      return [
        "major cope detected 🤣",
        "ur cooked, accept it 👨‍🍳",
        "pure brainrot behavior 💀",
        "just resign, save your ELO"
      ][Math.floor(Math.random() * 4)];
    }
    // Default fallback responses
    return [
      "pure skill issue 🗿",
      "L + ratio 💀",
      "your next move is already computed 🤖",
      "no shot you win this",
      "bro is coping so hard right now",
      "are we playing chess or drafts? 😭",
      "W aura on my side, L aura on yours 🍷"
    ][Math.floor(Math.random() * 7)];
  };

  const sendPhrase = (phrase) => {
    const newMsg = { id: Date.now(), sender: username || 'You', text: phrase.text, ts: Date.now(), isAI: false };
    setMessages(prev => [...prev, newMsg]);

    // AI reply after a short delay
    setTimeout(() => {
      const reply = getAIResponse(phrase.text);
      const aiMsg = { id: Date.now() + 1, sender: '🤖 AI', text: reply, ts: Date.now(), isAI: true };
      setMessages(prev => [...prev, aiMsg]);
      if (!open) setUnread(u => u + 1);
    }, 700 + Math.random() * 1000);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: open ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.4)',
          color: '#a5b4fc', borderRadius: 8, padding: '6px 12px',
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
          transition: 'all 0.2s', position: 'relative'
        }}
      >
        💬 Chat
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread}
          </span>
        )}
      </button>

      {/* Chat Drawer */}
      {open && (
        <div style={{
          position: 'absolute', top: '120%', right: 0,
          width: 300, background: '#0f0f13',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          zIndex: 200,
          animation: 'fadeSlideUp 0.2s ease',
        }}>
          <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

          {/* Header */}
          <div style={{ background: 'rgba(99,102,241,0.15)', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a5b4fc' }}>💬 In-Game Chat</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ height: 180, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: msg.isAI ? 'row' : 'row-reverse', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div style={{
                  maxWidth: '80%',
                  background: msg.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.2)',
                  border: `1px solid ${msg.isAI ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.3)'}`,
                  borderRadius: msg.isAI ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                  padding: '6px 10px',
                }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: msg.isAI ? '#a5b4fc' : '#d8b4fe', fontWeight: 600 }}>{msg.sender}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#e0e7ff' }}>{msg.text}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', opacity: 0.4 }}>{formatTime(msg.ts)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Meme phrase buttons */}
          <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {MEME_PHRASES.map(p => (
              <button
                key={p.text}
                onClick={() => sendPhrase(p)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '4px 8px',
                  color: '#c7d2fe', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(99,102,241,0.2)'}
                onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
              >
                {p.emoji} {p.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
