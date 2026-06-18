import React, { useEffect, useRef } from 'react';

// draws album cover art on a canvas using 8 different visual styles
function CoverArt({ title, artist, coverMeta, size = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !coverMeta) return;

    const ctx = canvas.getContext('2d');
    const W = 400, H = 400;
    canvas.width  = W;
    canvas.height = H;

    const {
      style       = 'geometric',
      hue1        = 200,
      hue2        = 260,
      hue3        = 320,
      saturation  = 70,
      lightness   = 40,
      gradientAngle = 135,
      patternDensity = 6,
      shapes      = [],
    } = coverMeta;

    const hsl  = (h, s = saturation, l = lightness, a = 1) =>
      `hsla(${h % 360},${s}%,${l}%,${a})`;

    // background gradient
    const rad = (gradientAngle * Math.PI) / 180;
    const gx2 = W * Math.abs(Math.cos(rad));
    const gy2 = H * Math.abs(Math.sin(rad));
    const bg = ctx.createLinearGradient(0, 0, gx2, gy2);
    bg.addColorStop(0,   hsl(hue1, saturation, lightness - 5));
    bg.addColorStop(0.5, hsl(hue2, saturation, lightness + 5));
    bg.addColorStop(1,   hsl(hue3, saturation, lightness - 10));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (style === 'vinyl') {
      // dark vignette around the edges
      const vig = ctx.createRadialGradient(W/2, H/2, 60, W/2, H/2, W*0.8);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // main vinyl disc
      ctx.beginPath();
      ctx.arc(W/2, H/2, 165, 0, Math.PI*2);
      ctx.fillStyle = '#0d0d12';
      ctx.fill();

      // groove rings on the disc
      for (let r = 55; r < 155; r += 7) {
        ctx.beginPath();
        ctx.arc(W/2, H/2, r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255,255,255,${0.04 + (r % 14 === 0 ? 0.04 : 0)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // shiny reflection arc
      ctx.beginPath();
      ctx.arc(W/2 - 20, H/2 - 20, 140, -Math.PI*0.75, -Math.PI*0.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 18;
      ctx.stroke();

      // center label with gradient
      const labelG = ctx.createRadialGradient(W/2, H/2, 4, W/2, H/2, 52);
      labelG.addColorStop(0, hsl(hue1, 85, 65));
      labelG.addColorStop(1, hsl(hue2, 85, 40));
      ctx.beginPath();
      ctx.arc(W/2, H/2, 52, 0, Math.PI*2);
      ctx.fillStyle = labelG;
      ctx.fill();

      // spindle hole in the middle
      ctx.beginPath();
      ctx.arc(W/2, H/2, 8, 0, Math.PI*2);
      ctx.fillStyle = '#070710';
      ctx.fill();

    } else if (style === 'geometric') {
      // triangles, diamonds, and rectangles scattered around
      const n = patternDensity + 4;
      for (let i = 0; i < n; i++) {
        const x   = (shapes[i]?.x ?? (i / n)) * W;
        const y   = (shapes[i]?.y ?? ((i * 0.618) % 1)) * H;
        const sz  = 40 + (shapes[i]?.size ?? 0.2) * 160;
        const rot = (shapes[i]?.rotation ?? (i * 0.8)) ;
        const op  = 0.12 + (shapes[i]?.opacity ?? 0.3) * 0.35;
        const hOff= (shapes[i]?.hueOffset ?? i * 18) ;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = hsl(hue1 + hOff, saturation + 15, lightness + 20, op);
        ctx.strokeStyle = hsl(hue2 + hOff, saturation, lightness + 30, op * 1.5);
        ctx.lineWidth = 2;

        if (i % 3 === 0) {
          // triangle
          ctx.beginPath();
          ctx.moveTo(0, -sz/2);
          ctx.lineTo(sz/2, sz/2);
          ctx.lineTo(-sz/2, sz/2);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        } else if (i % 3 === 1) {
          // diamond
          ctx.beginPath();
          ctx.moveTo(0, -sz/2);
          ctx.lineTo(sz/2, 0);
          ctx.lineTo(0, sz/2);
          ctx.lineTo(-sz/2, 0);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        } else {
          // rectangle
          ctx.fillRect(-sz/2, -sz/3, sz, sz*0.66);
          ctx.strokeRect(-sz/2, -sz/3, sz, sz*0.66);
        }
        ctx.restore();
      }

      // faint grid lines overlay
      ctx.strokeStyle = `rgba(255,255,255,0.05)`;
      ctx.lineWidth = 1;
      for (let g = 0; g < W; g += W / patternDensity) {
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke();
      }

    } else if (style === 'waves') {
      // layered sine waves with glow effect
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, W, H);

      const layers = patternDensity + 2;
      for (let w = 0; w < layers; w++) {
        const amp  = 30 + w * 15;
        const freq = 0.012 + w * 0.003;
        const yOff = H * 0.2 + w * (H / (layers + 1));
        const op   = 0.5 - w * 0.04;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const y = yOff + Math.sin(x * freq + w * 1.2) * amp
                         + Math.cos(x * freq * 0.5 + w) * amp * 0.4;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const wg = ctx.createLinearGradient(0, yOff - amp, 0, yOff + amp + 20);
        wg.addColorStop(0, hsl(hue1 + w * 22, saturation + 10, lightness + 20, op));
        wg.addColorStop(1, hsl(hue2 + w * 18, saturation, lightness, op * 0.3));
        ctx.fillStyle = wg;
        ctx.fill();

        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const y = yOff + Math.sin(x * freq + w * 1.2) * amp
                         + Math.cos(x * freq * 0.5 + w) * amp * 0.4;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hsl(hue3 + w * 15, 90, 70, 0.35);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

    } else if (style === 'mosaic') {
      // brick-style mosaic tiles
      const cols = patternDensity + 2;
      const rows = patternDensity + 2;
      const tw = W / cols, th = H / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hOff = (r * 19 + c * 37) % 80 - 40;
          const lOff = (r * 7  + c * 13) % 30 - 15;
          const offset = r % 2 === 0 ? 0 : tw / 2;
          const x = c * tw - (offset > 0 && c === cols - 1 ? tw/2 : 0) + offset;
          ctx.fillStyle = hsl(hue1 + hOff, saturation + 10, lightness + lOff, 0.9);
          ctx.fillRect(x + 1, r * th + 1, tw - 2, th - 2);

          // subtle highlight on top edge
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x + 1, r * th + 1, tw - 2, 3);
        }
      }
      // vignette on top
      const v = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

    } else if (style === 'starburst') {
      // rays shooting out from center with glow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, W, H);

      const cx = W/2, cy = H/2;
      const rays = (patternDensity + 4) * 2;

      for (let r = 0; r < rays; r++) {
        const angle1 = (r / rays) * Math.PI * 2;
        const angle2 = ((r + 0.5) / rays) * Math.PI * 2;
        const hOff = (r * 360 / rays) % 60;

        const rg = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle1) * W, cy + Math.sin(angle1) * W);
        rg.addColorStop(0, hsl(hue1 + hOff, saturation + 20, lightness + 30, 0.6));
        rg.addColorStop(1, hsl(hue2 + hOff, saturation, lightness, 0));

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle1) * W * 0.9, cy + Math.sin(angle1) * H * 0.9);
        ctx.lineTo(cx + Math.cos(angle2) * W * 0.9, cy + Math.sin(angle2) * H * 0.9);
        ctx.closePath();
        ctx.fillStyle = rg;
        ctx.fill();
      }

      // glowing circles at the center
      for (let r = 80; r > 0; r -= 15) {
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        cg.addColorStop(0, hsl(hue3, 95, 80, 0.6));
        cg.addColorStop(1, hsl(hue3, 95, 80, 0));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fillStyle = cg;
        ctx.fill();
      }

    } else if (style === 'organic') {
      // glowing blobs with flowing lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, W, H);

      const blobCount = patternDensity;
      for (let b = 0; b < blobCount; b++) {
        const bx = (shapes[b]?.x ?? (b * 0.31 + 0.15)) * W;
        const by = (shapes[b]?.y ?? (b * 0.22 + 0.2))  * H;
        const br = 50 + (shapes[b]?.size ?? 0.3) * 100;
        const hOff = b * 35;

        // glowing radial blob
        const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bg2.addColorStop(0, hsl(hue2 + hOff, 85, 65, 0.55));
        bg2.addColorStop(0.6, hsl(hue1 + hOff, 80, 50, 0.3));
        bg2.addColorStop(1, hsl(hue3 + hOff, 70, 40, 0));
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI*2);
        ctx.fillStyle = bg2;
        ctx.fill();
      }

      // organic flowing bezier lines
      for (let l = 0; l < 5; l++) {
        ctx.beginPath();
        ctx.moveTo(0, H * (0.2 + l * 0.15));
        for (let x = 0; x <= W; x += 20) {
          const cp1x = x + 30;
          const cp1y = H * (0.2 + l * 0.15) + Math.sin(x * 0.02 + l) * 60;
          const cp2x = x + 50;
          const cp2y = H * (0.2 + l * 0.15) + Math.cos(x * 0.015 + l * 2) * 60;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x + 60, H * (0.2 + l * 0.15) + Math.sin((x + 60) * 0.02 + l) * 60);
        }
        ctx.strokeStyle = hsl(hue3 + l * 20, 85, 70, 0.15);
        ctx.lineWidth = 3;
        ctx.stroke();
      }

    } else if (style === 'retro') {
      // diagonal stripes + halftone dots
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, W, H);

      const step = W / (patternDensity + 3);

      // diagonal stripe bands
      for (let s = -H; s < W + H; s += step * 2) {
        ctx.save();
        ctx.translate(s, 0);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = hsl(hue3 + s * 0.3, saturation + 10, lightness + 15, 0.25);
        ctx.fillRect(-10, -H, step * 0.9, H * 3);
        ctx.restore();
      }

      // halftone dot grid
      const dotSpacing = 18;
      for (let dy = 0; dy < H; dy += dotSpacing) {
        for (let dx = 0; dx < W; dx += dotSpacing) {
          const distToCenter = Math.hypot(dx - W/2, dy - H/2);
          const r = Math.max(1, 6 - distToCenter * 0.015);
          ctx.beginPath();
          ctx.arc(dx, dy, r, 0, Math.PI*2);
          ctx.fillStyle = hsl(hue1 + dx * 0.1, saturation, lightness + 20, 0.2);
          ctx.fill();
        }
      }

      // bold circle frame
      ctx.beginPath();
      ctx.arc(W/2, H/2, W * 0.38, 0, Math.PI*2);
      ctx.strokeStyle = hsl(hue2, saturation + 20, lightness + 30, 0.5);
      ctx.lineWidth = 6;
      ctx.stroke();

    } else if (style === 'minimal') {
      // clean swiss-style layout
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, W, H);

      // large bold circle
      const cg = ctx.createRadialGradient(W*0.45, H*0.42, 10, W*0.45, H*0.42, 110);
      cg.addColorStop(0, hsl(hue3, 90, 60, 0.9));
      cg.addColorStop(1, hsl(hue1, 85, 40, 0.7));
      ctx.beginPath();
      ctx.arc(W*0.45, H*0.42, 110, 0, Math.PI*2);
      ctx.fillStyle = cg;
      ctx.fill();

      // offset rectangle block
      ctx.fillStyle = hsl(hue2, saturation + 20, lightness + 25, 0.3);
      ctx.fillRect(W*0.15, H*0.55, W*0.65, H*0.22);

      // horizontal rule lines
      [0.25, 0.52, 0.78].forEach(frac => {
        ctx.beginPath();
        ctx.moveTo(W * 0.08, H * frac);
        ctx.lineTo(W * 0.92, H * frac);
        ctx.strokeStyle = hsl(hue1, 60, 80, 0.15);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // small accent squares in corners
      [[0.05,0.05],[0.85,0.05],[0.05,0.85],[0.85,0.85]].forEach(([fx, fy]) => {
        ctx.fillStyle = hsl(hue3, 90, 65, 0.4);
        ctx.fillRect(fx*W - 8, fy*H - 8, 16, 16);
      });
    }

    // draw extra shapes from server metadata
    shapes.slice(0, 8).forEach(s => {
      ctx.save();
      ctx.translate(s.x * W, s.y * H);
      ctx.rotate(s.rotation);
      const sc = hsl(hue1 + s.hueOffset, saturation + 10, lightness + 10, s.opacity * 0.4);
      ctx.fillStyle = sc;
      ctx.strokeStyle = sc;
      ctx.lineWidth = 1.5;
      const sp = s.size * W * 0.4;
      ctx.beginPath();
      if (s.type === 'circle')   { ctx.arc(0, 0, sp/2, 0, Math.PI*2); ctx.fill(); }
      else if (s.type === 'rect'){ ctx.fillRect(-sp/2, -sp/2, sp, sp); }
      else if (s.type === 'line'){ ctx.moveTo(-sp/2, 0); ctx.lineTo(sp/2, 0); ctx.stroke(); }
      ctx.restore();
    });

    // text overlay at the bottom
    const overlayH = 100;
    // semi-transparent dark strip
    ctx.fillStyle = 'rgba(5,5,12,0.82)';
    ctx.fillRect(0, H - overlayH, W, overlayH);

    // colored accent line at the top of the strip
    const lineG = ctx.createLinearGradient(0, 0, W, 0);
    lineG.addColorStop(0, hsl(hue1, 95, 65));
    lineG.addColorStop(1, hsl(hue2, 95, 65));
    ctx.fillStyle = lineG;
    ctx.fillRect(0, H - overlayH, W, 3);

    // song title
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let t = title || 'Untitled';
    while (ctx.measureText(t).width > W - 36 && t.length > 1) t = t.slice(0, -1);
    if (t !== title) t += '…';
    ctx.fillText(t, 20, H - overlayH + 16);

    // artist name
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillStyle = hsl(hue2, 90, 75);
    let a = artist || 'Unknown';
    while (ctx.measureText(a).width > W - 36 && a.length > 1) a = a.slice(0, -1);
    if (a !== artist) a += '…';
    ctx.fillText(a, 20, H - overlayH + 46);

    // small decorative dot on the right
    ctx.beginPath();
    ctx.arc(W - 24, H - overlayH + 34, 12, 0, Math.PI*2);
    ctx.fillStyle = hsl(hue1, 90, 65, 0.7);
    ctx.fill();

  }, [title, artist, coverMeta]);

  const wrapStyle = size
    ? { width: `${size}px`, height: `${size}px`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', flexShrink: 0, backgroundColor: 'var(--bg-card)' }
    : { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-card)' };

  return (
    <div style={wrapStyle}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export default CoverArt;
