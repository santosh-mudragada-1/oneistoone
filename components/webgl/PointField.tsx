'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import { gridShape, markShape, noiseShape, sphereShape, terrainShape } from './shapes';

const VERT = /* glsl */ `
  uniform float uMix;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uMouseForce;
  uniform float uSizeScale;
  uniform vec2  uMouse;
  uniform vec3  uRed;

  attribute vec3  aTarget;
  attribute vec3  aArc;
  attribute float aRand;
  attribute float aSize;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    // Per-particle delay staggers the morph so the form assembles rather
    // than snapping between states.
    float delay = aRand * 0.42;
    float m = clamp((uMix - delay) / 0.58, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);

    vec3 pos = mix(position, aTarget, m);
    pos += aArc * sin(m * 3.14159265);

    // Ambient drift — the cloud is never completely still.
    float t = uTime * 0.16;
    pos.x += sin(t + aRand * 24.0) * 0.030;
    pos.y += cos(t * 1.27 + aRand * 19.0) * 0.030;
    pos.z += sin(t * 0.83 + aRand * 13.0) * 0.060;

    // Gaussian displacement away from the cursor.
    vec2 md = pos.xy - uMouse;
    float dist = length(md);
    float force = uMouseForce * exp(-dist * dist * 0.5);
    pos.xy += normalize(md + vec2(0.0001)) * force;
    pos.z += force * 0.55;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (11.0 / max(0.001, -mv.z));

    vColor = aRand > 0.963 ? uRed : vec3(mix(0.38, 1.0, aRand));
    vAlpha = uOpacity * (0.40 + 0.60 * aRand) * (1.0 + force * 1.5);
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

const FORMS = ['Mark', 'Module', 'Sphere', 'Field'] as const;

export default function PointField({
  ready,
  onFormChange,
}: {
  ready: boolean;
  onFormChange?: (name: string, index: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();

  const formCb = useRef(onFormChange);
  formCb.current = onFormChange;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let cleanup: (() => void) | null = null;

    const boot = async () => {
      // Sample the real display face, not a fallback.
      try {
        await document.fonts.ready;
      } catch {
        /* sampling falls back to the system grotesk */
      }
      if (disposed) return;

      const fontFamily =
        getComputedStyle(document.documentElement).getPropertyValue('--font-archivo').trim() ||
        'sans-serif';

      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;

      const count =
        window.innerWidth < 768 ? 7000 : window.innerWidth < 1280 ? 15000 : 26000;

      const build = (i: number): Float32Array => {
        switch (i) {
          case 1:
            return gridShape(count);
          case 2:
            return sphereShape(count);
          case 3:
            return terrainShape(count);
          default:
            return markShape(count, '1:1', fontFamily);
        }
      };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      camera.position.z = 6.2;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);

      const geo = new THREE.BufferGeometry();
      const start = reduced ? build(0) : noiseShape(count);
      const target = build(0);
      const arc = new Float32Array(count * 3);
      const rand = new Float32Array(count);
      const size = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const mag = Math.random() * 0.85;
        arc[i * 3] = Math.sin(phi) * Math.cos(theta) * mag;
        arc[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * mag;
        arc[i * 3 + 2] = Math.cos(phi) * mag;
        rand[i] = Math.random();
        size[i] = 0.75 + Math.random() * 1.5;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(start, 3));
      geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
      geo.setAttribute('aArc', new THREE.BufferAttribute(arc, 3));
      geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

      const uniforms = {
        uMix: { value: reduced ? 1 : 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uOpacity: { value: reduced ? 1 : 0 },
        uMouseForce: { value: 0 },
        uSizeScale: { value: w < 768 ? 0.85 : 1 },
        uMouse: { value: new THREE.Vector2(999, 999) },
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

      /* --- Interaction ---------------------------------------------------- */
      const ndc = new THREE.Vector2(0, 0);
      const mouseTarget = new THREE.Vector2(999, 999);
      const rotTarget = new THREE.Vector2(0, 0);
      let hovering = false;
      let fit = 1;

      /* Shapes are normalised to 6.6 world units wide, so the cloud can be
         given an explicit share of the frame. Portrait frames hand it far
         more of the width — otherwise the mark reads as a small badge. */
      const applyFit = () => {
        const vFov = (camera.fov * Math.PI) / 180;
        const vh = 2 * Math.tan(vFov / 2) * camera.position.z;
        const vw = vh * camera.aspect;
        const frac = camera.aspect < 1.1 ? 0.9 : 0.56;
        fit = (vw * frac) / 6.6;
        points.scale.setScalar(fit);
      };

      const toWorld = () => {
        const vFov = (camera.fov * Math.PI) / 180;
        const vh = 2 * Math.tan(vFov / 2) * camera.position.z;
        const vw = vh * camera.aspect;
        // Shader compares against object-space positions, so undo the fit.
        mouseTarget.set((ndc.x * vw) / 2 / fit, (ndc.y * vh) / 2 / fit);
      };

      const onPointerMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        rotTarget.set(ndc.x * 0.17, -ndc.y * 0.12);
        toWorld();
        if (!hovering) {
          hovering = true;
          gsap.to(uniforms.uMouseForce, { value: 0.62, duration: 0.9, ease: 'power2.out' });
        }
      };

      const onPointerLeave = () => {
        hovering = false;
        gsap.to(uniforms.uMouseForce, { value: 0, duration: 1.1, ease: 'power2.out' });
        gsap.to(rotTarget, { x: 0, y: 0, duration: 1.4, ease: 'power2.out' });
      };

      if (!reduced) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        host.addEventListener('pointerleave', onPointerLeave);
      }

      /* --- Resize ---------------------------------------------------------- */
      const resize = () => {
        const nw = host.clientWidth || 1;
        const nh = host.clientHeight || 1;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer?.setSize(nw, nh, false);
        uniforms.uSizeScale.value = nw < 768 ? 0.85 : 1;
        applyFit();
        toWorld();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      /* --- Form cycling ---------------------------------------------------- */
      let formIndex = 0;
      let cycleCall: gsap.core.Tween | null = null;

      const morphTo = (next: number) => {
        if (disposed) return;
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
        const tgtAttr = geo.getAttribute('aTarget') as THREE.BufferAttribute;

        // Commit the finished form, then aim at the next one.
        (posAttr.array as Float32Array).set(tgtAttr.array as Float32Array);
        (tgtAttr.array as Float32Array).set(build(next));
        posAttr.needsUpdate = true;
        tgtAttr.needsUpdate = true;

        formIndex = next;
        uniforms.uMix.value = 0;
        formCb.current?.(FORMS[next], next);
        gsap.to(uniforms.uMix, { value: 1, duration: 2.5, ease: 'power2.inOut' });
        cycleCall = gsap.delayedCall(6.2, () => morphTo((next + 1) % FORMS.length));
      };

      /* --- Reveal ----------------------------------------------------------- */
      const start3D = () => {
        if (disposed || reduced) return;
        formCb.current?.(FORMS[0], 0);
        gsap.to(uniforms.uOpacity, { value: 1, duration: 1.6, ease: 'power2.out' });
        gsap.to(uniforms.uMix, {
          value: 1,
          duration: 3,
          ease: 'power2.inOut',
          onComplete: () => {
            cycleCall = gsap.delayedCall(2.6, () => morphTo(1));
          },
        });
      };
      startRef.current = start3D;

      /* --- Scroll response --------------------------------------------------- */
      const st = ScrollTrigger.create({
        trigger: host,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          points.position.y = p * 1.6;
          points.rotation.z = p * 0.22;
          material.uniforms.uOpacity.value = Math.max(0, (reduced ? 1 : 1) * (1 - p * 1.35));
        },
      });

      /* --- Render loop -------------------------------------------------------- */
      /* The hero sits at the top of a very long page. Without this gate the
         cloud keeps rendering every frame while the reader is six sections
         further down, competing with the canvas sketches for the same budget. */
      let inView = true;
      const io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
        },
        { rootMargin: '10%' }
      );
      io.observe(host);

      const clock = new THREE.Clock();
      const tick = () => {
        if (disposed || !renderer || !inView) return;
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uMouse.value.lerp(mouseTarget, 0.09);
        points.rotation.y += (rotTarget.x - points.rotation.y) * 0.05;
        points.rotation.x += (rotTarget.y - points.rotation.x) * 0.05;
        renderer.render(scene, camera);
      };

      if (reduced) {
        renderer.render(scene, camera);
      } else {
        gsap.ticker.add(tick);
      }

      const onLost = (e: Event) => {
        e.preventDefault();
        gsap.ticker.remove(tick);
      };
      canvas.addEventListener('webglcontextlost', onLost);

      cleanup = () => {
        gsap.ticker.remove(tick);
        cycleCall?.kill();
        gsap.killTweensOf([uniforms.uMix, uniforms.uOpacity, uniforms.uMouseForce, rotTarget]);
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
    };

    void boot();

    return () => {
      disposed = true;
      startRef.current = null;
      cleanup?.();
    };
  }, [reduced]);

  /* The reveal waits for the preloader to hand over. */
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
