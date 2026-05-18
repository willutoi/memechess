"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Store, Trophy, LogIn } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) {
      fetchUser(storedUser);
    }

    const handleUpdate = () => {
      const u = localStorage.getItem('memechess_user');
      if (u) fetchUser(u);
    };
    window.addEventListener('memechess_user_updated', handleUpdate);
    return () => window.removeEventListener('memechess_user_updated', handleUpdate);
  }, []);

  const fetchUser = async (username) => {
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('memechess_user', data.username);
        setUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('memechess_user');
    setUser(null);
  };

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: '800' }}>Login</h1>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Enter your aura name to begin.</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Username" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '1.1rem' }}
              required
            />
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <LogIn size={20} /> Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', opacity: 0.9 }}>Welcome, {user.username}</h2>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>Logout</button>
        </div>

        <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1rem', fontWeight: '800' }}>
          MemeChess
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem', opacity: 0.8 }}>
          The ultimate brainrot chess experience. Win games, earn MemeCoins, and collect viral skins!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/play" style={{ width: '100%' }}>
            <button className="btn-primary" style={{ width: '100%', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '15px' }}>
              <Play size={24} /> Play Now
            </button>
          </Link>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
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
        </div>
      </div>

      <div style={{ marginTop: '2.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.2rem 2.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ margin: '4px 0', fontSize: '1.1rem' }}>Balance: <b style={{ color: '#ffd700' }}>{user.meme_coins.toLocaleString()} MemeCoins 🪙</b></p>
        <p style={{ margin: '4px 0', fontSize: '1.1rem' }}>ELO Rating: <b style={{ color: '#fbbf24' }}>{user.elo} ELO 👑</b></p>
        <p style={{ margin: '4px 0', fontSize: '0.9rem', opacity: 0.8 }}>Record: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{user.wins}W</span> - <span style={{ color: '#f87171', fontWeight: 'bold' }}>{user.losses}L</span> ({user.games_played} played)</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', opacity: 0.65 }}>Active Pack: <b style={{ color: '#a855f7' }}>{user.active_skin_pack}</b> | Audio: <b style={{ color: '#c084fc' }}>{user.active_audio_pack}</b></p>
      </div>
    </main>
  );
}
