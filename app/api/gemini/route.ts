import { streamText } from 'ai';
import { getGoogleProvider, MODEL_NAME } from '@/shared/config/ai-config';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const google = getGoogleProvider();

  const result = await streamText({
    model: google(MODEL_NAME),
    messages,
  });

  return result.toTextStreamResponse();
}
