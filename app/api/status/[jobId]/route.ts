import { NextResponse } from 'next/server';
import type { AnalysisResult } from '@/lib/types';

const MOCK_RESULT: AnalysisResult = {
  visualLoad: 84,
  auditoryEngagement: 62,
  linguisticImpact: 71,
  overallCognitiveLoad: 72,
  verdict: 'High Cognitive Impact',
  summary:
    'This media triggers strong activation in visual processing regions (V1–V4) consistent with rapid scene changes and high-contrast imagery. Auditory cortex engagement is moderate, with periodic peaks during speech. Linguistic pathways show above-average stimulation indicating dense narrative structure with high semantic load. Overall cognitive demand is elevated — viewers require sustained attention throughout.',
  processingTimeSeconds: 41.7,
  confidence: {
    visualLoad:          { low: 78, high: 90 },
    auditoryEngagement:  { low: 52, high: 72 },
    linguisticImpact:    { low: 62, high: 80 },
    overallCognitiveLoad:{ low: 65, high: 79 },
  },
};

function mockStage(elapsed: number, audience: string): object {
  if (elapsed < 4000)  return { status: 'downloading' };
  if (elapsed < 8000)  return { status: 'extracting_frames' };
  if (elapsed < 14000) return { status: 'running_inference' };
  if (elapsed < 16000) return { status: 'aggregating' };
  return { status: 'complete', data: { ...MOCK_RESULT, audience } };
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
