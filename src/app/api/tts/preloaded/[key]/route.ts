import { NextRequest, NextResponse } from 'next/server';
import { Env } from '@/shared/config/env';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;

  if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) {
    return new NextResponse('Invalid key format', { status: 400 });
  }

  try {
    // Proxy to Backend
    const backendUrl = `${Env.NEXT_PUBLIC_API_URL}/api/tts/preloaded/${key}`;
    console.log(`[Proxy] Fetching audio from: ${backendUrl}`);

    const response = await fetch(backendUrl);

    if (!response.ok) {
      return new NextResponse('Audio not found on backend', { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const transcript = response.headers.get('X-Aether-Transcript');

    const headers: Record<string, string> = {
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.byteLength.toString(),
      'Cache-Control': 'public, max-age=3600'
    };

    if (transcript) {
      headers['X-Aether-Transcript'] = transcript;
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error(`Error proxying preloaded audio for key "${key}":`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
