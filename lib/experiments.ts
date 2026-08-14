import { fbm, hash2, noise2, rng } from './noise';

export type SketchArgs = {
  ctx: CanvasRenderingContext2D;
  t: number;
  w: number;
  h: number;
  /** Pointer position within the tile, 0–1. */
  px: number;
  py: number;
  /** Hover energy, 0–1, eased by the host component. */
  energy: number;
  /** Increments on click — regenerates seeded compositions. */
  seed: number;
  fonts: { display: string; mono: string };
};

export type Sketch = (a: SketchArgs) => void;

const INK = '#0a0a0a';
const PAPER = '#f1f1ed';
const RED = '#ff2a1a';

const clear = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
};

/* ==========================================================================
   E01 — ASCII SOLID
   A torus lit by a fixed source, resolved through a character ramp and a
   depth buffer. Rotation follows the pointer.
   ========================================================================== */

const ASCII_RAMP = '.,-~:;=!*#$@';

export const asciiSolid: Sketch = ({ ctx, t, w, h, px, py, energy, fonts }) => {
  clear(ctx, w, h);

  const cell = Math.max(8, Math.min(13, w / 46));
  ctx.font = `${cell}px ${fonts.mono}`;
  // Derive the column step from the font's real advance so whole rows can be
  // drawn as single strings and still land on the grid.
  const adv = ctx.measureText('M').width || cell * 0.6;
  const cols = Math.floor(w / adv);
  const rows = Math.floor(h / cell);
  if (cols < 4 || rows < 4) return;

  const depth = new Float32Array(cols * rows);
  const chars = new Uint8Array(cols * rows);

  const spin = t / 2600 + (px - 0.5) * 2.4;
  const tilt = t / 4100 + (py - 0.5) * 1.8;
  const cA = Math.cos(spin);
  const sA = Math.sin(spin);
  const cB = Math.cos(tilt);
  const sB = Math.sin(tilt);

  const R1 = 1;
  const R2 = 2 + energy * 0.35;
  const K2 = 5;
  const K1 = (cols * K2 * 0.32) / (R1 + R2);

  for (let th = 0; th < 6.283; th += 0.13) {
    const ct = Math.cos(th);
    const st = Math.sin(th);
    for (let ph = 0; ph < 6.283; ph += 0.035) {
      const cp = Math.cos(ph);
      const sp = Math.sin(ph);

      const circleX = R2 + R1 * ct;
      const circleY = R1 * st;

      const x = circleX * (cB * cp + sA * sB * sp) - circleY * cA * sB;
      const y = circleX * (sB * cp - sA * cB * sp) + circleY * cA * cB;
      const z = K2 + cA * circleX * sp + circleY * sA;
      const ooz = 1 / z;

      const xp = Math.floor(cols / 2 + K1 * ooz * x);
      const yp = Math.floor(rows / 2 - K1 * ooz * y * 0.5);
      if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;

      const lum =
        cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
      const idx = xp + yp * cols;
      if (ooz > depth[idx]) {
        depth[idx] = ooz;
        const l = Math.max(0, Math.floor(lum * 8));
        chars[idx] = Math.min(ASCII_RAMP.length - 1, l);
      }
    }
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  /* One fillText per row instead of one per cell. The character ramp already
     carries the shading, so per-cell alpha is not needed. */
  const hot: Array<[number, number, string]> = [];
  ctx.fillStyle = PAPER;
  ctx.globalAlpha = 0.88;

  for (let y = 0; y < rows; y++) {
    let line = '';
    let ink = false;
    for (let x = 0; x < cols; x++) {
      const idx = x + y * cols;
      if (!depth[idx]) {
        line += ' ';
        continue;
      }
      const c = chars[idx];
      if (c >= ASCII_RAMP.length - 2) {
        hot.push([x, y, ASCII_RAMP[c]]);
        line += ' ';
      } else {
        line += ASCII_RAMP[c];
      }
      ink = true;
    }
    if (ink) ctx.fillText(line, 0, y * cell);
  }

  // The few brightest cells carry the accent.
  ctx.fillStyle = RED;
  ctx.globalAlpha = 1;
  for (const [x, y, ch] of hot) ctx.fillText(ch, x * adv, y * cell);
};

/* ==========================================================================
   E02 — HALFTONE FIELD
   Metaball density screened through a rotated halftone grid. The pointer is
   an extra source; clicking rotates the screen angle.
   ========================================================================== */

export const halftone: Sketch = ({ ctx, t, w, h, px, py, energy, seed }) => {
  clear(ctx, w, h);

  const angle = (seed % 4) * (Math.PI / 8) + Math.PI / 8;
  const step = Math.max(11, w / 26);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);

  const blobs = [
    [0.34 + Math.sin(t / 2400) * 0.14, 0.42 + Math.cos(t / 3100) * 0.16, 0.3],
    [0.62 + Math.cos(t / 2900) * 0.12, 0.56 + Math.sin(t / 2200) * 0.13, 0.26],
    [0.5 + Math.sin(t / 3700) * 0.2, 0.34 + Math.cos(t / 2600) * 0.1, 0.2],
  ];

  const diag = Math.hypot(w, h);
  const reach = diag * 0.6;

  for (let v = -reach; v < reach; v += step) {
    for (let u = -reach; u < reach; u += step) {
      // Sample on the rotated screen, draw in tile space.
      const x = w / 2 + u * ca - v * sa;
      const y = h / 2 + u * sa + v * ca;
      if (x < -step || x > w + step || y < -step || y > h + step) continue;

      let d = 0;
      for (const b of blobs) {
        const dx = (x / w - b[0]) * 1.0;
        const dy = (y / h - b[1]) * (h / w);
        d += (b[2] * b[2]) / (dx * dx + dy * dy + 0.004);
      }
      const dxm = x / w - px;
      const dym = (y / h - py) * (h / w);
      d += (energy * 0.06) / (dxm * dxm + dym * dym + 0.004);

      const k = Math.min(1, d / 9);
      const r = (step * 0.52) * k;
      if (r < 0.4) continue;
      // Red marks one density contour rather than filling the core, so it
      // stays an accent instead of becoming the subject.
      ctx.fillStyle = k > 0.72 && k < 0.79 ? RED : PAPER;
      ctx.globalAlpha = 0.25 + k * 0.75;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

/* ==========================================================================
   E03 — PIXEL DISPLACE
   A pixel grid sheared along rows by layered noise. Clicking flips the
   displacement axis.
   ========================================================================== */

export const pixelDisplace: Sketch = ({ ctx, t, w, h, px, py, energy, seed }) => {
  clear(ctx, w, h);

  const vertical = seed % 2 === 1;
  const cell = Math.max(8, w / 38);
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const tt = t / 3000;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = fbm(x * 0.11 + tt, y * 0.11, seed, 2);
      const dm = Math.hypot(x / cols - px, y / rows - py);
      const push = Math.max(0, 1 - dm * 2.2) * energy * cell * 5;

      const shift = (n - 0.5) * cell * 7 + push;
      const cx = x * cell + (vertical ? 0 : shift);
      const cy = y * cell + (vertical ? shift : 0);

      const size = cell * (0.3 + n * 0.72);
      if (n < 0.34) continue;

      ctx.fillStyle = n > 0.76 ? RED : PAPER;
      ctx.globalAlpha = 0.16 + n * 0.7;
      ctx.fillRect(cx, cy, size, size * (vertical ? 1 : 0.86));
    }
  }
  ctx.globalAlpha = 1;
};

/* ==========================================================================
   E04 — TYPE MODULES
   A word sampled to a coarse grid, then rebuilt out of modules that scatter
   under the cursor. Clicking changes the word.
   ========================================================================== */

const WORDS = ['1:1', 'MAKE', 'BREAK', 'TRUE'];
type Sample = { x: number; y: number };
const sampleCache = new Map<string, Sample[]>();

function sampleWord(word: string, font: string, cols: number, rows: number): Sample[] {
  const key = `${word}|${cols}x${rows}`;
  const hit = sampleCache.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const cx = c.getContext('2d', { willReadFrequently: true });
  const out: Sample[] = [];
  if (!cx) return out;

  cx.fillStyle = '#fff';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  let size = rows;
  cx.font = `700 ${size}px ${font}`;
  const measured = cx.measureText(word).width;
  if (measured > 0) {
    size = Math.min(size * ((cols * 0.86) / measured), rows * 0.82);
    cx.font = `700 ${size}px ${font}`;
  }
  cx.fillText(word, cols / 2, rows / 2);

  const data = cx.getImageData(0, 0, cols, rows).data;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (data[(y * cols + x) * 4 + 3] > 110) out.push({ x, y });
    }
  }
  sampleCache.set(key, out);
  return out;
}

