"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins } from 'lucide-react';

export default function Shop() {
  const [user, setUser] = useState(null);
  
  const skins = [
    { 
      name: 'Classic Elegant ♟️', 
      internal: 'classic', 
      price: 0, 
      img: '/skin_classic.png',
      desc: 'Elegant, premium high-contrast retro style pieces.',
      preview: ['♙','♘','♗','♖','♕','♔','♟','♞'] 
    },
    { 
      name: 'Crypto Brainrot 🚀', 
      internal: 'crypto', 
      price: 1000, 
      img: '/skin_crypto.png',
      desc: 'To the moon! Play with Bitcoin, Dogecoins, and Stonks!',
      preview: ['💰','🐕','💎','🚀','📈','🧑‍🚀','📉','🐻'] 
    },
    { 
      name: 'Sigma Gigachad 🗿', 
      internal: 'sigma', 
      price: 2500, 
      img: '/skin_sigma.png',
      desc: 'Alpha-energy Moai statues, Gigachads, and wine glasses.',
      preview: ['🍷','🗿','🏋️','🏰','👑','😎','💀','🤓'] 
    }
  ];

  const audios = [
    { name: 'Lofi Chill Beats 🎵', internal: 'classic', price: 0, desc: 'Cozy, relaxing beats for mindful chess matches.' },
    { name: 'Brainrot Banger 💀', internal: 'brainrot', price: 500, desc: 'Viral sound effects, meme sounds and audio bursts.' },
    { name: 'Phonk Sigma Grindset 🎧', internal: 'phonk', price: 1500, desc: 'Hard cowbells, sub bass drops, and epic energetic rhythms.' }
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) {
      fetchUser(storedUser);
    }

    // Dynamic update handler
    const updateHandler = () => {
      if (storedUser) fetchUser(storedUser);
    };
    window.addEventListener('memechess_user_updated', updateHandler);
    return () => window.removeEventListener('memechess_user_updated', updateHandler);
  }, []);

  const fetchUser = async (username) => {
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.ok) {
        setUser(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuy = async (item, type) => {
    if (!user) return alert("Please login first!");
    
    // Check if they own it or if price is 0
    const isOwned = user.owned_items?.includes(item.internal);
    if (!isOwned && item.price > 0 && user.meme_coins < item.price) {
      return alert("Not enough MemeCoins!");
    }

    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: user.username, 
          pack_name: item.internal, 
          price: isOwned ? 0 : item.price, 
          type 
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        // Dispatch real-time BGM change if audio pack was bought
        if (type === 'audio') {
          window.dispatchEvent(new CustomEvent('memechess_audio_changed', { detail: { pack: item.internal } }));
        }
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>♟️</div>
          <p style={{ fontWeight: 600 }}>Loading shop goods...</p>
        </div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.5rem', gap: '2rem' }}>
      {/* Shop Header */}
      <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Meme Shop</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', border: '2px solid var(--border-dark)', padding: '0.6rem 1.2rem', borderRadius: '14px', color: '#b45309', fontWeight: 900, boxShadow: '2px 2px 0px 0px var(--border-dark)' }}>
          <Coins size={20} /> {user.meme_coins.toLocaleString()} MC
        </div>
      </div>

      {/* Grid of Store Packs */}
      <div style={{ width: '100%', maxWidth: '850px', display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        
        {/* Visual Skins */}
        <div className="neo-panel" style={{ padding: '2rem', position: 'relative' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-pink" style={{ top: '-15px', left: '15px', transform: 'rotate(-4deg)' }}>🔥 STYLISH</div>

          <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--border-dark)', paddingBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>Visual Skins</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {skins.map(s => {
              const isEquipped = user.active_skin_pack === s.internal;
              const isOwned = user.owned_items?.includes(s.internal);
              return (
                <div 
                  key={s.name} 
                  style={{ 
                    background: '#ffffff', 
                    border: '2px solid var(--border-dark)', 
                    borderRadius: '16px', 
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isEquipped ? '1px 1px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                    transform: isEquipped ? 'translate(2px, 2px)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    {/* Generated AI Artwork */}
                    <img 
                      src={s.img} 
                      alt={s.name} 
                      style={{ 
                        width: '100%', 
                        height: '140px', 
                        objectFit: 'cover', 
                        borderRadius: '12px',
                        marginBottom: '10px',
                        border: '2px solid var(--border-dark)'
                      }} 
                    />
                    <h4 style={{ fontWeight: '900', fontSize: '1.15rem', marginBottom: '4px' }}>{s.name}</h4>
                    <p style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: '10px', fontWeight: 500 }}>{s.desc}</p>
                    
                    {/* Pieces preview */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.2rem', padding: '6px', border: '1px solid var(--border-dark)', borderRadius: '10px', background: '#f5f5f0' }}>
                      {s.preview?.map((em, i) => (
                        <span key={i} style={{ fontSize: '1.3rem', lineHeight: 1, filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.5))' }}>{em}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    {isEquipped ? (
                      <button disabled style={{ width: '100%', padding: '10px 0', borderRadius: '10px', border: '2px solid var(--border-dark)', color: '#047857', background: '#d1fae5', cursor: 'default', fontWeight: 800 }}>✓ Equipped</button>
                    ) : (
                      <button onClick={() => handleBuy(s, 'skin')} className="btn-primary" style={{ width: '100%', padding: '10px 0', fontSize: '0.9rem' }}>
                        {isOwned || s.price === 0 ? '⚡ Equip Pack' : `Buy for ${s.price} MC`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Packs */}
        <div className="neo-panel" style={{ padding: '2rem', position: 'relative' }}>
          {/* Sticker */}
          <div className="neo-sticker sticker-yellow" style={{ top: '-15px', right: '15px', transform: 'rotate(4deg)' }}>🔊 LOUD = FUNNY</div>

          <h3 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--border-dark)', paddingBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 900 }}>Audio Packs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
            {audios.map(a => {
              const isEquipped = user.active_audio_pack === a.internal;
              const isOwned = user.owned_items?.includes(a.internal);
              return (
                <div 
                  key={a.name} 
                  className="audio-pack-row"
                  style={{ 
                    background: '#ffffff',
                    border: '2px solid var(--border-dark)',
                    borderRadius: '12px',
                    transition: 'all 0.15s',
                    padding: '1.2rem',
                    boxShadow: isEquipped ? '1px 1px 0px var(--border-dark)' : '3px 3px 0px 0px var(--border-dark)',
                    transform: isEquipped ? 'translate(2px, 2px)' : 'none'
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: '900', fontSize: '1.15rem', marginBottom: '4px' }}>{a.name}</h4>
                    <p style={{ fontSize: '0.82rem', opacity: 0.75, margin: 0, fontWeight: 500 }}>{a.desc}</p>
                  </div>
                  <div>
                    {isEquipped ? (
                      <button disabled style={{ padding: '10px 20px', borderRadius: '10px', border: '2px solid var(--border-dark)', color: '#047857', background: '#d1fae5', fontWeight: 800 }}>✓ Equipped</button>
                    ) : (
                      <button onClick={() => handleBuy(a, 'audio')} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                        {isOwned || a.price === 0 ? 'Equip' : `Buy for ${a.price} MC`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
