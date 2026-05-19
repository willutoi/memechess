"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Zap, Star } from 'lucide-react';
import { use } from 'react';

export default function ProfilePage({ params }) {
  const { username } = use(params);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const me = localStorage.getItem('memechess_user');
    setIsOwnProfile(me === username);
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setBio(data.bio || '');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveBio = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, bio })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setEditing(false);
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getEloTier = (elo) => {
    if (elo >= 2000) return { label: 'Grandmaster', color: '#ffd700', icon: '👑' };
    if (elo >= 1700) return { label: 'Expert', color: '#818cf8', icon: '💎' };
    if (elo >= 1400) return { label: 'Advanced', color: '#34d399', icon: '⚡' };
    if (elo >= 1100) return { label: 'Intermediate', color: '#60a5fa', icon: '🎯' };
    return { label: 'Beginner', color: '#a5b4fc', icon: '🌱' };
  };

  const winRate = profile ? (profile.wins / Math.max(1, profile.games_played) * 100).toFixed(1) : 0;

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>♟️</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </main>
  );

  if (!profile) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem' }}>😵</p>
        <h2>Player not found</h2>
        <Link href="/"><button className="btn-secondary" style={{ marginTop: '1rem' }}>← Back Home</button></Link>
      </div>
    </main>
  );

  const tier = getEloTier(profile.elo);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1.5rem' }}>
      {/* Back button */}
      <div style={{ width: '100%', maxWidth: 720 }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </Link>
      </div>

      {/* Profile Card */}
      <div className="neo-panel" style={{ width: '100%', maxWidth: 720, padding: '2rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar & Name */}
          <div style={{ textAlign: 'center', minWidth: 110 }}>
            <div style={{ fontSize: '4rem', width: 90, height: 90, background: 'rgba(99,102,241,0.08)', border: '2px solid rgba(99,102,241,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 0.75rem' }}>
              {profile.avatar || '🧠'}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}35`, borderRadius: 6, padding: '3px 10px', display: 'inline-block' }}>
              {tier.icon} {tier.label}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.25rem' }}>{profile.username}</h1>
            <p style={{ opacity: 0.5, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              Member since {formatDate(profile.createdAt)}
              {profile.country && ` · ${profile.country}`}
            </p>

            {/* Bio */}
            {editing ? (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={160}
                  placeholder="Write something about yourself..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid var(--border-dark)', color: 'var(--foreground)', fontSize: '0.9rem' }}
                />
                <button onClick={saveBio} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>Cancel</button>
              </div>
            ) : (
              <p style={{ opacity: profile.bio ? 0.8 : 0.4, fontSize: '0.9rem', marginBottom: '0.75rem', fontStyle: profile.bio ? 'normal' : 'italic' }}>
                {profile.bio || 'No bio yet...'}
                {isOwnProfile && (
                  <button onClick={() => setEditing(true)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                    edit
                  </button>
                )}
              </p>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { label: 'ELO', value: profile.elo, color: '#d97706' },
                { label: 'Wins', value: profile.wins, color: '#059669' },
                { label: 'Losses', value: profile.losses, color: '#dc2626' },
                { label: 'Win Rate', value: `${winRate}%`, color: '#4f46e5' },
                { label: 'Games', value: profile.games_played, color: '#6366f1' },
                { label: 'MemeCoins', value: `🪙 ${profile.meme_coins.toLocaleString()}`, color: '#d97706' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fafafa', border: '1px solid var(--border-dark)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', boxShadow: '1px 1px 0px rgba(0,0,0,0.02)' }}>
                  <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {profile.achievements?.length > 0 && (
        <div className="neo-panel" style={{ width: '100%', maxWidth: 720, padding: '1.5rem', background: '#ffffff' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={18} color="#fbbf24" /> Achievements ({profile.achievements.length})
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {profile.achievements.map(ua => (
              <div key={ua.id} title={ua.achievement.description} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: '1.8rem' }}>{ua.achievement.icon}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{ua.achievement.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game History */}
      <div className="neo-panel" style={{ width: '100%', maxWidth: 720, padding: '1.5rem', background: '#ffffff' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={18} color="#818cf8" /> Recent Games
        </h2>
        {profile.games?.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', fontSize: '0.9rem' }}>No games played yet. <Link href="/play" style={{ color: '#6366f1' }}>Play now!</Link></p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profile.games.slice(0, 15).map(g => (
              <div key={g.id} style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', background: '#fafafa', border: '1px solid var(--border-dark)', borderRadius: 10, padding: '8px 14px', boxShadow: '1px 1px 0px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {g.result === 'win' ? '✅' : g.result === 'loss' ? '❌' : '🤝'}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: g.result === 'win' ? '#059669' : g.result === 'loss' ? '#dc2626' : '#d97706', textTransform: 'capitalize' }}>
                      {g.result} vs AI ({g.difficulty})
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.5 }}>{formatDate(g.playedAt)} · {g.moveCount} moves</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: g.eloChange >= 0 ? '#059669' : '#dc2626' }}>
                    {g.eloChange >= 0 ? '+' : ''}{g.eloChange} ELO
                  </p>
                  {g.coinsGained > 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>+{g.coinsGained} 🪙</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
