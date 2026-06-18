import React, { useState, useEffect } from 'react';

// toolbar with all the filter/config controls
function ToolBar({ locale, setLocale, seed, setSeed, likes, setLikes, viewMode, setViewMode }) {
  const [availableLocales, setAvailableLocales] = useState({ en: 'English (USA)' });
  const [localSeed, setLocalSeed] = useState(seed);
  const [copied, setCopied] = useState(false);

  // fetch supported locales from backend on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/locales')
      .then(res => res.json())
      .then(data => setAvailableLocales(data))
      .catch(() => {});
  }, []);

  // keep local seed in sync with parent when random is clicked
  useEffect(() => {
    setLocalSeed(seed);
  }, [seed]);

  // debounce seed input so we don't re-fetch on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSeed !== seed) setSeed(localSeed);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSeed, seed, setSeed]);

  const makeRandomSeed = (e) => {
    e.preventDefault();
    const r = Math.floor(Math.random() * 9999999999999999);
    setSeed(r.toString());
  };

  const copyToClipboard = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(seed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getLocaleLabel = (code) => {
    const flags = {
      en: '🇺🇸 English (USA)',
      de: '🇩🇪 German (Germany)',
      uk: '🇺🇦 Ukrainian (Ukraine)',
    };
    return flags[code] || code;
  };

  return (
    <div className="toolbar">

      {/* language/region dropdown */}
      <div className="toolbar-group">
        <label className="toolbar-label">Language / Region</label>
        <select
          className="toolbar-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {Object.entries(availableLocales).map(([code, name]) => (
            <option key={code} value={code}>{getLocaleLabel(code)}</option>
          ))}
        </select>
      </div>

      {/* seed input with copy and random buttons */}
      <div className="toolbar-group">
        <label className="toolbar-label">Seed (64-bit)</label>
        <div className="toolbar-row">
          <input
            type="text"
            className="toolbar-input"
            value={localSeed}
            onChange={(e) => setLocalSeed(e.target.value)}
            placeholder="Enter seed..."
            style={{ width: '170px' }}
          />
          <button className="btn-copy-seed" onClick={copyToClipboard} title="Copy seed">
            {copied ? '✓' : '📋'}
          </button>
          <button className="btn btn-primary" onClick={makeRandomSeed}>
            🔀 Random Seed
          </button>
        </div>
      </div>

      {/* average likes slider + number input */}
      <div className="toolbar-group">
        <label className="toolbar-label">Average Likes per Song (0–10)</label>
        <div className="toolbar-row">
          <input
            type="number"
            className="likes-number-input"
            min="0" max="10" step="0.1"
            value={likes}
            onChange={(e) => {
              let v = parseFloat(e.target.value);
              if (isNaN(v)) v = 0;
              setLikes(Math.min(10, Math.max(0, v)));
            }}
          />
          <input
            type="range"
            className="likes-slider"
            min="0" max="10" step="0.1"
            value={likes}
            onChange={(e) => setLikes(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* table / gallery toggle */}
      <div className="toolbar-group">
        <label className="toolbar-label">View Mode</label>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            ☰ Table
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
            onClick={() => setViewMode('gallery')}
          >
            ⊞ Gallery
          </button>
        </div>
      </div>

    </div>
  );
}

export default ToolBar;