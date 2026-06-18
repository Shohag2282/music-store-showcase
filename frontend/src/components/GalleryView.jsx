import React, { useState, useEffect, useRef, useMemo } from 'react';
import CoverArt from './CoverArt';
import MusicPlayer from './MusicPlayer';
import API_BASE from '../api';

// helper: converts a string to a stable integer hash
function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// scrambles a number for better randomness distribution
function scramble(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// simple deterministic random number generator
function createRng(seed) {
  let h = Math.abs(seed) % 2147483647 || 1;
  return () => { h = (h * 16807) % 2147483647; return (h - 1) / 2147483646; };
}

// calculates per-song likes based on seed and index
function calcLikes(songIndex, seed, likes) {
  const ns = hashStringToInt(String(seed));
  const lSeed = scramble((ns ^ songIndex) & 0x7fffffff) || 1;
  const rng = createRng(lSeed);
  const base = Math.floor(likes);
  return base + (rng() < (likes - base) ? 1 : 0);
}

// modal that shows full song details with lyrics and player
function GalleryModal({ song, onClose }) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lyricsRef = useRef(null);

  const lines = useMemo(
    () => (song.lyrics ? song.lyrics.split('\n').filter(l => l.trim()) : []),
    [song.lyrics]
  );
  const activeLine = playing ? Math.floor(progress * lines.length) : -1;

  // scroll the active lyric line into view while playing
  useEffect(() => {
    if (lyricsRef.current && activeLine >= 0) {
      const el = lyricsRef.current.children[activeLine];
      if (el) lyricsRef.current.scrollTo({ top: el.offsetTop - 50, behavior: 'smooth' });
    }
  }, [activeLine]);

  // close modal on Escape key
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-body">
          {/* cover art on the left */}
          <CoverArt
            title={song.title}
            artist={song.artist}
            coverMeta={song.coverMeta}
            size={220}
          />

          {/* song details + player in the middle */}
          <div className="modal-details">
            <h2 className="modal-title">{song.title}</h2>
            <p className="modal-artist">{song.artist}</p>
            <div className="modal-badges">
              <span className="genre-badge">{song.album}</span>
              <span className="genre-badge">{song.genre}</span>
              <span className="modal-likes">❤ {song.likes}</span>
            </div>

            <MusicPlayer
              audioMeta={song.audioMeta}
              onProgress={setProgress}
              onPlayingChange={setPlaying}
            />

            <div className="modal-review">
              <div className="modal-review-label">Review</div>
              <p className="review-text">"{song.review?.text}"</p>
              <div className="review-stars">
                {'★'.repeat(song.review?.rating || 4)}
                {'☆'.repeat(5 - (song.review?.rating || 4))}
              </div>
            </div>
          </div>

          {/* lyrics panel on the right */}
          {lines.length > 0 && (
            <div className="lyrics-container">
              <div className="lyrics-title">Lyrics</div>
              <div className="lyrics-body" ref={lyricsRef}>
                {lines.map((line, i) => {
                  const active = playing && i === activeLine;
                  return (
                    <div key={i} style={{
                      padding: '3px 0',
                      color: active ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                      fontWeight: active ? '700' : '400',
                      opacity: active ? 1 : (playing ? 0.4 : 0.8),
                      transition: 'all 0.2s ease',
                    }}>{line}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// single gallery card with inline play button
function GalleryCard({ song, onOpen }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef  = useRef(null);
  const srcsRef = useRef([]);

  // stop audio when component unmounts
  useEffect(() => () => stopAudio(), []);

  function stopAudio() {
    srcsRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    srcsRef.current = [];
    if (ctxRef.current) { try { ctxRef.current.close(); } catch(e) {} ctxRef.current = null; }
    setIsPlaying(false);
  }

  function togglePlay(e) {
    e.stopPropagation();
    if (isPlaying) { stopAudio(); return; }

    const { audioMeta } = song;
    if (!audioMeta) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    ctxRef.current = ctx;

    const {
      tempo = 120, rootNoteIdx = 0,
      scaleIntervals = [0,2,4,5,7,9,11],
      progression = [0,4,5,3],
      melodyInstrument = 'sine',
      melodyNotes = [],
      numBars = 4, timeSignature = 4,
    } = audioMeta;

    const beat = 60 / tempo;
    const bar  = timeSignature * beat;
    const base = 60 + rootNoteIdx;
    const srcs = [];

    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);

    // play chord pads for each bar
    for (let b = 0; b < numBars; b++) {
      const deg = progression[b % progression.length];
      const t = b * bar, d = bar * 0.92;
      [0,2,4].forEach(off => {
        const midi = base + scaleIntervals[(deg+off) % scaleIntervals.length] - 12;
        const freq = 440 * Math.pow(2, (midi-69)/12);
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
        osc.connect(g); g.connect(master);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
        srcs.push(osc);
      });
    }

    // play melody notes on top
    let mb = 0;
    melodyNotes.slice(0, 20).forEach(note => {
      if (mb >= numBars * timeSignature) return;
      const t = mb * beat, d = note.duration * beat * 0.9;
      const midi = base + scaleIntervals[note.degree % scaleIntervals.length] + note.octave * 12;
      const freq = 440 * Math.pow(2, (midi-69)/12);
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = melodyInstrument; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08 * (note.velocity||0.7), ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
      osc.connect(g); g.connect(master);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + d);
      srcs.push(osc);
      mb += note.duration;
    });

    srcsRef.current = srcs;
    setIsPlaying(true);

    // stop automatically when playback ends
    const total = numBars * timeSignature * beat;
    setTimeout(() => { if (ctxRef.current === ctx) stopAudio(); }, (total + 0.5) * 1000);
  }

  return (
    <div className="gallery-card" onClick={() => onOpen(song)}>
      {/* cover art with index badge */}
      <div className="gallery-cover">
        <span className="gallery-card-index">#{song.index}</span>
        <CoverArt title={song.title} artist={song.artist} coverMeta={song.coverMeta} size={0} />
      </div>

      {/* card info and play button */}
      <div className="gallery-card-body">
        <div className="gallery-card-header">
          <div className="gallery-card-title" title={song.title}>{song.title}</div>
          <div className="gallery-likes-badge">❤ {song.likes}</div>
        </div>
        <div className="gallery-card-artist" title={song.artist}>{song.artist}</div>
        <div className="gallery-card-album" title={song.album}>{song.album}</div>
        <div className="gallery-card-footer">
          <span className="genre-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>{song.genre}</span>
          <button
            className={`btn-gallery-play ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
          >
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>
        </div>
      </div>
    </div>
  );
}

// main gallery view with infinite scroll
function GalleryView({ locale, seed, likes, isSidebar = false }) {
  const [baseSongs, setBaseSongs] = useState([]);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  // likes are recalculated client-side so no extra network call needed
  const songs = useMemo(
    () => baseSongs.map(s => ({ ...s, likes: calcLikes(s.index, seed, likes) })),
    [baseSongs, seed, likes]
  );

  // reset everything when locale or seed changes
  useEffect(() => {
    setBaseSongs([]);
    setPage(1);
    setSelected(null);
    fetchingRef.current = false;
  }, [locale, seed]);

  // fetch one page of songs (likes=0 because client computes them)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);
      try {
        const url = `${API_BASE}/api/songs?locale=${locale}&seed=${seed}&page=${page}&likes=0`;
        const res = await fetch(url);
        if (res.ok && alive) {
          const data = await res.json();
          setBaseSongs(prev => {
            const seen = new Set(prev.map(s => s.index));
            const fresh = data.filter(s => !seen.has(s.index));
            return page === 1 ? data : [...prev, ...fresh];
          });
        }
      } catch (err) {
        console.error('Gallery fetch:', err);
      } finally {
        if (alive) { setLoading(false); fetchingRef.current = false; }
      }
    };
    load();
    return () => { alive = false; };
  }, [locale, seed, page]);

  // load more when the sentinel div scrolls into view
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchingRef.current && baseSongs.length >= 10) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [baseSongs.length]);

  const cols = isSidebar ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))';
  const gap  = isSidebar ? '12px' : '18px';

  // find selected song with updated likes count
  const selectedWithLikes = selected
    ? songs.find(s => s.index === selected.index) || selected
    : null;

  return (
    <div>
      {/* card grid */}
      <div className="gallery-grid" style={{ gridTemplateColumns: cols, gap }}>
        {songs.map(song => (
          <GalleryCard key={song.index} song={song} onOpen={setSelected} />
        ))}
      </div>

      {/* invisible sentinel at the bottom for infinite scroll */}
      <div ref={sentinelRef} style={{ height: '50px', marginTop: '8px' }}>
        {loading && (
          <div className="loading-more">
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
            <span>Loading more tracks…</span>
          </div>
        )}
      </div>

      {/* song detail modal */}
      {selectedWithLikes && (
        <GalleryModal
          song={selectedWithLikes}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default GalleryView;