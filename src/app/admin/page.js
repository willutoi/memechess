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
      if (res.status === 401) { setError('Неверный пароль!'); setLoading(false); return; }
      const data = await res.json();
      setUsers(data);
      setAuthed(true);
    } catch {
      setError('Ошибка подключения');
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchUsers(password);
  };

  const handleDelete = async (username) => {
    if (!confirm(`Удалить аккаунт "${username}"? Это действие необратимо!`)) return;
    setDeleteMsg('');
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteMsg(`✅ Аккаунт "${username}" удалён.`);
        setUsers(prev => prev.filter(u => u.username !== username));
      } else {
        setDeleteMsg(`❌ ${data.error}`);
      }
    } catch {
      setDeleteMsg('❌ Ошибка при удалении');
    }
  };

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  const realUsers = filtered.filter(u => !BOT_NAMES.includes(u.username));
  const bots = filtered.filter(u => BOT_NAMES.includes(u.username));

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '3rem', width: 360, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem' }}>🛡️</div>
            <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '0.5rem 0' }}>Admin Panel</h1>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>MemeChess Administration</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Введи пароль администратора"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box', outline: 'none' }}
            />
            {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0 0 1rem', textAlign: 'center' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? '⌛ Загрузка...' : '🔐 Войти'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/" style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none' }}>← Вернуться на главную</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: 0 }}>🛡️ Admin Panel</h1>
            <p style={{ color: '#666', margin: '4px 0 0' }}>Управление аккаунтами игроков</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem' }}>
              👥 {realUsers.length} игроков | 🤖 {bots.length} ботов
            </span>
            <Link href="/" style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none', padding: '8px 16px', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10 }}>← Главная</Link>
          </div>
        </div>

        {/* Status message */}
        {deleteMsg && (
          <div style={{ background: deleteMsg.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${deleteMsg.startsWith('✅') ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 12, padding: '12px 20px', marginBottom: '1.5rem', color: deleteMsg.startsWith('✅') ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {deleteMsg}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Поиск по нику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', marginBottom: '1.5rem', boxSizing: 'border-box', outline: 'none' }}
        />

        {/* Real Users Table */}
        <h2 style={{ color: '#e0e7ff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>👥 Реальные игроки</h2>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                {['Игрок', 'ELO', 'Монеты', 'W/L', 'Игр', 'Дата', 'Действие'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {realUsers.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>Нет игроков</td></tr>
              )}
              {realUsers.map((u, i) => (
                <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 700 }}>{u.elo}</td>
                  <td style={{ padding: '12px 16px', color: '#ffd700' }}>🪙 {u.meme_coins.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ color: '#34d399' }}>{u.wins}W</span> / <span style={{ color: '#f87171' }}>{u.losses}L</span></td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{u.games_played}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(u.username)}
                      style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
                      onMouseEnter={e => e.target.style.background = 'rgba(248,113,113,0.3)'}
                      onMouseLeave={e => e.target.style.background = 'rgba(248,113,113,0.15)'}
                    >
                      🗑️ Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bots Table */}
        <h2 style={{ color: '#e0e7ff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🤖 Боты (защищены)</h2>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                {['Бот', 'ELO', 'Монеты', 'Статус'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bots.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#333' }}>Нет ботов в базе</td></tr>
              )}
              {bots.map((u, i) => (
                <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: 600 }}>🤖 {u.username}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{u.elo}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>🪙 {u.meme_coins?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>ЗАЩИЩЁН</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
