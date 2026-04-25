import { NextResponse } from 'next/server';
import type { AnalysisResult, TemporalFrame, ContextualMoment } from '@/lib/types';

// ── Temporal data generator ────────────────────────────────────────────────────

function gauss(t: number, center: number, width: number): number {
  return Math.exp(-0.5 * ((t - center) / width) ** 2);
}

function flicker(t: number, freq: number, phase: number): number {
  return 0.055 * Math.sin(t * freq + phase);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function generateTemporalData(vl: number, ae: number, li: number): TemporalFrame[] {
  return Array.from({ length: 60 }, (_, t) => {
    const g = (c: number, w: number) => gauss(t, c, w);
    return {
      t,
      visual:     clamp((vl/100) * (0.78*g(3,2.5) + 0.52*g(13,4) + 0.44*g(22,3) + 0.88*g(38,4) + 0.65*g(52,4) + 0.18 + flicker(t,0.8,0.3))),
      auditory:   clamp((ae/100) * (0.42*g(3,3)   + 0.38*g(15,5) + 0.58*g(22,3) + 0.96*g(29,2.5)+ 0.42*g(43,5) + 0.14 + flicker(t,0.6,1.2))),
      linguistic: clamp((li/100) * (0.18*g(5,3)   + 0.62*g(14,4) + 0.44*g(24,4) + 0.88*g(39,4) + 0.92*g(48,3) + 0.08 + flicker(t,0.5,0.7))),
      attention:  clamp(           0.68*g(3,2.5)  + 0.52*g(12,4) + 0.78*g(20,3.5)+ 0.62*g(29,3) + 0.72*g(40,5) + 0.96*g(48,2.5)+ 0.18 + flicker(t,0.4,2.1)),
      emotion:    clamp(           0.28*g(8,4)    + 0.68*g(17,5) + 0.94*g(21,3.5)+ 0.82*g(29,3.5)+ 0.44*g(40,4) + 0.58*g(48,3) + 0.62*g(56,4) + 0.08 + flicker(t,0.3,3.0)),
      memory:     clamp(           0.18*g(10,5)   + 0.48*g(19,5) + 0.84*g(22,4) + 0.34*g(32,5) + 0.66*g(41,5) + 0.58*g(50,4) + 0.88*g(57,3) + 0.08 + flicker(t,0.35,1.5)),
      executive:  clamp(           0.18*g(5,3)    + 0.32*g(15,5) + 0.28*g(24,5) + 0.42*g(33,5) + 0.78*g(40,4) + 0.92*g(48,2.5)+ 0.52*g(54,4) + 0.08 + flicker(t,0.55,0.4)),
    };
  });
}

// ── Contextual moments ─────────────────────────────────────────────────────────

const MOCK_MOMENTS: ContextualMoment[] = [
  {
    t: 2, dur: 5, intensity: 0.82, label: 'Opening hook',
    detail: 'Hero shot activates V1–V4 visual cortex and frontoparietal attention network. Brain primes for content uptake within the first 200ms of stimulus.',
    regions: ['visual', 'attention'],
  },
  {
    t: 11, dur: 6, intensity: 0.74, label: 'Character recognition',
    detail: 'Protagonist enters. Fusiform face area and superior temporal sulcus activate for social inference. Default mode network begins narrative tracking.',
    regions: ['emotion', 'memory'],
  },
  {
    t: 19, dur: 5, intensity: 0.93, label: 'Emotional pivot',
    detail: 'Vulnerability moment surfaces. Amygdala–hippocampal circuit fires: episodic memory and emotional valence co-activate. Peak limbic engagement of the clip.',
    regions: ['emotion', 'memory', 'attention'],
  },
  {
    t: 28, dur: 4, intensity: 0.88, label: 'Music drop',
    detail: 'Bass-frequency onset syncs with limbic rhythm. Auditory cortex drives mood-valence shift — dopaminergic reward pathway implicated. Heart-rate follower response typical.',
    regions: ['auditory', 'emotion'],
  },
  {
    t: 38, dur: 6, intensity: 0.87, label: 'Brand message lands',
    detail: "Key linguistic payload delivered. Broca's area + left angular gyrus encode product narrative into semantic long-term memory. Recall probability peaks here.",
    regions: ['linguistic', 'executive', 'memory'],
  },
  {
    t: 47, dur: 5, intensity: 0.95, label: 'Call to action',
    detail: 'Prefrontal–parietal decision circuit reaches maximum co-activation. Purchase intent signal measurable. All seven networks briefly synchronise — highest cognitive engagement window.',
    regions: ['attention', 'executive', 'emotion', 'linguistic'],
  },
];

// ── Mock result ────────────────────────────────────────────────────────────────

const MOCK_BASE: Omit<AnalysisResult, 'audience' | 'temporalData' | 'moments'> = {
  visualLoad: 84,
  auditoryEngagement: 62,
  linguisticImpact: 71,
  overallCognitiveLoad: 72,
  verdict: 'High Cognitive Impact',
  summary:
    'Strong activation in visual processing regions (V1–V4) consistent with rapid scene changes. Auditory cortex engagement peaks sharply at the music transition at t≈29s. Linguistic pathways show above-average stimulation indicating dense narrative with high semantic load. The call-to-action window at t≈48s produces maximum multi-network synchrony.',
  processingTimeSeconds: 41.7,
  confidence: {
    visualLoad:           { low: 78, high: 90 },
    auditoryEngagement:   { low: 52, high: 72 },
    linguisticImpact:     { low: 62, high: 80 },
    overallCognitiveLoad: { low: 65, high: 79 },
  },
};

// ── Route ──────────────────────────────────────────────────────────────────────

function mockStage(elapsed: number, audience: string): object {
  if (elapsed < 4000)  return { status: 'downloading' };
  if (elapsed < 8000)  return { status: 'extracting_frames' };
  if (elapsed < 14000) return { status: 'running_inference' };
  if (elapsed < 16000) return { status: 'aggregating' };

  const data: AnalysisResult = {
    ...MOCK_BASE,
    audience,
    temporalData: generateTemporalData(
      MOCK_BASE.visualLoad,
      MOCK_BASE.auditoryEngagement,
      MOCK_BASE.linguisticImpact,
    ),
    moments: MOCK_MOMENTS,
  };
  return { status: 'complete', data };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (jobId.startsWith('mock_')) {
    const [, ts, audience = 'all'] = jobId.split('_');
    return NextResponse.json(mockStage(Date.now() - parseInt(ts, 10), audience));
  }

  if (!process.env.MODAL_STATUS_URL) {
    return NextResponse.json({ error: 'Modal not configured.' }, { status: 500 });
  }

  const headers: Record<string, string> = {};
  if (process.env.MODAL_API_KEY) headers['Authorization'] = `Bearer ${process.env.MODAL_API_KEY}`;

  const res = await fetch(
    `${process.env.MODAL_STATUS_URL}?job_id=${encodeURIComponent(jobId)}`,
    { headers }
  );

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 502 });
  return NextResponse.json(await res.json());
}
