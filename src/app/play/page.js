"use client";
import MemeChessBoard from '../../components/MemeChessBoard';
import GameChat from '../../components/GameChat';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Play() {
  const [activePack, setActivePack] = useState('classic');
  const [activeAudioPack, setActiveAudioPack] = useState('default');
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('memechess_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUsername(storedUser);
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user?username=${storedUser}`);
        if (res.ok) {
          const data = await res.json();
          if (data.active_skin_pack) setActivePack(data.active_skin_pack);
          if (data.active_audio_pack) setActiveAudioPack(data.active_audio_pack);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '920px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back
          </button>
        </Link>
        <h2 className="text-gradient" style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem' }}>♟️ MemeChess Arena</h2>
        <GameChat username={username} />
      </div>

      <MemeChessBoard activePack={activePack} activeAudioPack={activeAudioPack} username={username} />
    </main>
  );
}
