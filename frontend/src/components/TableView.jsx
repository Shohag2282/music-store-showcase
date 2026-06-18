import React, { useState, useEffect, useRef, useMemo } from 'react';
import CoverArt from './CoverArt';
import MusicPlayer from './MusicPlayer';

// same hash helpers as the server so likes match exactly
function hashStringToInt(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function scramble(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function createRng(seed) {
  let h = Math.abs(seed) % 2147483647 || 1;
  return () => { h = (h * 16807) % 2147483647; return (h - 1) / 2147483646; };
}

function calcLikes(songIndex, seed, likes) {
  const ns = hashStringToInt(String(seed));
  const lSeed = scramble((ns ^ songIndex) & 0x7fffffff) || 1;
  const rng = createRng(lSeed);
  const base = Math.floor(likes);
  return base + (rng() < (likes - base) ? 1 : 0);
}

// table view component with pagination and expandable rows
function TableView({ locale, seed, likes }) {
  const [baseSongs, setBaseSongs]       = useState([]);
  const [currentPage, setCurrentPage]   = useState(1);
  const [loading, setLoading]           = useState(false);
  const [expandedId, setExpandedId]     = useState(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const lyricsRef = useRef(null);

  // likes are computed client-side so no extra fetch is needed
  const songs = useMemo(
    () => baseSongs.map(s => ({ ...s, likes: calcLikes(s.index, seed, likes) })),
    [baseSongs, seed, likes]
  );

  const expandedSong = songs.find(s => s.index === expandedId) || null;
  const lyricLines   = expandedSong?.lyrics
    ? expandedSong.lyrics.split('\n').filter(l => l.trim())
    : [];
  const activeLine = lyricLines.length > 0 ? Math.floor(playProgress * lyricLines.length) : -1;

  // scroll the active lyric line into view while playing
  useEffect(() => {
    if (!lyricsRef.current || activeLine < 0 || !isPlaying) return;
    const el = lyricsRef.current.children[activeLine];
    if (el) lyricsRef.current.scrollTo({ top: el.offsetTop - 50, behavior: 'smooth' });
  }, [activeLine, isPlaying]);

  // reset when locale or seed changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
    setPlayProgress(0);
    setIsPlaying(false);
  }, [locale, seed]);

  // fetch current page of songs
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const url = `http://localhost:5000/api/songs?locale=${locale}&seed=${seed}&page=${currentPage}&likes=0`;
        const res = await fetch(url);
        if (res.ok && alive) {
          const data = await res.json();
          setBaseSongs(data);
        }
      } catch (err) {
        console.error('TableView fetch error:', err);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [locale, seed, currentPage]);

  const handleRowClick = (id) => {
    setPlayProgress(0);
    setIsPlaying(false);
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="table-container">
      {loading && baseSongs.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Loading songs…</span>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Song Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Genre</th>
                <th style={{ textAlign: 'center' }}>Likes</th>
              </tr>
            </thead>
            <tbody>
              {songs.map(song => {
                const expanded = expandedId === song.index;
                return (
                  <React.Fragment key={song.index}>
                    {/* main song row */}
                    <tr
                      className={expanded ? 'expanded' : ''}
                      style={{ borderLeft: expanded ? '3px solid var(--accent-primary)' : 'none' }}
                      onClick={() => handleRowClick(song.index)}
                    >
                      <td className="song-index" style={{ paddingLeft: expanded ? '13px' : '16px' }}>
                        {song.index}
                      </td>
                      <td className="song-title" style={{ color: expanded ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
                        {song.title}
                      </td>
                      <td className="song-artist">{song.artist}</td>
                      <td className={`song-album${song.album === 'Single' ? ' single' : ''}`}>
                        {song.album}
                      </td>
                      <td><span className="genre-badge">{song.genre}</span></td>
                      <td className="likes-cell">❤️ {song.likes}</td>
                    </tr>

                    {/* expanded detail row shown when clicked */}
                    {expanded && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <div className="expanded-content">
                            <div className="expanded-inner">

                              {/* cover art */}
                              <CoverArt
                                title={song.title}
                                artist={song.artist}
                                coverMeta={song.coverMeta}
                                size={220}
                              />

                              {/* song info + player + review */}
                              <div className="expanded-details">
                                <div>
                                  <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '2px' }}>
                                    {song.title}
                                  </h3>
                                  <p style={{ color: 'var(--accent-secondary)', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>
                                    {song.artist}
                                  </p>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                    <span className="genre-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                                      {song.album}
                                    </span>
                                    <span className="genre-badge">{song.genre}</span>
                                    <span style={{ color: 'var(--pink)', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                                      ❤ {song.likes}
                                    </span>
                                  </div>
                                </div>

                                <MusicPlayer
                                  audioMeta={song.audioMeta}
                                  onProgress={setPlayProgress}
                                  onPlayingChange={setIsPlaying}
                                />

                                <div style={{ marginTop: '10px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                    Review
                                  </div>
                                  <p className="review-text">
                                    "{song.review?.text}"
                                  </p>
                                  <div className="review-stars" style={{ marginTop: '5px' }}>
                                    {'★'.repeat(song.review?.rating || 4)}
                                    {'☆'.repeat(5 - (song.review?.rating || 4))}
                                  </div>
                                </div>
                              </div>

                              {/* lyrics panel */}
                              <div className="lyrics-container">
                                <div className="lyrics-title">Lyrics (preview)</div>
                                <div className="lyrics-body" ref={lyricsRef}>
                                  {lyricLines.map((line, idx) => {
                                    const active = isPlaying && idx === activeLine;
                                    return (
                                      <div key={idx} style={{
                                        padding: '3px 0',
                                        color: active ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                                        fontWeight: active ? '800' : '400',
                                        textShadow: active ? '0 0 10px var(--accent-glow)' : 'none',
                                        opacity: active ? 1 : (isPlaying ? 0.4 : 0.8),
                                        transition: 'all 0.2s ease',
                                      }}>
                                        {line}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* pagination controls */}
          <div className="pagination">
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '34px', height: '34px', padding: 0 }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              >‹</button>

              {/* page number buttons around the current page */}
              {(() => {
                const pages = [];
                const start = Math.max(1, currentPage - 2);
                const end   = start + 4;
                if (start > 1) {
                  pages.push(<button key={1} className="btn btn-secondary" style={{ width: '34px', height: '34px', padding: 0 }} onClick={() => setCurrentPage(1)}>1</button>);
                  if (start > 2) pages.push(<span key="l" style={{ color: 'var(--text-muted)', padding: '0 2px' }}>…</span>);
                }
                for (let p = start; p <= end; p++) {
                  pages.push(
                    <button
                      key={p}
                      className={`btn ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '34px', height: '34px', padding: 0 }}
                      onClick={() => setCurrentPage(p)}
                    >{p}</button>
                  );
                }
                pages.push(<span key="r" style={{ color: 'var(--text-muted)', padding: '0 2px' }}>…</span>);
                return pages;
              })()}

              <button
                className="btn btn-secondary"
                style={{ width: '34px', height: '34px', padding: 0 }}
                onClick={() => setCurrentPage(p => p + 1)}
              >›</button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Page <strong style={{ color: 'var(--accent-secondary)' }}>{currentPage}</strong>
              &nbsp;· Showing {(currentPage - 1) * 10 + 1}–{currentPage * 10}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TableView;