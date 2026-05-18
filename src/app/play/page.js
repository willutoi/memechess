"use client";
import MemeChessBoard from '../../components/MemeChessBoard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Play() {
  const [activePack, setActivePack] = useState('classic');
  const [activeAudioPack, setActiveAudioPack] = useState('default');

  useEffect(() => {
    const fetchUser = async (username) => {
      try {
        const res = await fetch(`/api/user?username=${username}`);
        if (res.ok) {
          const data = await res.json();
          if (data.active_skin_pack) setActivePack(data.active_skin_pack);
          if (data.active_audio_pack) setActiveAudioPack(data.active_audio_pack);
        }
      } catch (e) {
        console.error(e);
      }
    };
    const storedUser = localStorage.getItem('memechess_user');
    if (storedUser) fetchUser(storedUser);
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back to Menu
          </button>
        </Link>
        <h2 className="text-gradient">Play vs AI</h2>
      </div>

      <MemeChessBoard activePack={activePack} activeAudioPack={activeAudioPack} />
    </main>
  );
}
