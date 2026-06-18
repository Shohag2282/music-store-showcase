import React, { useState, useEffect, useRef } from 'react';

function MusicPlayer({ audioMeta, onProgress, onPlayingChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [currentTimeText, setCurrentTimeText] = useState('0:00');
  const [durationText, setDurationText] = useState('0:30');

  const audioCtxRef = useRef(null);
  const volumeGainNodeRef = useRef(null);
  const activeSourcesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const visualizerCanvasRef = useRef(null);

  // sync volume to gain node when slider changes
  useEffect(() => {
    if (volumeGainNodeRef.current && audioCtxRef.current) {
      volumeGainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // clean up when component unmounts
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const {
    tempo = 120,
    rootNoteIdx = 0,
    scaleIntervals = [0, 2, 4, 5, 7, 9, 11],
    progression = [0, 4, 5, 3],
    melodyInstrument = 'sine',
    bassInstrument = 'triangle',
    padInstrument = 'sine',
    melodyNotes = [],
    bassNotes = [],
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

  const startPlayback = () => {
    stopPlayback();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    startTimeRef.current = ctx.currentTime;

    // master volume node
    const volGain = ctx.createGain();
    volGain.gain.setValueAtTime(volume, ctx.currentTime);
    volGain.connect(ctx.destination);
    volumeGainNodeRef.current = volGain;

    const baseMidi = 60 + rootNoteIdx;
    const activeSources = [];

    // track 1: chord pads
    const barDuration = timeSignature * beatDuration;
    for (let bar = 0; bar < numBars; bar++) {
      const chordDeg = progression[bar % progression.length];
      const chordStartTime = bar * barDuration;
      const chordDuration = barDuration * 0.95;

      const rootMidi = baseMidi + scaleIntervals[chordDeg % scaleIntervals.length] - 12;
      const thirdMidi = baseMidi + scaleIntervals[(chordDeg + 2) % scaleIntervals.length];
      const fifthMidi = baseMidi + scaleIntervals[(chordDeg + 4) % scaleIntervals.length];

      [rootMidi, thirdMidi, fifthMidi].forEach((midiNote) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        osc.type = padInstrument;
        osc.frequency.value = freq;

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + chordStartTime + 0.4);
        gainNode.gain.setValueAtTime(0.04, ctx.currentTime + chordStartTime + chordDuration - 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + chordStartTime + chordDuration);

        osc.connect(gainNode);
        gainNode.connect(volGain);

        osc.start(ctx.currentTime + chordStartTime);
        osc.stop(ctx.currentTime + chordStartTime + chordDuration);
        activeSources.push(osc);
      });
    }

    // track 2: bass line
    let currentBassBeat = 0;
    bassNotes.forEach((note) => {
      if (currentBassBeat >= totalBeats) return;

      const startTime = currentBassBeat * beatDuration;
      const noteDuration = note.duration * beatDuration;

      const chordRootDeg = progression[note.chordIdx % progression.length];
      const midiNote = baseMidi + scaleIntervals[chordRootDeg % scaleIntervals.length] - 24 + (note.octave * 12);
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = bassInstrument;
      osc.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + startTime + 0.02);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime + startTime + noteDuration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + noteDuration);

      osc.connect(gainNode);
      gainNode.connect(volGain);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + noteDuration);
      activeSources.push(osc);

      currentBassBeat += note.duration;
    });

    // track 3: melody
    let currentMelodyBeat = 0;
    melodyNotes.forEach((note) => {
      if (currentMelodyBeat >= totalBeats) return;

      const startTime = currentMelodyBeat * beatDuration;
      const noteDuration = note.duration * beatDuration;

      const midiNote = baseMidi + scaleIntervals[note.degree % scaleIntervals.length] + (note.octave * 12);
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      if (melodyInstrument === 'sawtooth' || melodyInstrument === 'square') {
        filter.type = 'lowpass';
        filter.frequency.value = 1100;
      } else {
        filter.type = 'allpass';
      }

      osc.type = melodyInstrument;
      osc.frequency.value = freq;

      const vol = 0.07 * (note.velocity || 1.0);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.02);
      gainNode.gain.setValueAtTime(vol, ctx.currentTime + startTime + noteDuration - 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + noteDuration);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(volGain);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + noteDuration);
      activeSources.push(osc);

      currentMelodyBeat += note.duration;
    });

    activeSourcesRef.current = activeSources;
    setIsPlaying(true);
    if (onPlayingChange) onPlayingChange(true);
    setDurationText(formatTime(totalDuration));

    const updateProgress = () => {
      if (!ctx || ctx.state === 'closed') return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const ratio = elapsed / totalDuration;

      if (ratio >= 1.0) {
        startPlayback(); // loop back to start
      } else {
        setProgress(ratio);
        if (onProgress) onProgress(ratio);
        setCurrentTimeText(formatTime(elapsed));
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const stopPlayback = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    activeSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    if (onPlayingChange) onPlayingChange(false);
    setProgress(0);
    if (onProgress) onProgress(0);
    setCurrentTimeText('0:00');
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
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
        onClick={togglePlay}
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
        {currentTimeText} / {durationText}
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
