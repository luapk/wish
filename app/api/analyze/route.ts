import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { videoUrl } = await request.json();

  if (!videoUrl || typeof videoUrl !== 'string') {
    return NextResponse.json({ error: 'videoUrl is required.' }, { status: 400 });
  }

  // Dev / demo mode: no Modal configured — return a mock job ID
  if (!process.env.MODAL_ANALYZE_URL) {
    return NextResponse.json({ job_id: `mock_${Date.now()}`, status: 'queued' });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.MODAL_API_KEY) headers['Authorization'] = `Bearer ${process.env.MODAL_API_KEY}`;

  const res = await fetch(process.env.MODAL_ANALYZE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ video_url: videoUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Modal error:', text);
    return NextResponse.json({ error: 'Failed to start analysis.' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
