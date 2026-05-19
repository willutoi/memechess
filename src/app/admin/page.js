"use client";
import { useState } from 'react';
import Link from 'next/link';

const BOT_NAMES = ['StockBot_Sigma', 'GigaChad_GM', 'Skibidi_NM', 'Rizz_Master', 'KaiCenat_Chess', 'GigaChad_Sigma', 'Skibidi_Toilet69', 'KaiCenat_Rizz', 'DogeFather_Musk'];

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin?password=${encodeURIComponent(pwd)}`);
      if (res.status === 401) { setError('Incorrect password!'); setLoading(false); return; }
      const data = await res.json();
      setUsers(data);
      setAuthed(true);
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchUsers(password);
  };

  const handleDelete = async (username) => {
    if (!confirm(`Delete player account "${username}"? This action cannot be undone!`)) return;
    setDeleteMsg('');
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteMsg(`✅ Account "${username}" successfully deleted.`);
        setUsers(prev => prev.filter(u => u.username !== username));
      } else {
        setDeleteMsg(`❌ ${data.error}`);
      }
    } catch {
      setDeleteMsg('❌ Deletion failed');
    }
  };

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  const realUsers = filtered.filter(u => !BOT_NAMES.includes(u.username));
  const bots = filtered.filter(u => BOT_NAMES.includes(u.username));

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="neo-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 380, width: '100%', position: 'relative', background: '#ffffff' }}>
          {/* Stickers */}
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', left: '-20px', transform: 'rotate(-8deg)' }}>🛡️ STAFF ONLY</div>
          <div className="neo-sticker sticker-yellow" style={{ bottom: '-15px', right: '-15px', transform: 'rotate(6deg)' }}>⚠️ SECURE</div>

          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
          <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0' }}>Admin Panel</h1>
          <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '2rem', fontWeight: 600 }}>MemeChess Administration</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              placeholder="Enter admin password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? '⌛ Logging in...' : '🔐 Auth Access'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/" className="btn-ghost" style={{ fontSize: '0.85rem' }}>← Back to Menu</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.5rem', gap: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0 }}>🛡️ Admin Panel</h1>
            <p style={{ opacity: 0.6, margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>Player Accounts Management System</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#faf5ff', border: '1px solid #e9d5ff', padding: '6px 14px', borderRadius: '14px', color: '#7c3aed', fontWeight: 900, fontSize: '0.9rem' }}>
              👥 {realUsers.length} Users | 🤖 {bots.length} Bots
            </div>
            <Link href="/">
              <button className="btn-secondary" style={{ padding: '8px 16px' }}>← Back to Menu</button>
            </Link>
          </div>
        </div>

        {/* Delete Msg */}
        {deleteMsg && (
          <div style={{
            background: deleteMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2',
            border: `1px solid var(--border-dark)`,
            borderRadius: 12, padding: '12px 20px',
            color: deleteMsg.startsWith('✅') ? '#047857' : '#b91c1c',
            fontWeight: 800,
            boxShadow: '2px 2px 0px var(--border-dark)',
            fontSize: '0.92rem'
          }}>
            {deleteMsg}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search users by username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px 16px' }}
        />

        {/* Real Users Table Panel */}
        <div className="neo-panel" style={{ padding: '1.5rem', background: '#ffffff', position: 'relative', overflow: 'visible' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-pink" style={{ top: '-12px', right: '15px', transform: 'rotate(6deg)' }}>👥 REAL USERS</div>
          
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '1.2rem', color: 'var(--foreground)' }}>Active Accounts</h2>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-dark)' }}>
                  {['User', 'ELO', 'MemeCoins', 'W/L', 'Games', 'Created', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--foreground-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realUsers.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-tertiary)', fontWeight: 600 }}>No accounts found...</td></tr>
                )}
                {realUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 800, color: 'var(--foreground)' }}>{u.username}</td>
                    <td style={{ padding: '14px 10px', color: '#b45309', fontWeight: 900 }}>{u.elo}</td>
                    <td style={{ padding: '14px 10px', color: '#059669', fontWeight: 800 }}>🪙 {u.meme_coins.toLocaleString()}</td>
                    <td style={{ padding: '14px 10px', fontWeight: 700 }}><span style={{ color: '#059669' }}>{u.wins}W</span> / <span style={{ color: '#dc2626' }}>{u.losses}L</span></td>
                    <td style={{ padding: '14px 10px', color: 'var(--foreground-secondary)', fontWeight: 700 }}>{u.games_played}</td>
                    <td style={{ padding: '14px 10px', color: 'var(--foreground-tertiary)', fontSize: '0.8rem', fontWeight: 600 }}>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <button
                        onClick={() => handleDelete(u.username)}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: '#fef2f2', border: '1px solid #fecaca',
                          color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem',
                          fontWeight: 800, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.target.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.target.style.background = '#fef2f2'; }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bots Panel */}
        <div className="neo-panel" style={{ padding: '1.5rem', background: '#ffffff', position: 'relative', overflow: 'visible' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-purple" style={{ top: '-12px', right: '15px', transform: 'rotate(-4deg)' }}>🤖 PROTECTED BOTS</div>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '1.2rem', color: 'var(--foreground)' }}>Bot Accounts</h2>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-dark)' }}>
                  {['Bot Username', 'ELO', 'MemeCoins', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--foreground-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bots.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-tertiary)', fontWeight: 600 }}>No bots found...</td></tr>
                )}
                {bots.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 800, color: 'var(--foreground-secondary)' }}>🤖 {u.username}</td>
                    <td style={{ padding: '14px 10px', color: 'var(--foreground-tertiary)', fontWeight: 700 }}>{u.elo}</td>
                    <td style={{ padding: '14px 10px', color: 'var(--foreground-tertiary)' }}>🪙 {u.meme_coins?.toLocaleString()}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 800 }}>PROTECTED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
