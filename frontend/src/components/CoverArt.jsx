import React, { useState } from 'react';

const TYPO_STYLES = {
  classic: {
    wrapAlign: 'flex-end',
    overlayStyle: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '10px 14px 12px',
      background: 'linear-gradient(to top, rgba(4, 4, 12, 0.92) 60%, transparent)',
    },
    titleStyle: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 800,
      fontSize: '1.05rem',
      color: '#fff',
      letterSpacing: '0.01em',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
      marginBottom: '3px',
      lineHeight: 1.2,
    },
    artistStyle: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '0.72rem',
      color: 'rgba(255, 255, 255, 0.72)',
      letterSpacing: '0.04em',
    },
  },
  minimal: {
    wrapAlign: 'center',
    overlayStyle: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 16px 22px',
      background: 'linear-gradient(to top, rgba(0, 0, 0, 0.65) 40%, transparent)',
    },
    titleStyle: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontStyle: 'italic',
      fontSize: '1.25rem',
      color: '#fff',
      textAlign: 'center',
      textShadow: '0 3px 12px rgba(0, 0, 0, 0.85)',
      marginBottom: '4px',
      lineHeight: 1.2,
    },
    artistStyle: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 400,
      fontStyle: 'italic',
      fontSize: '0.72rem',
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      letterSpacing: '0.08em',
    },
  },
  neon: {
    wrapAlign: 'flex-start',
    overlayStyle: {
      position: 'absolute',
      top: 12,
      right: 12,
      left: 12,
      padding: '8px 12px',
      background: 'rgba(8, 8, 20, 0.72)',
      border: '1px solid rgba(100, 200, 255, 0.5)',
      boxShadow: '0 0 12px rgba(100, 200, 255, 0.25), inset 0 0 8px rgba(100, 200, 255, 0.06)',
      backdropFilter: 'blur(2px)',
    },
    titleStyle: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 700,
      fontSize: '0.82rem',
      color: '#e0f4ff',
      letterSpacing: '0.05em',
      textShadow: '0 0 8px rgba(100, 200, 255, 0.8)',
      marginBottom: '3px',
      lineHeight: 1.25,
      textTransform: 'uppercase',
    },
    artistStyle: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 400,
      fontSize: '0.62rem',
      color: 'rgba(100, 200, 255, 0.75)',
      letterSpacing: '0.08em',
      textShadow: '0 0 6px rgba(100, 200, 255, 0.6)',
    },
  },
  handwritten: {
    wrapAlign: 'flex-end',
    overlayStyle: {
      position: 'absolute',
      bottom: 14,
      right: 14,
      textAlign: 'right',
      padding: '6px 10px',
      background: 'rgba(0, 0, 0, 0.38)',
      backdropFilter: 'blur(3px)',
      borderRadius: '4px',
      transform: 'rotate(-1.5deg)',
    },
    titleStyle: {
      fontFamily: '"Pacifico", cursive',
      fontWeight: 400,
      fontSize: '1.1rem',
      color: '#fff',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
      lineHeight: 1.2,
      marginBottom: '2px',
    },
    artistStyle: {
      fontFamily: '"Pacifico", cursive',
      fontWeight: 400,
      fontSize: '0.65rem',
      color: 'rgba(255, 255, 220, 0.85)',
      textShadow: '0 1px 6px rgba(0, 0, 0, 0.7)',
    },
  },
  bold: {
    wrapAlign: 'flex-start',
    overlayStyle: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    titleStyle: {
      fontFamily: '"Syne", "Impact", sans-serif',
      fontWeight: 800,
      fontSize: '1.15rem',
      color: '#000',
      background: '#fff',
      padding: '6px 14px 5px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      lineHeight: 1.15,
      display: 'inline-block',
      marginBottom: '3px',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    artistStyle: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 600,
      fontSize: '0.68rem',
      color: '#fff',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '3px 14px',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      display: 'inline-block',
    },
  },
};

function getPicsumUrl(seed, size = 400) {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function CoverArt({ title, artist, coverMeta, size = 0 }) {
  const [imgError, setImgError] = useState(false);

  if (!coverMeta) {
    const fallbackStyle = size
      ? { width: size, height: size, background: '#1a1a2e', borderRadius: 12, flexShrink: 0 }
      : { width: '100%', height: '100%', background: '#1a1a2e' };
    return <div style={fallbackStyle} />;
  }

  const { seed = 1, hue1 = 200, typographyStyle = 'classic', picsumSeed } = coverMeta;
  const typo = TYPO_STYLES[typographyStyle] || TYPO_STYLES.classic;
  const photoSeed = picsumSeed ?? (Math.abs(seed % 999) + 1);
  const imgUrl = getPicsumUrl(photoSeed);
  
  const fallbackBg = `linear-gradient(135deg, hsl(${hue1}, 60%, 25%), hsl(${(hue1 + 120) % 360}, 65%, 15%))`;

  const containerStyle = size
    ? {
        width: size,
        height: size,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        border: '1px solid var(--border-color)',
        flexShrink: 0,
        position: 'relative',
        background: fallbackBg,
      }
    : {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'absolute',
        inset: 0,
        background: fallbackBg,
      };

  const clampText = (text, limit) => {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  };

  return (
    <div style={containerStyle}>
      {!imgError ? (
        <img
          src={imgUrl}
          alt={title || 'Cover Art'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            position: 'absolute',
            inset: 0,
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: fallbackBg }} />
      )}

      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={typo.overlayStyle}>
          <div style={typo.titleStyle}>
            {clampText(title || 'Untitled', 28)}
          </div>
          <div style={typo.artistStyle}>
            {clampText(artist || 'Unknown', 30)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoverArt;
