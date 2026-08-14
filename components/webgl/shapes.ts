/**
 * Target position sets for the hero point cloud.
 *
 * Every form is generated in code — no models, no textures. Each one restates
 * the brand idea: the mark itself, the square module the grid is built on,
 * a true sphere, and a field measured at even intervals.
 */

export type Shape = { name: string; positions: Float32Array };

const SPAN = 6.6;

/** Rejection-samples the rendered glyphs of a string into 3D points. */
export function markShape(count: number, text = '1:1', fontFamily = 'sans-serif'): Float32Array {
  const W = 1024;
  const H = 420;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const out = new Float32Array(count * 3);
  if (!ctx) return out;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Fit the glyphs to the sample canvas so the point density stays even.
  let size = 340;
  ctx.font = `700 ${size}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  if (measured > 0) {
    size = Math.min(size * ((W * 0.92) / measured), H * 0.95);
    ctx.font = `700 ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, W / 2, H / 2 + size * 0.03);

  const data = ctx.getImageData(0, 0, W, H).data;
  const hits: number[] = [];
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 128) hits.push((i - 3) / 4);
  }

  if (!hits.length) return sphereShape(count);

  /* Normalise against the ink bounds, not the sample canvas. Font metrics
     vary, and the caller needs the mark to be a known world width so it can
     be fitted to the viewport predictably. */
  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  for (const p of hits) {
    const x = p % W;
    const y = (p / W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const scale = SPAN / Math.max(1, maxX - minX);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  for (let i = 0; i < count; i++) {
    const p = hits[(Math.random() * hits.length) | 0];
    const px = p % W;
    const py = (p / W) | 0;
    // Sub-pixel jitter stops the sampling grid from showing through.
    out[i * 3] = (px - cx + Math.random() - 0.5) * scale;
    out[i * 3 + 1] = -(py - cy + Math.random() - 0.5) * scale;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
  }
  return out;
}

/** The square module — the unit the page grid is built from. */
export function gridShape(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const cols = Math.max(2, Math.round(Math.sqrt(count * 1.9)));
  const rows = Math.max(2, Math.round(count / cols));
  const w = SPAN * 0.94;
  const h = w * 0.5;

  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = ((i / cols) | 0) % rows;
    const u = cols > 1 ? c / (cols - 1) : 0.5;
    const v = rows > 1 ? r / (rows - 1) : 0.5;
    const x = (u - 0.5) * w;
    const y = (v - 0.5) * h;
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    // Gentle bow so the plane reads as a surface rather than a flat wall.
    out[i * 3 + 2] = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.5 - 0.25;
  }
  return out;
}

/** Fibonacci sphere — even coverage, no polar clustering. */
export function sphereShape(count: number, radius = 2.45): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

/** A measured field, tilted into perspective. */
export function terrainShape(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const cols = Math.max(2, Math.round(Math.sqrt(count * 2.4)));
  const w = SPAN * 0.95;
  const d = SPAN * 0.62;
  const tilt = -0.62;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = (i / cols) | 0;
    const rows = Math.max(2, Math.ceil(count / cols));
    const u = c / (cols - 1);
    const v = r / Math.max(1, rows - 1);
    const x = (u - 0.5) * w;
    const z = (v - 0.5) * d;
    const y =
      Math.sin(x * 1.15) * 0.34 + Math.cos(z * 1.5) * 0.28 + Math.sin((x + z) * 0.7) * 0.22;

    out[i * 3] = x;
    out[i * 3 + 1] = y * ct - z * st - 0.35;
    out[i * 3 + 2] = y * st + z * ct;
  }
  return out;
}

/** Unstructured cloud used as the pre-reveal state. */
export function noiseShape(count: number, radius = 5.5): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.55 + Math.random() * 0.65);
    out[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    out[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r * 0.6;
    out[i * 3 + 2] = Math.cos(phi) * r * 0.5 - 1.5;
  }
  return out;
}
