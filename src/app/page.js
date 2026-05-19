"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Store, Trophy, LogIn, Shield, UserPlus, LogOut, Star, CheckCircle, Clock, Zap } from 'lucide-react';

const AVATARS = ['🧠','👑','🗿','💀','🤡','🎯','⚡','🔥','💎','🚀','🐉','🦁','🤖','👾','🎭'];

export default function Home() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [quests, setQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) {
      fetchUser(storedUser);
    } else {
      setIsLoading(false);
    }

    const handleUpdate = () => {
      const u = localStorage.getItem('memechess_user');
      if (u) fetchUser(u);
    };
    window.addEventListener('memechess_user_updated', handleUpdate);
    return () => window.removeEventListener('memechess_user_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (user) {
      loadAndSeedQuests(user.username);
    }
  }, [user?.username]);

  const fetchUser = async (username) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('memechess_user');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAndSeedQuests = async (username) => {
    setQuestsLoading(true);
    try {
      // Seed daily quests (idempotent)
      await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      // Fetch quests
      const res = await fetch(`/api/quests?username=${username}`);
      if (res.ok) setQuests(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setQuestsLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput, action: authMode })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Something went wrong');
        return;
      }
      localStorage.setItem('memechess_user', data.username);
      setUser(data);
      setPasswordInput('');
    } catch (e) {
      setAuthError('Network error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('memechess_user');
    setUser(null);
    setQuests([]);
  };

  const handleAvatarSelect = async (avatar) => {
    setShowAvatarPicker(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, avatar })
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
      }
    } catch (e) { console.error(e); }
  };

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>♟️</div>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 800, fontFamily: 'Space Grotesk' }}>LOADING MEMECHESS...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // ── Auth Screen ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="neo-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '420px', width: '100%', position: 'relative' }}>
          {/* Stickers */}
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', left: '-20px', transform: 'rotate(-8deg)' }}>✨ NO CAP</div>
          <div className="neo-sticker sticker-yellow" style={{ bottom: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>💀 CHESS IS LIFE</div>

          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>♟️</div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.3rem', fontWeight: '800' }}>MemeChess</h1>
          <p style={{ opacity: 0.6, marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 600 }}>The ultimate brainrot chess experience</p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.04)', border: '2px solid var(--border-dark)', borderRadius: 12, padding: 4, marginBottom: '1.5rem', gap: 4 }}>
            {['login','register'].map(mode => (
              <button
                key={mode}
                onClick={() => { setAuthMode(mode); setAuthError(''); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: authMode === mode ? '2px solid var(--border-dark)' : 'none',
                  background: authMode === mode ? 'var(--accent-primary)' : 'transparent',
                  color: authMode === mode ? '#fff' : 'var(--foreground)',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.15s',
                  textTransform: 'capitalize'
                }}
              >
                {mode === 'login' ? '🔑 Login' : '✨ Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <input
              type="text"
              placeholder="Username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              minLength={2}
              maxLength={24}
            />
            <input
              type="password"
              placeholder={authMode === 'register' ? 'Create a password' : 'Password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              minLength={3}
            />
            {authError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid var(--border-dark)', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>
                ⚠️ {authError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={authLoading} style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '0.5rem' }}>
              {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              {authLoading ? 'Entering...' : authMode === 'login' ? 'Enter the Arena' : 'Create Account'}
            </button>
          </form>

          {authMode === 'login' && (
            <p style={{ marginTop: '1.2rem', fontSize: '0.78rem', opacity: 0.6, fontWeight: 500 }}>
              Legacy accounts without password: just enter your username + any password to claim it.
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── Main Dashboard ───────────────────────────────────────────────────
  const dailyQuests = quests.filter(q => q.quest.type === 'daily');
  const completedCount = dailyQuests.filter(q => q.completed).length;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              title="Change avatar"
              style={{ background: 'rgba(79,70,229,0.08)', border: '3px solid var(--border-dark)', borderRadius: '50%', width: 52, height: 52, fontSize: '1.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '2px 2px 0px 0px var(--border-dark)' }}
            >
              {user.avatar || '🧠'}
            </button>
            {showAvatarPicker && (
              <div style={{ position: 'absolute', top: 60, left: 0, background: '#ffffff', border: '3px solid var(--border-dark)', borderRadius: 12, padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, zIndex: 100, boxShadow: '4px 4px 0px 0px var(--border-dark)' }}>
                {AVATARS.map(av => (
                  <button key={av} onClick={() => handleAvatarSelect(av)} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'background 0.15s' }} onMouseEnter={e => e.target.style.background='rgba(0,0,0,0.05)'} onMouseLeave={e => e.target.style.background='none'}>
                    {av}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{user.username}</p>
            <p style={{ fontSize: '0.82rem', opacity: 0.7, margin: 0, fontWeight: 700 }}>{user.elo} ELO · {user.wins}W {user.losses}L</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href={`/profile/${user.username}`}>
            <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              👤 Profile
            </button>
          </Link>
          <button onClick={handleLogout} style={{ background: '#fecaca', border: '3px solid var(--border-dark)', color: '#b91c1c', padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '2px 2px 0px 0px var(--border-dark)', transition: 'all 0.1s' }} onMouseEnter={e=>e.target.style.transform='translate(-1px,-1px)'} onMouseLeave={e=>e.target.style.transform='none'}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="neo-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 680, width: '100%', position: 'relative' }}>
        {/* Stickers */}
        <div className="neo-sticker sticker-cyan" style={{ top: '-18px', right: '-20px', transform: 'rotate(6deg)' }}>📈 STONKS ONLY GO UP</div>
        <div className="neo-sticker sticker-purple" style={{ bottom: '-20px', left: '-20px', transform: 'rotate(-6deg)' }}>🗿 GIGACHAD</div>

        <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '0.5rem', fontWeight: '900' }}>
          MemeChess
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.8, fontWeight: 700 }}>
          Win games, earn MemeCoins, collect viral skins! 🔥
        </p>

        {/* Stats Bar */}
        <div className="stats-grid-container">
          {[
            { label: 'MemeCoins', value: `🪙 ${user.meme_coins.toLocaleString()}`, color: '#b45309', bg: 'rgba(217,119,6,0.05)' },
            { label: 'ELO Rating', value: `👑 ${user.elo}`, color: '#4f46e5', bg: 'rgba(79,70,229,0.05)' },
            { label: 'Record', value: `✅ ${user.wins}W – ❌ ${user.losses}L`, color: '#334155', bg: 'rgba(15,23,42,0.04)' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, border: '2px solid var(--border-dark)', borderRadius: 12, padding: '10px 18px', boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
              <p style={{ fontSize: '0.72rem', opacity: 0.6, margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: 'var(--foreground)' }}>{stat.label}</p>
              <p style={{ fontWeight: 900, fontSize: '1.15rem', color: stat.color, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <Link href="/play" style={{ width: '100%' }}>
            <button className="btn-primary" style={{ width: '100%', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '16px' }}>
              <Play size={24} /> Play Now
            </button>
          </Link>
          <Link href="/battlepass" style={{ width: '100%' }}>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '14px', background: 'rgba(124,58,237,0.05)', color: '#7c3aed', border: '3px solid var(--border-dark)' }}>
              ⚡ Season 1: Aura Pass
            </button>
          </Link>
          <div className="menu-action-row">
            <Link href="/puzzles" style={{ flex: 1 }}>
              <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(217,119,6,0.05)', color: '#b45309' }}>
                🧠 Puzzles
              </button>
            </Link>
            <Link href="/shop" style={{ flex: 1 }}>
              <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Store size={20} /> Shop
              </button>
            </Link>
            <Link href="/leaderboard" style={{ flex: 1 }}>
              <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Trophy size={20} /> Leaderboard
              </button>
            </Link>
          </div>

          {user.username.toLowerCase() === 'admin' && (
            <Link href="/admin" style={{ width: '100%' }}>
              <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '10px', background: 'rgba(220,38,38,0.05)', color: '#dc2626' }}>
                <Shield size={18} /> Admin Panel
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Daily Quests Panel */}
      <div className="neo-panel" style={{ padding: '1.8rem', maxWidth: 680, width: '100%', position: 'relative' }}>
        {/* Sticker */}
        <div className="neo-sticker sticker-green" style={{ top: '-15px', left: '15px', transform: 'rotate(-3deg)' }}>⚡ AURA +999</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="#b45309" /> Daily Quests
          </h2>
          <span style={{ fontSize: '0.8rem', background: completedCount === dailyQuests.length && dailyQuests.length > 0 ? '#d1fae5' : '#e2e8f0', border: '2px solid var(--border-dark)', borderRadius: 8, padding: '4px 10px', color: completedCount === dailyQuests.length && dailyQuests.length > 0 ? '#065f46' : 'var(--foreground)', fontWeight: 800, boxShadow: '2px 2px 0px 0px var(--border-dark)' }}>
            {completedCount}/{dailyQuests.length} DONE
          </span>
        </div>

        {questsLoading ? (
          <p style={{ opacity: 0.5, fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>Loading quests...</p>
        ) : dailyQuests.length === 0 ? (
          <p style={{ opacity: 0.5, fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>No quests available</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {dailyQuests.map(uq => {
              const pct = Math.min(100, (uq.progress / uq.quest.target) * 100);
              return (
                <div key={uq.id} style={{ background: uq.completed ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.01)', border: '2px solid var(--border-dark)', borderRadius: 12, padding: '12px 16px', boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {uq.completed ? <CheckCircle size={18} color="#059669" /> : <Clock size={18} color="var(--accent-secondary)" />}
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: uq.completed ? '#059669' : 'var(--foreground)' }}>{uq.quest.title}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b45309' }}>+{uq.quest.reward} 🪙</span>
                  </div>
                  <p style={{ margin: '0 0 8px 26px', fontSize: '0.82rem', opacity: 0.7, textAlign: 'left', fontWeight: 500 }}>{uq.quest.description}</p>
                  {/* Progress bar */}
                  <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', marginLeft: 26, border: '1px solid var(--border-dark)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: uq.completed ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,var(--accent-secondary),var(--accent-purple))', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                  <p style={{ margin: '6px 0 0 26px', fontSize: '0.75rem', opacity: 0.6, textAlign: 'left', fontWeight: 700 }}>{uq.progress}/{uq.quest.target}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active packs footer */}
      <p style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'center', fontWeight: 700 }}>
        Skin: <b style={{ color: 'var(--accent-purple)' }}>{user.active_skin_pack}</b> · Audio: <b style={{ color: 'var(--accent-purple)' }}>{user.active_audio_pack}</b>
      </p>
    </main>
  );
}
