import { NextResponse } from 'next/server';

// Mock results for local development (no Modal required)
const MOCK_RESULT = {
  status: 'complete',
  data: {
    visualLoad: 84,
    auditoryEngagement: 62,
    linguisticImpact: 71,
    overallCognitiveLoad: 72,
    summary:
      'This media triggers strong activation in visual processing regions (V1–V4) consistent with rapid scene changes and high-contrast imagery. Auditory cortex engagement is moderate, with periodic peaks during speech. Linguistic pathways show above-average stimulation, indicating a dense narrative structure with high semantic load. The overall cognitive demand is elevated — viewers require sustained attention throughout.',
    processingTimeSeconds: 41.7,
  },
};

function mockStage(elapsed: number): object {
  if (elapsed < 4000) return { status: 'downloading' };
  if (elapsed < 8000) return { status: 'extracting_frames' };
  if (elapsed < 14000) return { status: 'running_inference' };
  if (elapsed < 16000) return { status: 'aggregating' };
  return MOCK_RESULT;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Simulate progressive stage updates using the timestamp in the mock job ID
  if (jobId.startsWith('mock_')) {
    const start = parseInt(jobId.replace('mock_', ''), 10);
    return NextResponse.json(mockStage(Date.now() - start));
  }

  if (!process.env.MODAL_STATUS_URL) {
    return NextResponse.json({ error: 'Modal not configured.' }, { status: 500 });
  }

  const headers: Record<string, string> = {};
  if (process.env.MODAL_API_KEY) headers['Authorization'] = `Bearer ${process.env.MODAL_API_KEY}`;

  const res = await fetch(`${process.env.MODAL_STATUS_URL}?job_id=${encodeURIComponent(jobId)}`, {
    headers,
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
