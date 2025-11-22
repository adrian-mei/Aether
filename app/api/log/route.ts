import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { logs } = body;

    if (Array.isArray(logs)) {
      logs.forEach((log: any) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        const prefix = `[CLIENT] [${timestamp}] [${log.level.toUpperCase()}] [${log.category}]`;
        const message = log.message;
        const data = log.data ? JSON.stringify(log.data) : '';

        const output = `${prefix}: ${message} ${data}`;

        if (log.level === 'error') {
          console.error(output);
        } else if (log.level === 'warn') {
          console.warn(output);
        } else {
          console.log(output);
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process client logs', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
