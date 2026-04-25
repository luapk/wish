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

// ── Procedural fallback ───────────────────────────────────────────────────────

const C_VISUAL     = new THREE.Color(0xa855f7);
const C_AUDITORY   = new THREE.Color(0x22d3ee);
const C_LINGUISTIC = new THREE.Color(0xec4899);
const C_DIM        = new THREE.Color(0x0f0a2a);

function buildProceduralBrain(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n = pos.count;

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z);
    const nx = x / r, ny = y / r, nz = z / r;
    const theta = Math.atan2(nz, nx);
    const phi   = Math.acos(Math.max(-1, Math.min(1, ny)));
    const d =
      0.068 * Math.sin(5  * theta)       * Math.sin(3  * phi) +
      0.042 * Math.cos(9  * theta + 0.8) * Math.sin(5  * phi + 0.3) +
      0.026 * Math.sin(13 * theta)       * Math.cos(8  * phi + 1.1) +
      0.016 * Math.cos(17 * theta + 2.1) * Math.sin(11 * phi) +
      0.010 * Math.sin(22 * theta + 0.4) * Math.cos(14 * phi + 0.7);
    const s = 1 + d;
    pos.setXYZ(i, nx * s * 1.24, ny * s * 0.91, nz * s * 1.02);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return geo;
}

function applyProceduralColors(geo: THREE.BufferGeometry, m: Metrics): void {
  const pos    = geo.attributes.position as THREE.BufferAttribute;
  const colors = geo.attributes.color    as THREE.BufferAttribute;
  const n = pos.count;
  const vl = m.visualLoad / 100, ae = m.auditoryEngagement / 100, li = m.linguisticImpact / 100;

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r  = Math.sqrt(x * x + y * y + z * z);
    const nx = x / r, nz = z / r;
    const wVis  = Math.max(0, -nz) * 0.85 + 0.08;
    const wAud  = Math.max(0, Math.abs(nx) - 0.25) * 0.75;
    const wLing = Math.max(0, nz * 0.55 + (-nx) * 0.2);
    const wBase = 0.12;
    const total = wVis + wAud + wLing + wBase + 1e-6;
    const bv = 0.25 + 0.75 * vl, ba = 0.25 + 0.75 * ae, bl = 0.25 + 0.75 * li;
    colors.setXYZ(i,
      Math.min(1, (C_VISUAL.r*wVis*bv + C_AUDITORY.r*wAud*ba + C_LINGUISTIC.r*wLing*bl + C_DIM.r*wBase) / total),
      Math.min(1, (C_VISUAL.g*wVis*bv + C_AUDITORY.g*wAud*ba + C_LINGUISTIC.g*wLing*bl + C_DIM.g*wBase) / total),
      Math.min(1, (C_VISUAL.b*wVis*bv + C_AUDITORY.b*wAud*ba + C_LINGUISTIC.b*wLing*bl + C_DIM.b*wBase) / total),
    );
  }
  colors.needsUpdate = true;
}

// ── Metric lights (used with real GLB mesh) ───────────────────────────────────

interface MetricLights {
  visual:     THREE.PointLight;
  auditory:   THREE.PointLight;
  linguistic: THREE.PointLight;
}

function createMetricLights(scene: THREE.Scene): MetricLights {
  const visual     = new THREE.PointLight(0xa855f7, 0, 4);
  const auditory   = new THREE.PointLight(0x22d3ee, 0, 4);
  const linguistic = new THREE.PointLight(0xec4899, 0, 4);

  visual.position.set(0, 0.2, -1.8);   // occipital — back
  auditory.position.set(-1.8, 0, 0);   // temporal  — left side
  linguistic.position.set(0, 0.3, 1.8); // frontal   — front

  scene.add(visual, auditory, linguistic);
  return { visual, auditory, linguistic };
}