export const typeModules: Sketch = ({ ctx, t, w, h, px, py, energy, seed, fonts }) => {
  clear(ctx, w, h);

  const cell = Math.max(5, w / 62);
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  if (cols < 6 || rows < 6) return;

  const word = WORDS[seed % WORDS.length];
  const pts = sampleWord(word, fonts.display, cols, rows);
  const mx = px * cols;
  const my = py * rows;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x - mx;
    const dy = p.y - my;
    const dist = Math.hypot(dx, dy);
    const radius = cols * 0.28;
    const force = Math.max(0, 1 - dist / radius) ** 2 * energy * cell * 9;

    const drift = noise2(p.x * 0.12, p.y * 0.12 + t / 2600, seed) - 0.5;
    const x = p.x * cell + (dist > 0.001 ? (dx / dist) * force : 0) + drift * cell * 1.2;
    const y = p.y * cell + (dist > 0.001 ? (dy / dist) * force : 0) + drift * cell * 1.2;

    const isRed = hash2(p.x, p.y, seed) > 0.94;
    ctx.fillStyle = isRed ? RED : PAPER;
    ctx.globalAlpha = 0.5 + drift * 0.4 + force / (cell * 12);
    const size = cell * 0.72;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
};

/* ==========================================================================
   E05 — FLOW FIELD
   Particles advected through a noise field, trailed by a low-alpha wash. The
   pointer bends the field around itself.
   ========================================================================== */

