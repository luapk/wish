'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { TemporalFrame, BrainRegion } from '@/lib/types';

// ── Region definitions ────────────────────────────────────────────────────────

const REGION_NAMES: BrainRegion[] = [
  'visual', 'auditory', 'linguistic', 'attention', 'emotion', 'memory', 'executive',
];

const REGION_META: Record<BrainRegion, { label: string; hex: string; color: THREE.Color; lightPos: THREE.Vector3 }> = {
  visual:     { label: 'Visual Cortex',     hex: '#a855f7', color: new THREE.Color(0xa855f7), lightPos: new THREE.Vector3(0,    -0.1, -1.8) },
  auditory:   { label: 'Auditory Cortex',   hex: '#22d3ee', color: new THREE.Color(0x22d3ee), lightPos: new THREE.Vector3(-1.8,  0.1,  0  ) },
  linguistic: { label: 'Language Areas',    hex: '#ec4899', color: new THREE.Color(0xec4899), lightPos: new THREE.Vector3(-0.9, -0.5,  1.4) },
  attention:  { label: 'Attention Network', hex: '#60a5fa', color: new THREE.Color(0x60a5fa), lightPos: new THREE.Vector3(0,     1.8,  0.3) },
  emotion:    { label: 'Limbic System',     hex: '#fbbf24', color: new THREE.Color(0xfbbf24), lightPos: new THREE.Vector3(0.4,  -1.4,  0.4) },
  memory:     { label: 'Default Mode Net',  hex: '#34d399', color: new THREE.Color(0x34d399), lightPos: new THREE.Vector3(0.2,   0.4, -0.5) },
  executive:  { label: 'Prefrontal Ctx',    hex: '#c084fc', color: new THREE.Color(0xc084fc), lightPos: new THREE.Vector3(0,     0.6,  1.7) },
};

// dim base for vertex-coloured procedural fallback
const DIM = new THREE.Color(0x1a0840);

// ── Procedural brain (fallback geometry) ─────────────────────────────────────

function assignRegion(nx: number, ny: number, nz: number): number {
  if (nz < -0.35) return 0;
  if (ny >  0.52) return 3;
  if (Math.abs(nx) > 0.54 && ny < 0.28) return 1;
  if (nz >  0.44 && ny > 0.06) return 6;
  if (nz >  0.26) return 2;
  if (ny < -0.38) return 4;
  return 5;
}

function buildProceduralBrain(): { geo: THREE.BufferGeometry; regionIndices: Uint8Array } {
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n   = pos.count;

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x*x + y*y + z*z);
    const nx = x/r, ny = y/r, nz = z/r;
    const th = Math.atan2(nz, nx), ph = Math.acos(Math.max(-1, Math.min(1, ny)));
    const d =
      0.068*Math.sin(5 *th)*Math.sin(3 *ph) +
      0.042*Math.cos(9 *th+0.8)*Math.sin(5 *ph+0.3) +
      0.026*Math.sin(13*th)*Math.cos(8 *ph+1.1) +
      0.016*Math.cos(17*th+2.1)*Math.sin(11*ph) +
      0.010*Math.sin(22*th+0.4)*Math.cos(14*ph+0.7);
    const s = 1 + d;
    pos.setXYZ(i, nx*s*1.24, ny*s*0.91, nz*s*1.02);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n*3), 3));

  const regionIndices = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.sqrt(x*x + y*y + z*z);
    regionIndices[i] = assignRegion(x/r, y/r, z/r);
  }
  return { geo, regionIndices };
}

// ── Activation helpers ────────────────────────────────────────────────────────

type Activation = Record<BrainRegion, number>;

function fromMetrics(m: { visualLoad: number; auditoryEngagement: number; linguisticImpact: number; overallCognitiveLoad: number }): Activation {
  return {
    visual:     m.visualLoad           / 100 * 0.65,
    auditory:   m.auditoryEngagement   / 100 * 0.65,
    linguistic: m.linguisticImpact     / 100 * 0.65,
    attention:  m.overallCognitiveLoad / 100 * 0.55,
    emotion:    m.overallCognitiveLoad / 100 * 0.4,
    memory:     m.overallCognitiveLoad / 100 * 0.4,
    executive:  m.linguisticImpact     / 100 * 0.45,
  };
}

