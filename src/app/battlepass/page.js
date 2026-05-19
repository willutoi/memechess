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
        <div className="neo-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '380px', width: '100%', position: 'relative', background: '#ffffff' }}>
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', left: '-20px', transform: 'rotate(-8deg)' }}>🔒 LOCKED</div>
          <p style={{ fontSize: '3.5rem', margin: '0 0 1rem 0' }}>🔒</p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>Log In First</h2>
          <p style={{ opacity: 0.7, margin: '0.5rem 0 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Log in to view and unlock your Aura Pass rewards!</p>
          <Link href="/"><button className="btn-primary" style={{ width: '100%' }}>Go to Login</button></Link>
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
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.5rem', gap: '2rem' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2.2rem', fontWeight: 900 }}>
          <Star size={28} color="var(--accent-purple)" /> Season 1: Aura Pass
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', border: '2px solid var(--border-dark)', padding: '6px 16px', borderRadius: '14px', color: '#b45309', fontWeight: 900, fontSize: '0.9rem', boxShadow: '2px 2px 0px 0px var(--border-dark)' }}>
            🪙 {user.meme_coins.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="neo-panel" style={{ width: '100%', maxWidth: '800px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
        {/* Sticker */}
        <div className="neo-sticker sticker-purple" style={{ top: '-15px', right: '15px', transform: 'rotate(4deg)' }}>⚡ PASS</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Your Status: Tier {currentBPTier} / {BP_REWARDS.length}</h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', opacity: 0.75, fontWeight: 700 }}>
              Wins: <b>{user.wins}</b> · ELO: <b>{user.elo}</b> · Games Played: <b>{user.games_played}</b>
            </p>
          </div>
          {/* Circular level indicator */}
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-dark)', color: '#ffffff', boxShadow: '3px 3px 0px 0px var(--border-dark)' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>Tier</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900 }}>{currentBPTier}</span>
          </div>
        </div>

        {/* Global Progress bar */}
        <div style={{ height: 14, background: '#f5f5f0', border: '2px solid var(--border-dark)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(currentBPTier / BP_REWARDS.length) * 100}%`, background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-secondary))', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>

        {claimStatus.message && (
          <div style={{
            background: claimStatus.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
            border: '2px solid var(--border-dark)',
            color: claimStatus.success ? '#059669' : '#dc2626',
            borderRadius: 10, padding: '10px 14px', fontSize: '0.88rem', fontWeight: 800, boxShadow: '2px 2px 0px var(--border-dark)'
          }}>
            {claimStatus.message}
          </div>
        )}
      </div>

      {/* Rewards Timeline list */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {BP_REWARDS.map(r => {
          const isEligible = r.check(user);
          const claimKey = `bp_level_${r.level}`;
          const isClaimed = ownedItemsList.includes(claimKey) || r.level === 1;

          return (
            <div 
              key={r.level} 
              className="neo-panel"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '2px solid var(--border-dark)',
                background: isClaimed 
                  ? '#d1fae5' 
                  : isEligible 
                    ? 'rgba(168,85,247,0.05)' 
                    : '#ffffff',
                boxShadow: isClaimed ? '1px 1px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                transform: isClaimed ? 'translate(2px, 2px)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '2px solid var(--border-dark)',
                  color: isClaimed ? '#059669' : isEligible ? 'var(--accent-purple)' : 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '1.15rem',
                  boxShadow: '2px 2px 0px var(--border-dark)'
                }}>
                  {r.level}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--foreground)' }}>{r.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--foreground)', fontWeight: 700 }}>
                    {!isEligible && <Lock size={12} />} Req: {r.requirementText}
                  </p>
                </div>
              </div>

              <div>
                {isClaimed ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#047857', fontSize: '0.85rem', fontWeight: 900 }}>
                    <CheckCircle2 size={16} /> Claimed
                  </span>
                ) : isEligible ? (
                  <button onClick={() => handleClaim(r.level)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800 }}>
                    🎁 Claim Reward
                  </button>
                ) : (
                  <span style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '0.85rem', fontWeight: 700 }}>
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
