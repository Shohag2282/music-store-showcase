import React, { useEffect, useRef } from 'react';
import { usePlayback } from '../context/PlaybackContext';

function MusicPlayer({ song, audioMeta, onProgress, onPlayingChange }) {
  const {
    currentSong,
    isPlaying: globalIsPlaying,
    progress: globalProgress,
    volume,
    setVolume,
    currentTimeText,
    durationText,
    toggleSong,
  } = usePlayback();

  // Check if this specific player instance is the active one
  const isActive = !!(currentSong && song && currentSong.index === song.index);

  const isPlaying = isActive && globalIsPlaying;
  const progress = isActive ? globalProgress : 0;
  const displayCurrentTime = isActive ? currentTimeText : '0:00';

  const visualizerCanvasRef = useRef(null);

  // Calculate standard duration text when not active
  const {
    tempo = 120,
    numBars = 4,
    timeSignature = 4,
  } = audioMeta || {};
  const beatDuration = 60 / tempo;
  const totalBeats = numBars * timeSignature;
  const totalDuration = totalBeats * beatDuration;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayDuration = isActive ? durationText : formatTime(totalDuration);

  // Sync callbacks to parent components for legacy lyric highlight functionality
  useEffect(() => {
    if (onPlayingChange) {
      onPlayingChange(isPlaying);
    }
  }, [isPlaying, onPlayingChange]);

  useEffect(() => {
    if (onProgress) {
      onProgress(progress);
    }
  }, [progress, onProgress]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!song) return;
    toggleSong(song);
  };

  // canvas waveform animation
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let frameId;
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const barCount = 24;
      const barWidth = 3;
      const gap = 2;
      const startX = (width - (barCount * (barWidth + gap) - gap)) / 2;

      ctx.fillStyle = isPlaying ? '#a78bfa' : '#4b5563';

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          // bouncy sine animation while playing
          const t = Date.now() * 0.007;
          barHeight = 4 + Math.abs(Math.sin(t + i * 0.3) * Math.cos(t * 0.4 - i * 0.15)) * (height - 8);
        } else {
          // flat static bars when stopped
          barHeight = 4 + Math.abs(Math.sin(i * 0.25)) * 6;
        }

        const x = startX + i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  return (
    <div className="player-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      backgroundColor: 'var(--bg-secondary)', 
      padding: '10px 16px', 
      borderRadius: 'var(--radius-md)', 
      border: '1px solid var(--border-color)',
      maxWidth: '450px',
      margin: '8px 0 12px 0'
    }} onClick={(e) => e.stopPropagation()}>
      
      {/* play/pause button */}
      <button 
        className={`btn-play ${isPlaying ? 'playing' : ''}`}
        onClick={handleToggle}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          color: '#fff',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      {/* waveform visualizer */}
      <canvas 
        ref={visualizerCanvasRef} 
        width={140} 
        height={32} 
        className="wave-canvas"
      />

      {/* current time / total duration */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '55px', textAlign: 'center' }}>
        {displayCurrentTime} / {displayDuration}
      </div>

      {/* volume slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>🔊</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ 
            width: '60px', 
            accentColor: 'var(--accent-primary)', 
            height: '4px',
            cursor: 'pointer'
          }}
        />
      </div>

    </div>
  );
}

export default MusicPlayer;