function interpolate(t: number, frames: TemporalFrame[]): Activation {
  const idx  = Math.floor(t);
  const frac = t - idx;
  const f0   = frames[Math.min(idx,     frames.length - 1)];
  const f1   = frames[Math.min(idx + 1, frames.length - 1)];
  return {
    visual:     f0.visual     + (f1.visual     - f0.visual)     * frac,
    auditory:   f0.auditory   + (f1.auditory   - f0.auditory)   * frac,
    linguistic: f0.linguistic + (f1.linguistic - f0.linguistic) * frac,
    attention:  f0.attention  + (f1.attention  - f0.attention)  * frac,
    emotion:    f0.emotion    + (f1.emotion    - f0.emotion)    * frac,
    memory:     f0.memory     + (f1.memory     - f0.memory)     * frac,
    executive:  f0.executive  + (f1.executive  - f0.executive)  * frac,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Metrics {
  visualLoad: number;
  auditoryEngagement: number;
  linguisticImpact: number;
  overallCognitiveLoad: number;
}

interface BrainViewerProps {
  metrics: Metrics;
  temporalData?: TemporalFrame[];
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export default function BrainViewer({ metrics, temporalData = [], videoRef, className = '' }: BrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef   = useRef(metrics);
  const temporalRef  = useRef(temporalData);
  const frameRef     = useRef(0);
  const [activeRegions, setActiveRegions] = useState<Array<{ region: BrainRegion; intensity: number }>>([]);

  useEffect(() => { metricsRef.current  = metrics;      }, [metrics]);
  useEffect(() => { temporalRef.current = temporalData; }, [temporalData]);

  // Overlay at 10 fps — reads video time without React render overhead
  useEffect(() => {
    const id = setInterval(() => {
      const vt     = videoRef?.current?.currentTime ?? -1;
      const frames = temporalRef.current;
      const act    = frames.length > 0 && vt >= 0
        ? interpolate(vt, frames)
        : fromMetrics(metricsRef.current);

      const sorted = REGION_NAMES
        .map(r => ({ region: r, intensity: act[r] }))
        .filter(x => x.intensity > 0.28)
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 3);
      setActiveRegions(sorted);
    }, 100);
    return () => clearInterval(id);
  }, [videoRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth || 400;
    const h = el.clientHeight || 400;
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0.05, 3.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0, 0);
    // ACES tonemapping makes HDR point-light glow visible
    renderer.toneMapping          = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure  = 1.3;
    renderer.outputColorSpace     = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    // ── Scene lighting ───────────────────────────────────────────────────────
    // Visible ambient so inactive brain surface stays readable
    scene.add(new THREE.AmbientLight(0x4020a0, 0.6));
    const key = new THREE.DirectionalLight(0x9966ff, 0.5);
    key.position.set(2, 3, 2);
    scene.add(key);

    // Per-region point lights — these are the activation indicators
    const regionLights = REGION_NAMES.map(r => {
      const light = new THREE.PointLight(REGION_META[r].color, 0, 4.5, 2);
      light.position.copy(REGION_META[r].lightPos);
      scene.add(light);
      return light;
    });

    // ── Brain mesh ───────────────────────────────────────────────────────────
    let brainRoot: THREE.Object3D | null = null;
    // Vertex colour array only used in the procedural fallback path
    let proceduralColors: THREE.BufferAttribute | null  = null;
    let proceduralRegions: Uint8Array | null = null;

    let cancelled = false;

    const useProcedural = () => {
      const { geo, regionIndices } = buildProceduralBrain();
      proceduralColors  = geo.attributes.color as THREE.BufferAttribute;
      proceduralRegions = regionIndices;

      const mat  = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.0 });
      const mesh = new THREE.Mesh(geo, mat);

      // Init vertex colours from metrics (not pitch-black)
      const act = fromMetrics(metricsRef.current);
      for (let i = 0; i < proceduralColors.count; i++) {
        const ri = regionIndices[i];
        const lv = act[REGION_NAMES[ri]];
        const rc = REGION_META[REGION_NAMES[ri]].color;
        proceduralColors.setXYZ(i, DIM.r+(rc.r-DIM.r)*lv, DIM.g+(rc.g-DIM.g)*lv, DIM.b+(rc.b-DIM.b)*lv);
      }
      proceduralColors.needsUpdate = true;

      const wireGeo  = new THREE.WireframeGeometry(geo);
      const wireMat  = new THREE.LineBasicMaterial({ color: 0x3d1299, transparent: true, opacity: 0.2 });
      mesh.add(new THREE.LineSegments(wireGeo, wireMat));

      scene.add(mesh);
      brainRoot = mesh;
    };

    const loadGLB = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          new GLTFLoader().load('/brain/brain.glb', resolve, undefined, reject);
        });
        if (cancelled) return;

        const model = gltf.scene;

        // Fit to unit sphere
        const box    = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3()).length();
        model.position.sub(centre);
        model.scale.setScalar(2.2 / size);

        // Strip baked textures — apply dark mesh-only material + wireframe
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = new THREE.MeshStandardMaterial({
              color:     0x110228,
              roughness: 0.55,
              metalness: 0.0,
            });
            const wireGeo = new THREE.WireframeGeometry((mesh as THREE.Mesh).geometry);
            const wireMat = new THREE.LineBasicMaterial({ color: 0x3d1299, transparent: true, opacity: 0.18 });
            mesh.add(new THREE.LineSegments(wireGeo, wireMat));
          }
        });

        scene.add(model);
        brainRoot = model;
      } catch {
        if (!cancelled) useProcedural();
      }
    };

    loadGLB();

    // ── Particles ────────────────────────────────────────────────────────────
    const pPos = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const t = Math.random() * Math.PI * 2, p = Math.acos(2*Math.random()-1);
      const r = 1.65 + Math.random() * 0.3;
      pPos[i*3]   = r * Math.sin(p) * Math.cos(t) * 1.24;
      pPos[i*3+1] = r * Math.cos(p) * 0.91;
      pPos[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x7744cc, size: 0.016, transparent: true, opacity: 0.4 }));
    scene.add(particles);

    // ── Animation ────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let prevT   = -99;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Video time if available; otherwise slowly demo the narrative arc
      const vt = videoRef?.current?.currentTime ?? -1;
      const t  = vt >= 0 ? vt : Math.min(elapsed * 0.85, 59);

      if (Math.abs(t - prevT) > 0.04) {
        prevT = t;
        const frames = temporalRef.current;
        const act    = frames.length > 0 ? interpolate(t, frames) : fromMetrics(metricsRef.current);

        // Update point light intensities (works for both GLB and procedural paths)
        regionLights.forEach((light, idx) => { light.intensity = act[REGION_NAMES[idx]] * 4.5; });

        // Also update vertex colours if we're in procedural mode
        if (proceduralColors && proceduralRegions) {
          for (let i = 0; i < proceduralColors.count; i++) {
            const ri  = proceduralRegions[i];
            const lv  = act[REGION_NAMES[ri]];
            const rc  = REGION_META[REGION_NAMES[ri]].color;
            proceduralColors.setXYZ(i, DIM.r+(rc.r-DIM.r)*lv, DIM.g+(rc.g-DIM.g)*lv, DIM.b+(rc.b-DIM.b)*lv);
          }
          proceduralColors.needsUpdate = true;
        }
      }

      if (brainRoot) {
        brainRoot.rotation.y     = elapsed * 0.18;
        brainRoot.rotation.x     = Math.sin(elapsed * 0.10) * 0.06;
      }
      particles.rotation.y = elapsed * 0.06;
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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative w-full ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {activeRegions.length > 0 && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-none">
          {activeRegions.map(({ region, intensity }) => (
            <div
              key={region}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: REGION_META[region].hex, boxShadow: `0 0 6px ${REGION_META[region].hex}` }}
              />
              <span className="text-[11px] font-medium text-white">{REGION_META[region].label}</span>
              <span className="text-[10px] text-gray-400 ml-0.5">{Math.round(intensity * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
