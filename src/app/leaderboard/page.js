"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Coins, Award } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('elo'); // elo | coins

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard?tab=${activeTab}`);
        if (res.ok) {
          setUsers(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      {/* Top Header */}
      <div style={{ width: '100%', maxWidth: '650px', display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.8rem', fontWeight: 800 }}>
          <Trophy size={28} /> Arena Leaderboard
        </h2>
        <div style={{ width: '120px' }}></div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', width: '100%', maxWidth: '650px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('elo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 20px',
            borderRadius: '12px',
            border: activeTab === 'elo' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'elo' ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.4)',
            color: activeTab === 'elo' ? '#e0e7ff' : '#a5b4fc',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Award size={18} /> Top ELO Kings
        </button>
        <button
          onClick={() => setActiveTab('coins')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 20px',
            borderRadius: '12px',
            border: activeTab === 'coins' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'coins' ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)',
            color: activeTab === 'coins' ? '#f3e8ff' : '#d8b4fe',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Coins size={18} /> Coin Billionaires
        </button>
      </div>

      {/* Leaderboard Table Container */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '1.5rem 2rem' }}>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a5b4fc', padding: '2rem 0' }}>Loading rankings...</div>
        ) : (
          users.map((u, i) => {
            const rank = i + 1;
            const isBot = u.username.includes('_') || u.username.includes('Bot') || u.username.includes('Musk') || u.username.includes('Master');
            
            return (
              <div 
                key={u.username} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.1rem 0', 
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <span style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: '900', 
                    color: rank === 1 ? '#ffd700' : rank === 2 ? '#e2e8f0' : rank === 3 ? '#b45309' : '#818cf8',
                    minWidth: 35
                  }}>
                    #{rank}
                  </span>
                  <div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff' }}>
                      {u.username}
                    </span>
                    {isBot && (
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: '0.65rem', 
                        background: 'rgba(99,102,241,0.25)', 
                        border: '1px solid #6366f1',
                        color: '#a5b4fc', 
                        padding: '2px 6px', 
                        borderRadius: 4, 
                        fontWeight: 'bold',
                        verticalAlign: 'middle'
                      }}>
                        BOT
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem' }}>
                      {u.elo} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>ELO</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.6, color: '#a5b4fc' }}>
                      {u.wins || 0} Wins
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: 8, minWidth: 90, textAlign: 'center' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {u.meme_coins.toLocaleString()} MC
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
