'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AnalysisResult } from '@/lib/types';

type Metrics = Pick<
  AnalysisResult,
  'visualLoad' | 'auditoryEngagement' | 'linguisticImpact' | 'overallCognitiveLoad'
>;

interface BrainViewerProps {
  metrics: Metrics;
  className?: string;
}

// Colours for each brain region (match the app's metric palette)
const C_VISUAL     = new THREE.Color(0xa855f7); // purple  — occipital
const C_AUDITORY   = new THREE.Color(0x22d3ee); // cyan    — temporal
const C_LINGUISTIC = new THREE.Color(0xec4899); // pink    — frontal-temporal
const C_DIM        = new THREE.Color(0x0f0a2a); // dark base

function buildBrainGeometry(): THREE.BufferGeometry {
  // IcosahedronGeometry level 6 → 5,762 vertices, good detail / perf balance
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n = pos.count;

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z);
    const nx = x / r, ny = y / r, nz = z / r;

    // Polar angles
    const theta = Math.atan2(nz, nx);
    const phi   = Math.acos(Math.max(-1, Math.min(1, ny)));

    // Multi-frequency displacement — simulates gyri / sulci
    const d =
      0.068 * Math.sin(5  * theta)        * Math.sin(3  * phi) +
      0.042 * Math.cos(9  * theta + 0.8)  * Math.sin(5  * phi + 0.3) +
      0.026 * Math.sin(13 * theta)        * Math.cos(8  * phi + 1.1) +
      0.016 * Math.cos(17 * theta + 2.1)  * Math.sin(11 * phi) +
      0.010 * Math.sin(22 * theta + 0.4)  * Math.cos(14 * phi + 0.7);

    const s = 1 + d;
    // Brain is wider (X) than tall (Y); front-back (Z) similar to height
    pos.setXYZ(i, nx * s * 1.24, ny * s * 0.91, nz * s * 1.02);
  }

  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return geo;
}

function applyMetricColors(geo: THREE.BufferGeometry, m: Metrics): void {
  const pos    = geo.attributes.position as THREE.BufferAttribute;
  const colors = geo.attributes.color    as THREE.BufferAttribute;
  const n = pos.count;

  const vl = m.visualLoad          / 100;
  const ae = m.auditoryEngagement  / 100;
  const li = m.linguisticImpact    / 100;

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r  = Math.sqrt(x * x + y * y + z * z);
    const nx = x / r, ny = y / r, nz = z / r;

    // Region weights derived from anatomical position
    const wVis  = Math.max(0, -nz) * 0.85 + 0.08;
    const wAud  = Math.max(0, Math.abs(nx) - 0.25) * 0.75;
    const wLing = Math.max(0, nz * 0.55 + (-nx) * 0.2);
    const wBase = 0.12;
    const total = wVis + wAud + wLing + wBase + 1e-6;

    const brightVis  = 0.25 + 0.75 * vl;
    const brightAud  = 0.25 + 0.75 * ae;
    const brightLing = 0.25 + 0.75 * li;

    const cr = (C_VISUAL.r * wVis * brightVis + C_AUDITORY.r * wAud * brightAud + C_LINGUISTIC.r * wLing * brightLing + C_DIM.r * wBase) / total;
    const cg = (C_VISUAL.g * wVis * brightVis + C_AUDITORY.g * wAud * brightAud + C_LINGUISTIC.g * wLing * brightLing + C_DIM.g * wBase) / total;
    const cb = (C_VISUAL.b * wVis * brightVis + C_AUDITORY.b * wAud * brightAud + C_LINGUISTIC.b * wLing * brightLing + C_DIM.b * wBase) / total;

    colors.setXYZ(i, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb));
  }
  colors.needsUpdate = true;
}

export default function BrainViewer({ metrics, className = '' }: BrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef   = useRef(metrics);
  const brainRef     = useRef<THREE.Mesh | null>(null);
  const glowRef      = useRef<THREE.Mesh | null>(null);
  const frameRef     = useRef(0);

  // Keep metricsRef current for the animation loop
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);

  // Re-colour when metrics change (after init)
  useEffect(() => {
    if (brainRef.current) {
      applyMetricColors(brainRef.current.geometry as THREE.BufferGeometry, metrics);
    }
  }, [metrics]);

  // One-time Three.js setup
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth, h = el.clientHeight;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0.15, 3.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 4, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6633cc, 0.45);
    fill.position.set(-3, -2, 1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x00ccff, 0.25);
    rim.position.set(0, -3, -3);
    scene.add(rim);

    // Brain mesh
    const geo = buildBrainGeometry();
    applyMetricColors(geo, metrics);

    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 55,
      specular: new THREE.Color(0x331155),
      transparent: true,
      opacity: 0.93,
    });
    const brain = new THREE.Mesh(geo, mat);
    scene.add(brain);
    brainRef.current = brain;

    // Glow shell
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.35, 0.15, 0.75),
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(geo, glowMat);
    glow.scale.setScalar(1.09);
    scene.add(glow);
    glowRef.current = glow;

    // Particle halo (small dots around the brain)
    const particleCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 1.4 + Math.random() * 0.3;
      pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta) * 1.24;
      pPos[i * 3 + 1] = r * Math.cos(phi) * 0.91;
      pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0x9966ff, size: 0.018, transparent: true, opacity: 0.5 })
    );
    scene.add(particles);

    // Animation
    const clock = new THREE.Clock();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      brain.rotation.y  = t * 0.22;
      brain.rotation.x  = Math.sin(t * 0.11) * 0.07;
      glow.rotation.copy(brain.rotation);
      particles.rotation.y = t * 0.08;

      const pulse = 0.035 + 0.03 * Math.sin(t * 1.6) * (metricsRef.current.overallCognitiveLoad / 100);
      (glow.material as THREE.MeshBasicMaterial).opacity = pulse;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      brainRef.current = null;
      glowRef.current  = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={`w-full ${className}`} />;
}
