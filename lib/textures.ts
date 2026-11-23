'use client';

import * as THREE from 'three';

/**
 * Procedural textures drawn on 2D canvases: zero downloads, crisp at any DPR,
 * and they use the exact web fonts loaded by next/font.
 */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finish(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Resolves the real family name next/font assigned (e.g. "'Cormorant Garamond', ..."). */
export function fontFamily(cssVar: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return v || fallback;
}

/** Cotton-paper grain: soft mottling + fibres. Returned as colour map and matching bump map. */
export function paperTextures(base = '#f3eef7', size = 1024, seed = 7) {
  const r = rand(seed);
  const [c, ctx] = canvas(size, size);
  const [b, bx] = canvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  bx.fillStyle = '#808080';
  bx.fillRect(0, 0, size, size);

  // mottling
  for (let i = 0; i < 420; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 10 + r() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.008 + r() * 0.01;
    const dark = r() > 0.5;
    g.addColorStop(0, dark ? `rgba(90,70,120,${a})` : `rgba(255,255,255,${a * 1.4})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // fibres
  for (let i = 0; i < 2600; i++) {
    const x = r() * size;
    const y = r() * size;
    const len = 4 + r() * 22;
    const ang = r() * Math.PI * 2;
    const light = r() > 0.4;
    ctx.strokeStyle = light ? `rgba(255,255,255,${0.12 + r() * 0.18})` : `rgba(110,90,140,${0.05 + r() * 0.07})`;
    bx.strokeStyle = light ? `rgba(255,255,255,${0.25 + r() * 0.3})` : `rgba(0,0,0,${0.2 + r() * 0.25})`;
    ctx.lineWidth = bx.lineWidth = 0.6 + r() * 0.8;
    for (const k of [ctx, bx]) {
      k.beginPath();
      k.moveTo(x, y);
      k.quadraticCurveTo(
        x + Math.cos(ang + 0.6) * len * 0.5,
        y + Math.sin(ang + 0.6) * len * 0.5,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len,
      );
      k.stroke();
    }
  }
  // fine tooth
  const id = bx.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (r() - 0.5) * 38;
    id.data[i] += n;
    id.data[i + 1] += n;
    id.data[i + 2] += n;
  }
  bx.putImageData(id, 0, 0);

  return { map: finish(c, true, true), bump: finish(b, false, true) };
}

/** Envelope liner: deep violet with a fine constellation pattern and a hairline border. */
export function linerTexture(w = 1024, h = 680) {
  const r = rand(21);
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a1250');
  g.addColorStop(0.5, '#1a0b2e');
  g.addColorStop(1, '#341664');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // tiny stars
  for (let i = 0; i < 520; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = r();
    ctx.fillStyle = s > 0.92 ? 'rgba(244,182,210,0.9)' : `rgba(228,218,255,${0.25 + r() * 0.6})`;
    if (s > 0.96) {
      drawSparkle(ctx, x, y, 4 + r() * 5);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + r() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // constellation lines
  ctx.strokeStyle = 'rgba(201,182,255,0.22)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    let x = r() * w;
    let y = r() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (r() - 0.5) * 140;
      y += (r() - 0.5) * 140;
      ctx.lineTo(x, y);
      ctx.fillStyle = 'rgba(228,218,255,0.8)';
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.stroke();
  }
  return finish(c);
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/** Envelope pocket face: paper with the bottom-flap crease and soft fold shading. */
export function pocketTexture(paper: HTMLCanvasElement | null, w = 1024, h = 680, vY = 0.5) {
  const [c, ctx] = canvas(w, h);
  if (paper) {
    ctx.drawImage(paper, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#f3eef7';
    ctx.fillRect(0, 0, w, h);
  }
  // bottom flap (triangle from bottom corners to centre point slightly below V)
  const tipY = h * (1 - 0.48);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w / 2, tipY);
  ctx.lineTo(w, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, tipY, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.20)');
  g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // crease shadows along bottom flap edges
  ctx.lineCap = 'round';
  for (const [x0, x1] of [
    [0, w / 2],
    [w, w / 2],
  ]) {
    ctx.strokeStyle = 'rgba(70,50,110,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x1, tipY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, h - 3);
    ctx.lineTo(x1, tipY - 3);
    ctx.stroke();
  }
  // side flap shading near the V
  const sg = ctx.createLinearGradient(0, 0, 0, h * vY);
  sg.addColorStop(0, 'rgba(60,40,100,0.10)');
  sg.addColorStop(1, 'rgba(60,40,100,0.0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h * vY);
  return finish(c);
}

export interface LetterContent {
  salutation: string;
  lines: readonly string[];
  signature: string;
}

/** The letter itself (all three panels on one tall canvas). */
export function letterTexture(content: LetterContent, w = 1024, h = 1772) {
  const [c, ctx] = canvas(w, h);
  const paper = paperTextures('#f7f2ea', 1024, 3);
  ctx.drawImage(paper.map.image as HTMLCanvasElement, 0, 0, w, h);
  paper.map.dispose();
  paper.bump.dispose();

  // warm vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  vg.addColorStop(0, 'rgba(255,255,255,0)');
  vg.addColorStop(1, 'rgba(160,130,190,0.16)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // hairline border
  ctx.strokeStyle = 'rgba(91,42,158,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, w - 92, h - 92);
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 58, w - 116, h - 116);

  const serif = fontFamily('--font-cormorant-src', 'Georgia, serif');
  const grot = fontFamily('--font-grotesk-src', 'system-ui, sans-serif');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#5b2a9e';
  ctx.font = `400 46px ${serif}`;
  ctx.fillText('✦', w / 2, 200);

  ctx.fillStyle = '#2a1848';
  ctx.font = `italic 400 74px ${serif}`;
  ctx.fillText(content.salutation, w / 2, 400);

  ctx.font = `italic 300 60px ${serif}`;
  let y = 560;
  for (const line of content.lines) {
    if (line) ctx.fillText(line, w / 2, y);
    y += line ? 84 : 56;
  }

  ctx.fillStyle = '#5b2a9e';
  ctx.fillRect(w / 2 - 40, y + 50, 80, 1.5);
  ctx.font = `500 22px ${grot}`;
  ctx.fillStyle = 'rgba(42,24,72,0.75)';
  ctx.letterSpacing = '6px';
  ctx.fillText(content.signature.toUpperCase(), w / 2, y + 120);
  ctx.letterSpacing = '0px';

  return finish(c);
}

/** Embossed seal height map: ring, beaded edge and a centred glyph. */
export function sealEmbossTexture(glyph: string, size = 512) {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cx, size * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * size * 0.45, cx + Math.sin(a) * size * 0.45, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const serif = fontFamily('--font-bodoni-src', 'Georgia, serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${size * 0.42}px ${serif}`;
  ctx.fillText(glyph, cx, cx + size * 0.02);
  const t = finish(c, false);
  // soften
  const [s, sx] = canvas(size, size);
  sx.filter = 'blur(3px)';
  sx.drawImage(c, 0, 0);
  t.image = s;
  t.needsUpdate = true;
  return t;
}

/** Soft radial glow sprite. */
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(201,182,255,0)', size = 256) {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, 'rgba(228,218,255,0.55)');
  g.addColorStop(0.6, 'rgba(201,182,255,0.12)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finish(c);
}

/** Rasterises text and returns normalised point positions sampled from its glyph coverage. */
export function sampleTextPoints(text: string, cssFontVar: string, opts: { weight?: string; maxPoints?: number } = {}) {
  const { weight = '400', maxPoints = 9000 } = opts;
  const family = fontFamily(cssFontVar, 'Georgia, serif');
  const fontPx = 200;
  const [, mx] = canvas(10, 10);
  mx.font = `${weight} ${fontPx}px ${family}`;
  const width = Math.ceil(mx.measureText(text).width) + 40;
  const height = Math.ceil(fontPx * 1.35);
  const [, ctx] = canvas(width, height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${fontPx}px ${family}`;
  ctx.fillText(text, 20, height / 2);
  // thicken hairlines (Bodoni!) so thin strokes survive sampling
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = fontPx * 0.022;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 20, height / 2);
  const data = ctx.getImageData(0, 0, width, height).data;

  const candidates: number[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 90) candidates.push(x, y);
    }
  }
  const total = candidates.length / 2;
  const step = Math.max(1, total / maxPoints);
  const pts: number[] = [];
  for (let i = 0; i < total; i += step) {
    const k = Math.floor(i) * 2;
    // centre and normalise by height so aspect is preserved
    pts.push((candidates[k] - width / 2) / height, -(candidates[k + 1] - height / 2) / height);
  }
  return { points: new Float32Array(pts), aspect: width / height };
}
