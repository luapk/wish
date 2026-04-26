import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') ?? 'video.mp4';

  const contentType = request.headers.get('content-type') ?? '';
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
  if (!allowed.some(t => contentType.startsWith(t))) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'No file body.' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