type Particle = { x: number; y: number; px: number; py: number; life: number; red: boolean };
const flowState = new WeakMap<
  CanvasRenderingContext2D,
  { parts: Particle[]; seed: number; w: number; h: number }
>();

export const flowField: Sketch = ({ ctx, t, w, h, px, py, energy, seed }) => {
  let state = flowState.get(ctx);
  const count = Math.round(Math.min(700, (w * h) / 420));

  if (!state || state.seed !== seed || state.w !== w || state.h !== h) {
    const rand = rng(seed * 7919 + 13);
    state = {
      seed,
      w,
      h,
      parts: Array.from({ length: count }, () => {
        const x = rand() * w;
        const y = rand() * h;
        return { x, y, px: x, py: y, life: rand() * 120, red: rand() > 0.95 };
      }),
    };
    flowState.set(ctx, state);
    clear(ctx, w, h);
  }

  // Trails: wash the previous frame back toward ink instead of clearing.
  ctx.fillStyle = 'rgba(10, 10, 10, 0.11)';
  ctx.fillRect(0, 0, w, h);

  const scale = 0.0032;
  const tt = t / 6000;
  const mx = px * w;
  const my = py * h;

  // Integrate first, then draw each colour as one batched path — stroking
  // every particle separately is what makes a field like this expensive.
  for (const p of state.parts) {
    const angle = fbm(p.x * scale, p.y * scale + tt, seed, 2) * Math.PI * 4;
    let vx = Math.cos(angle);
    let vy = Math.sin(angle);

    // Vortex around the cursor.
    const dx = p.x - mx;
    const dy = p.y - my;
    const d = Math.hypot(dx, dy);
    if (d < w * 0.35 && energy > 0.01) {
      const f = (1 - d / (w * 0.35)) * energy * 2.6;
      vx += (-dy / (d + 1)) * f;
      vy += (dx / (d + 1)) * f;
    }

    const speed = 1.5 + energy * 1.6;
    p.px = p.x;
    p.py = p.y;
    p.x += vx * speed;
    p.y += vy * speed;
    p.life -= 1;

    if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      // Reset the tail too, or the respawn draws a streak across the tile.
      p.px = p.x;
      p.py = p.y;
      p.life = 60 + Math.random() * 160;
    }
  }

  for (const pass of [false, true]) {
    ctx.strokeStyle = pass ? RED : PAPER;
    ctx.globalAlpha = pass ? 0.8 : 0.34;
    ctx.lineWidth = pass ? 1.3 : 1;
    ctx.beginPath();
    for (const p of state.parts) {
      if (p.red !== pass) continue;
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

/* ==========================================================================
   E06 — MODULAR POSTER
   A seeded Swiss composition on a 6-column grid. Clicking prints a new one.
   ========================================================================== */

export const modularPoster: Sketch = ({ ctx, t, w, h, energy, seed, fonts }) => {
  clear(ctx, w, h);

  const rand = rng(seed * 104729 + 7);
  const pad = w * 0.09;
  const gw = w - pad * 2;
  const gh = h - pad * 2;
  const cols = 6;
  const rows = 8;
  const cw = gw / cols;
  const ch = gh / rows;
  const breathe = 1 + Math.sin(t / 2400) * 0.012 * (1 + energy * 3);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(breathe, breathe);
  ctx.translate(-w / 2, -h / 2);

  // Construction lines.
  ctx.strokeStyle = 'rgba(241,241,237,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    ctx.moveTo(pad + c * cw, pad);
    ctx.lineTo(pad + c * cw, pad + gh);
  }
  for (let r = 0; r <= rows; r++) {
    ctx.moveTo(pad, pad + r * ch);
    ctx.lineTo(pad + gw, pad + r * ch);
  }
  ctx.stroke();

  const blocks = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < blocks; i++) {
    const c = Math.floor(rand() * cols);
    const r = Math.floor(rand() * rows);
    const cs = 1 + Math.floor(rand() * (cols - c));
    const rs = 1 + Math.floor(rand() * Math.min(3, rows - r));
    const x = pad + c * cw;
    const y = pad + r * ch;
    const bw = cs * cw;
    const bh = rs * ch;
    const kind = rand();

    if (kind < 0.22) {
      ctx.fillStyle = RED;
      ctx.fillRect(x, y, bw, bh);
    } else if (kind < 0.45) {
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, bw, bh);
    } else if (kind < 0.66) {
      ctx.fillStyle = PAPER;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x + bw / 2, y + bh / 2, Math.min(bw, bh) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (kind < 0.84) {
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const lines = 5 + Math.floor(rand() * 8);
      for (let l = 0; l < lines; l++) {
        const ly = y + (bh / lines) * l;
        ctx.moveTo(x, ly);
        ctx.lineTo(x + bw, ly);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = PAPER;
      ctx.fillRect(x, y, bw, Math.max(2, bh * 0.06));
    }
  }

  // One typographic element, set at a right angle to the composition.
  ctx.save();
  const vertical = rand() > 0.5;
  ctx.fillStyle = PAPER;
  const fs = Math.max(11, w * 0.05);
  ctx.font = `700 ${fs}px ${fonts.display}`;
  ctx.textBaseline = 'top';
  if (vertical) {
    ctx.translate(pad + cw * 0.15, pad + gh);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('1:1', 0, 0);
  } else {
    ctx.fillText('1:1', pad, pad + gh - fs * 1.1);
  }
  ctx.restore();

  ctx.restore();
};

export const SKETCHES: Sketch[] = [
  asciiSolid,
  halftone,
  pixelDisplace,
  typeModules,
  flowField,
  modularPoster,
];
