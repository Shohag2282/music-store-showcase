import React, { useState, useEffect, useRef, useMemo } from 'react';
import CoverArt from './CoverArt';
import MusicPlayer from './MusicPlayer';
import API_BASE from '../api';
import { usePlayback } from '../context/PlaybackContext';

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
              song={song}
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
  const { currentSong, isPlaying, toggleSong } = usePlayback();
  const isThisSongPlaying = isPlaying && currentSong && currentSong.index === song.index;

  function handlePlayClick(e) {
    e.stopPropagation();
    toggleSong(song);
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
            className={`btn-gallery-play ${isThisSongPlaying ? 'playing' : ''}`}
            onClick={handlePlayClick}
          >
            {isThisSongPlaying ? '■ Stop' : '▶ Play'}
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
  const { stopSong } = usePlayback();

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
    stopSong();
  }, [locale, seed, stopSong]);

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