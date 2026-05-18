"use client";
import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Volume1, Music, X } from 'lucide-react';

// Reliable SoundHelix tracks since Pixabay blocks hotlinking with 403s
const BGM_TRACKS = {
  classic:  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',  label: '🎵 Lofi Chill Beats' },
  brainrot: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',  label: '💀 Brainrot Banger' },
  phonk:    { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',  label: '🎧 Phonk Sigma Grindset' },
  default:  { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',  label: '🎵 Lofi Chill Beats' },
};

export default function BGMPlayer() {
  const [playing, setPlaying]       = useState(false);
  const [volume, setVolume]         = useState(0.12);
  const [showPanel, setShowPanel]   = useState(false);
  const [activePack, setActivePack] = useState('classic');
  const audioRef = useRef(null);
  const playingRef = useRef(false); // shadow ref to read inside event handlers

  // Load user's audio pack on mount
  useEffect(() => {
    const load = async () => {
      const u = localStorage.getItem('memechess_user');
      if (!u) return;
      try {
        const res = await fetch(`/api/user?username=${encodeURIComponent(u)}`);
        if (res.ok) {
          const data = await res.json();
          setActivePack(data.active_audio_pack || 'classic');
        }
      } catch (_) {}
    };
    load();

    // Listen for real-time audio pack changes dispatched by shop
    const handler = (e) => {
      setActivePack(e.detail.pack);
    };
    window.addEventListener('memechess_audio_changed', handler);
    return () => window.removeEventListener('memechess_audio_changed', handler);
  }, []);

  // Swap track whenever activePack changes
  useEffect(() => {
    const wasPlaying = playingRef.current;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const track = BGM_TRACKS[activePack] || BGM_TRACKS.classic;
    const bgm = new Audio(track.url);
    bgm.loop = true;
    bgm.volume = volume;
    audioRef.current = bgm;

    if (wasPlaying) {
      bgm.play().catch(() => { setPlaying(false); playingRef.current = false; });
    }
  }, [activePack]); // eslint-disable-line

  const toggleBGM = () => {
    const bgm = audioRef.current;
    if (!bgm) return;
    if (playing) {
      bgm.pause();
      setPlaying(false);
      playingRef.current = false;
    } else {
      bgm.play().catch(() => { setPlaying(false); playingRef.current = false; });
      setPlaying(true);
      playingRef.current = true;
    }
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.4 ? Volume1 : Volume2;
  const trackLabel = (BGM_TRACKS[activePack] || BGM_TRACKS.classic).label;

  return (
    <>
      {showPanel && (
        <div style={{ position:'fixed', bottom:75, right:20, background:'rgba(9,9,11,0.97)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:16, padding:'1.2rem', zIndex:1001, width:230, boxShadow:'0 8px 32px rgba(0,0,0,.6)', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.9rem' }}>
            <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#e0e7ff' }}>Music Player</span>
            <button onClick={() => setShowPanel(false)} style={{ background:'none', border:'none', color:'#666', cursor:'pointer' }}><X size={16}/></button>
          </div>

          <div style={{ background:'rgba(99,102,241,0.1)', borderRadius:8, padding:'6px 10px', marginBottom:'0.8rem', fontSize:'0.78rem', color:'#a5b4fc' }}>
            ▶ {trackLabel}
          </div>

          <button onClick={toggleBGM} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid rgba(99,102,241,0.4)', background: playing ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.1)', color:'#a5b4fc', cursor:'pointer', fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Music size={16}/> {playing ? 'Pause' : 'Play'}
          </button>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ fontSize:'0.78rem', color:'#a5b4fc', display:'flex', alignItems:'center', gap:4 }}><VolumeIcon size={13}/> Volume</label>
              <span style={{ fontSize:'0.78rem', color:'#6366f1', fontWeight:'bold' }}>{Math.round(volume*100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} style={{ width:'100%', accentColor:'#6366f1', cursor:'pointer' }}/>
          </div>

          <p style={{ marginTop:'0.8rem', fontSize:'0.7rem', color:'#444', textAlign:'center' }}>Buy Audio Packs in the Shop to change track</p>
        </div>
      )}

      <button onClick={() => setShowPanel(p => !p)} style={{ position:'fixed', bottom:20, right:20, background: showPanel ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.15)', border:`1px solid ${playing ? '#6366f1' : 'rgba(99,102,241,0.4)'}`, color: playing ? '#a5b4fc' : '#6366f1', width:48, height:48, borderRadius:'50%', cursor:'pointer', zIndex:1000, boxShadow: playing ? '0 0 22px rgba(99,102,241,.6)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
        {playing ? <Volume2 size={22}/> : <VolumeX size={22}/>}
      </button>
    </>
  );
}
