"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Lock, CheckCircle2, Star, Coins } from 'lucide-react';
import { Howl } from 'howler';

const BP_REWARDS = [
  { level: 1, title: 'Classic Skin Pack ♟️', type: 'item', requirementText: 'Free Starter Reward', check: () => true, rewardVal: 'classic', coinReward: 0 },
  { level: 2, title: '250 MemeCoins 🪙', type: 'coins', requirementText: 'Win at least 2 games', check: (u) => u.wins >= 2, rewardVal: '', coinReward: 250 },
  { level: 3, title: 'Sigma Title Badge 🗿', type: 'badge', requirementText: 'Reach 1300 ELO', check: (u) => u.elo >= 1300, rewardVal: 'Sigma Gym Bro 🗿', coinReward: 0 },
  { level: 4, title: '500 MemeCoins 🪙', type: 'coins', requirementText: 'Play 10 games total', check: (u) => u.games_played >= 10, rewardVal: '', coinReward: 500 },
  { level: 5, title: 'GigaChad Status 🍷', type: 'badge', requirementText: 'Win at least 8 games', check: (u) => u.wins >= 8, rewardVal: 'Alpha GigaChad 🍷', coinReward: 0 },
  { level: 6, title: '1000 MemeCoins 🪙', type: 'coins', requirementText: 'Reach 1450 ELO', check: (u) => u.elo >= 1450, rewardVal: '', coinReward: 1000 },
  { level: 7, title: 'Stockfish Slayer 🧠', type: 'badge', requirementText: 'Win 20 games total', check: (u) => u.wins >= 20, rewardVal: 'Stockfish Slayer 🧠', coinReward: 0 }
];

export default function BattlePass() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState({ success: null, message: '' });

  const claimSoundRef = useRef(null);

  useEffect(() => {
    claimSoundRef.current = new Howl({
      src: ['https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'],
      volume: 0.5
    });

    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) {
      fetchUser(storedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (username) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.ok) {
        setUser(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (level) => {
    if (!user) return;
    setClaimStatus({ success: null, message: '' });

    try {
      const res = await fetch('/api/battlepass/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, level })
      });
      const data = await res.json();
      if (res.ok) {
        claimSoundRef.current?.play();
        setClaimStatus({ success: true, message: `Successfully claimed Level ${level} reward: ${data.rewardText}` });
        setUser(data.user);
        window.dispatchEvent(new CustomEvent('memechess_user_updated'));
      } else {
        setClaimStatus({ success: false, message: data.error || 'Failed to claim reward.' });
      }
    } catch (e) {
      console.error(e);
      setClaimStatus({ success: false, message: 'Network error occurred.' });
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>♟️</div>
          <p style={{ color: '#a855f7', fontWeight: 600 }}>Loading Aura Pass...</p>
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
          <p style={{ opacity: 0.7, margin: '1rem 0' }}>Log in to view and unlock your Aura Pass tiers!</p>
          <Link href="/"><button className="btn-primary">Go to Login</button></Link>
        </div>
      </main>
    );
  }

  const ownedItemsList = user.owned_items ? user.owned_items.split(',') : [];

  // Calculate current Battle Pass tier
  let currentBPTier = 1;
  BP_REWARDS.forEach(r => {
    if (r.check(user)) {
      currentBPTier = Math.max(currentBPTier, r.level);
    }
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.8rem', fontWeight: 800 }}>
          <Star size={24} color="#a855f7" /> Season 1: Aura Pass
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', padding: '6px 12px', borderRadius: '18px', color: '#b45309', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🪙 {user.meme_coins}
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Your Status: Tier {currentBPTier} / {BP_REWARDS.length}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
              Wins: <b>{user.wins}</b> · ELO: <b>{user.elo}</b> · Games Played: <b>{user.games_played}</b>
            </p>
          </div>
          {/* Circular level indicator */}
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(168,85,247,0.3)', border: '2px solid rgba(255,255,255,0.2)', color: '#ffffff' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Tier</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900 }}>{currentBPTier}</span>
          </div>
        </div>

        {/* Global Progress bar */}
        <div style={{ height: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(currentBPTier / BP_REWARDS.length) * 100}%`, background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>

        {claimStatus.message && (
          <div style={{
            background: claimStatus.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${claimStatus.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: claimStatus.success ? '#059669' : '#dc2626',
            borderRadius: 10, padding: '10px 14px', fontSize: '0.88rem', fontWeight: 700
          }}>
            {claimStatus.message}
          </div>
        )}
      </div>

      {/* Rewards Timeline list */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {BP_REWARDS.map(r => {
          const isEligible = r.check(user);
          const claimKey = `bp_level_${r.level}`;
          const isClaimed = ownedItemsList.includes(claimKey) || r.level === 1;

          return (
            <div 
              key={r.level} 
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: isClaimed 
                  ? '1px solid rgba(16,185,129,0.25)' 
                  : isEligible 
                    ? '1px solid rgba(168,85,247,0.3)' 
                    : '1px solid var(--glass-border)',
                background: isClaimed 
                  ? 'rgba(16,185,129,0.03)' 
                  : isEligible 
                    ? 'rgba(168,85,247,0.03)' 
                    : 'rgba(0,0,0,0.015)',
                transition: 'all 0.25s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: isClaimed 
                    ? 'rgba(16,185,129,0.08)' 
                    : isEligible 
                      ? 'rgba(168,85,247,0.08)' 
                      : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isClaimed ? '#10b981' : isEligible ? '#a855f7' : 'rgba(0,0,0,0.08)'}`,
                  color: isClaimed ? '#059669' : isEligible ? '#a855f7' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem'
                }}>
                  {r.level}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>{r.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', opacity: 0.65, display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--foreground)' }}>
                    {!isEligible && <Lock size={12} />} Req: {r.requirementText}
                  </p>
                </div>
              </div>

              <div>
                {isClaimed ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontSize: '0.85rem', fontWeight: 800 }}>
                    <CheckCircle2 size={16} /> Claimed
                  </span>
                ) : isEligible ? (
                  <button onClick={() => handleClaim(r.level)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem', fontWeight: 800 }}>
                    🎁 Claim Reward
                  </button>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
                    Locked 🔒
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
