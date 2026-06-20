import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const PlaybackContext = createContext();

export function usePlayback() {
  return useContext(PlaybackContext);
}

export function PlaybackProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
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
  const totalDurationRef = useRef(30);
  // Keep a stable ref to the current playing song so callbacks don't go stale
  const currentSongRef = useRef(null);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  const stopPlayback = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    currentSongRef.current = null;
    setCurrentSong(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTimeText('0:00');
  }, []);

  // Sync volume with gain node whenever it changes
  useEffect(() => {
    if (volumeGainNodeRef.current && audioCtxRef.current) {
      volumeGainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Clean up on unmount
  useEffect(() => {
    return () => { stopPlayback(); };
  }, [stopPlayback]);

  const startPlayback = useCallback((song) => {
    // Stop any existing playback first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }

    if (!song || !song.audioMeta) return;

    const { audioMeta } = song;
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
    } = audioMeta;

    const beatDuration = 60 / tempo;
    const totalBeats = numBars * timeSignature;
    const totalDuration = totalBeats * beatDuration;
    totalDurationRef.current = totalDuration;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Resume AudioContext in case browser has suspended it (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    startTimeRef.current = ctx.currentTime;

    const volGain = ctx.createGain();
    volGain.gain.setValueAtTime(volume, ctx.currentTime);
    volGain.connect(ctx.destination);
    volumeGainNodeRef.current = volGain;

    const baseMidi = 60 + rootNoteIdx;
    const activeSources = [];

    // 1. Chord pads
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

    // 2. Bass line
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

    // 3. Melody
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
    currentSongRef.current = song;
    setCurrentSong(song);
    setIsPlaying(true);
    setDurationText(formatTime(totalDuration));

    // Progress tracking loop
    const trackingCtx = ctx;
    const trackingStart = ctx.currentTime;
    const updateProgress = () => {
      if (!trackingCtx || trackingCtx.state === 'closed') return;
      // Make sure this is still the active context (user hasn't switched songs)
      if (audioCtxRef.current !== trackingCtx) return;

      const elapsed = trackingCtx.currentTime - trackingStart;
      const ratio = elapsed / totalDuration;

      if (ratio >= 1.0) {
        // Loop: start again
        setTimeout(() => {
          if (audioCtxRef.current !== trackingCtx) return; // song changed, don't loop
          startPlayback(song);
        }, 10);
      } else {
        setProgress(ratio);
        setCurrentTimeText(formatTime(elapsed));
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [formatTime, volume]);

  const toggleSong = useCallback((song) => {
    if (!song) return;
    // Use the ref to get the current song without stale closure issues
    const playing = currentSongRef.current;
    if (playing && playing.index === song.index) {
      stopPlayback();
    } else {
      startPlayback(song);
    }
  }, [startPlayback, stopPlayback]);

  return (
    <PlaybackContext.Provider value={{
      currentSong,
      isPlaying,
      progress,
      volume,
      setVolume,
      currentTimeText,
      durationText,
      playSong: startPlayback,
      stopSong: stopPlayback,
      toggleSong,
    }}>
      {children}
    </PlaybackContext.Provider>
  );
}
