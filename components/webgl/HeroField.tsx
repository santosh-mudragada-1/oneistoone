'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { fbm } from '@/lib/noise';
import { useReducedMotion } from '@/lib/hooks';

/**
 * A survey field: a regular grid of points — the square module again — lifted
 * into terrain by layered noise, read at a shallow angle and dissolving toward
 * the horizon. It assembles from a perfectly flat sheet, which is the same
 * idea the loading sequence ends on: a system coming up to actual size.
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uForm;
  uniform float uReveal;
  uniform float uPixelRatio;
  uniform float uMouseForce;
  uniform float uScan;
  uniform vec2  uMouse;
  uniform vec3  uRed;

  attribute float aHeight;
  attribute float aRand;
  attribute float aSize;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // A slow swell so the survey is never completely still.
    float t = uTime * 0.2;
    float h = aHeight + sin(pos.x * 0.5 + t) * 0.07 + sin(pos.z * 0.66 - t * 0.8) * 0.055;

    // Entrance: flat sheet lifts into terrain, near edge leading.
    float lead = clamp((uForm - aRand * 0.22) / 0.78, 0.0, 1.0);
    lead = lead * lead * (3.0 - 2.0 * lead);
    pos.y = h * lead;

    // The cursor lifts the ground under it.
    float d = distance(pos.xz, uMouse);
    float lift = uMouseForce * exp(-d * d * 0.4);
    pos.y += lift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (11.5 / max(0.001, -mv.z));

    // A single survey band passing across the field — the one moving element.
    float band = smoothstep(0.85, 0.0, abs(pos.z - uScan));

    // Only the far third dissolves; the body of the field stays present.
    float depth = smoothstep(-9.6, -4.2, pos.z);

    float bright = mix(0.55, 1.0, aRand) + band * 0.5 + lift * 0.7;
    vColor = aRand > 0.979 ? uRed : vec3(clamp(bright, 0.0, 1.0));
    vAlpha = uReveal * depth * (0.42 + 0.58 * aRand + band * 0.5);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = smoothstep(0.25, 0.05, d);
    gl_FragColor = vec4(vColor, a * clamp(vAlpha, 0.0, 1.0));
  }
`;

const SPAN_X = 15;
const NEAR_Z = 3.2;
const FAR_Z = -9.4;

export default function HeroField({ ready }: { ready: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;

    const w0 = host.clientWidth || 1;
    const h0 = host.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 60);
    camera.position.set(0, 2.35, 5.4);
    camera.lookAt(0, 0.05, -2.6);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w0, h0, false);
    renderer.setClearColor(0x000000, 0);

    /* --- Build the grid ---------------------------------------------------- */
    const narrow = window.innerWidth < 900;
    const cols = narrow ? 136 : 196;
    const rows = narrow ? 84 : 116;
    const count = cols * rows;

    const positions = new Float32Array(count * 3);
    const heights = new Float32Array(count);
    const rand = new Float32Array(count);
    const size = new Float32Array(count);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const u = c / (cols - 1);
        const v = r / (rows - 1);
        const x = (u - 0.5) * SPAN_X;
        const z = NEAR_Z + (FAR_Z - NEAR_Z) * v;

        positions[i * 3] = x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = z;

        // Layered noise, flattened near the viewer so the foreground reads as
        // a measured plane and only the distance becomes landscape.
        const ridge = fbm(u * 3.4, v * 2.6, 11, 3) - 0.5;
        const swell = fbm(u * 1.3 + 4, v * 1.1, 27, 2) - 0.5;
        heights[i] = (ridge * 1.5 + swell * 1.9) * (0.35 + v * 0.85);

        rand[i] = Math.random();
        size[i] = 0.85 + Math.random() * 1.35;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    const uniforms = {
      uTime: { value: 0 },
      uForm: { value: reduced ? 1 : 0 },
      uReveal: { value: reduced ? 1 : 0 },
      uPixelRatio: { value: dpr },
      uMouseForce: { value: 0 },
      uScan: { value: FAR_Z },
      uMouse: { value: new THREE.Vector2(0, 99) },
      uRed: { value: new THREE.Color('#ff2a1a') },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);

    /* --- Interaction -------------------------------------------------------- */
    const mouseTarget = new THREE.Vector2(0, 99);
    let hovering = false;

    const onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      // Approximate ground position — precise enough for a proximity lift.
      mouseTarget.set((nx * SPAN_X) / 2.4, NEAR_Z + (FAR_Z - NEAR_Z) * Math.max(0, ny * 0.85 + 0.4));
      if (!hovering) {
        hovering = true;
        gsap.to(uniforms.uMouseForce, { value: 0.85, duration: 1, ease: 'power2.out' });
      }
    };

    const onPointerLeave = () => {
      hovering = false;
      gsap.to(uniforms.uMouseForce, { value: 0, duration: 1.2, ease: 'power2.out' });
    };

    if (!reduced) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      host.addEventListener('pointerleave', onPointerLeave);
    }

    /* --- Resize -------------------------------------------------------------- */
    const resize = () => {
      const nw = host.clientWidth || 1;
      const nh = host.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer?.setSize(nw, nh, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* --- Reveal --------------------------------------------------------------- */
    let scanTween: gsap.core.Tween | null = null;
    startRef.current = () => {
      if (disposed || reduced) return;
      gsap.to(uniforms.uReveal, { value: 1, duration: 1.8, ease: 'power2.out' });
      gsap.to(uniforms.uForm, { value: 1, duration: 2.8, ease: 'power2.inOut' });
      scanTween = gsap.fromTo(
        uniforms.uScan,
        { value: NEAR_Z + 1 },
        { value: FAR_Z - 1, duration: 11, ease: 'none', repeat: -1, delay: 1.4 }
      );
    };

    /* --- Scroll response ------------------------------------------------------- */
    const st = ScrollTrigger.create({
      trigger: host,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        points.position.z = self.progress * 2.4;
        uniforms.uReveal.value = Math.max(0, 1 - self.progress * 1.4);
      },
    });

    /* --- Loop ------------------------------------------------------------------ */
    let inView = true;
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), {
      rootMargin: '10%',
    });
    io.observe(host);

    const clock = new THREE.Clock();
    const tick = () => {
      if (disposed || !renderer || !inView) return;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.lerp(mouseTarget, 0.07);
      renderer.render(scene, camera);
    };

    if (reduced) renderer.render(scene, camera);
    else gsap.ticker.add(tick);

    const onLost = (e: Event) => {
      e.preventDefault();
      gsap.ticker.remove(tick);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      disposed = true;
      startRef.current = null;
      gsap.ticker.remove(tick);
      scanTween?.kill();
      gsap.killTweensOf([uniforms.uReveal, uniforms.uForm, uniforms.uMouseForce, uniforms.uScan]);
      st.kill();
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      geo.dispose();
      material.dispose();
      renderer?.dispose();
      renderer = null;
    };
  }, [reduced]);

  /* The field waits for the loading curtain to hand over. */
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const attempt = () => {
      if (startRef.current) startRef.current();
      else raf = requestAnimationFrame(attempt);
    };
    attempt();
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