function updateMetricLights(lights: MetricLights, m: Metrics): void {
  lights.visual.intensity     = (m.visualLoad          / 100) * 2.5;
  lights.auditory.intensity   = (m.auditoryEngagement  / 100) * 2.5;
  lights.linguistic.intensity = (m.linguisticImpact    / 100) * 2.5;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BrainViewer({ metrics, className = '' }: BrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef   = useRef(metrics);
  const brainRef     = useRef<THREE.Object3D | null>(null);
  const glowRef      = useRef<THREE.Mesh | null>(null);
  const lightsRef    = useRef<MetricLights | null>(null);
  const frameRef     = useRef(0);

  useEffect(() => { metricsRef.current = metrics; }, [metrics]);

  // Update lights / vertex colours on metric change
  useEffect(() => {
    if (lightsRef.current) {
      updateMetricLights(lightsRef.current, metrics);
    } else if (brainRef.current) {
      const mesh = brainRef.current as THREE.Mesh;
      if (mesh.geometry) applyProceduralColors(mesh.geometry as THREE.BufferGeometry, metrics);
    }
  }, [metrics]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth, h = el.clientHeight;
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0.1, 3.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0, 0);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    // Base lighting (always present)
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 4, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6633cc, 0.4);
    fill.position.set(-3, -2, 1);
    scene.add(fill);

    // Particle halo
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.35;
      pPos[i*3]   = r * Math.sin(p) * Math.cos(t) * 1.24;
      pPos[i*3+1] = r * Math.cos(p) * 0.91;
      pPos[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x9966ff, size: 0.018, transparent: true, opacity: 0.45 }));
    scene.add(particles);

    // Try loading real GLB first
    let cancelled = false;

    const loadReal = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          loader.load('/brain/brain.glb', resolve, undefined, reject);
        });

        if (cancelled) return;

        const model = gltf.scene;

        // Centre and scale to unit sphere
        const box = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3()).length();
        model.position.sub(centre);
        model.scale.setScalar(2.0 / size);

        // Make materials respond to coloured lights
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              const m = mat as THREE.MeshStandardMaterial;
              m.envMapIntensity = 0.4;
              m.needsUpdate = true;
            });
          }
        });

        scene.add(model);
        brainRef.current = model;

        // Glow shell around the real brain
        const glowGeo = new THREE.SphereGeometry(1.15, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x6622aa, transparent: true, opacity: 0.04, side: THREE.BackSide });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(glow);
        glowRef.current = glow;

        // Metric-driven coloured lights
        const lights = createMetricLights(scene);
        updateMetricLights(lights, metricsRef.current);
        lightsRef.current = lights;

      } catch {
        // GLB failed — use procedural brain
        if (cancelled) return;
        useProcedural();
      }
    };

    const useProcedural = () => {
      const geo = buildProceduralBrain();
      applyProceduralColors(geo, metricsRef.current);

      const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 55, specular: new THREE.Color(0x331155), transparent: true, opacity: 0.93 });
      const brain = new THREE.Mesh(geo, mat);
      scene.add(brain);
      brainRef.current = brain;

      const glowMat = new THREE.MeshBasicMaterial({ color: 0x6622aa, transparent: true, opacity: 0.05, side: THREE.BackSide });
      const glow = new THREE.Mesh(geo, glowMat);
      glow.scale.setScalar(1.09);
      scene.add(glow);
      glowRef.current = glow;
    };

    loadReal();

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const brain = brainRef.current;
      if (brain) {
        brain.rotation.y = t * 0.22;
        brain.rotation.x = Math.sin(t * 0.11) * 0.07;
      }
      const glow = glowRef.current;
      if (glow) {
        if (brain) glow.rotation.copy(brain.rotation);
        const pulse = 0.03 + 0.03 * Math.sin(t * 1.6) * (metricsRef.current.overallCognitiveLoad / 100);
        (glow.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
      particles.rotation.y = t * 0.08;
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
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      brainRef.current = null;
      glowRef.current  = null;
      lightsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={`w-full ${className}`} />;
}
