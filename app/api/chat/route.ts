import { google } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 1. Check for API Key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error('[API] Missing GOOGLE_GENERATIVE_AI_API_KEY');
        return new Response('Missing API Key', { status: 500 });
    }

    const { messages } = await req.json();
    
    console.log(`[API] Chat request received. Message count: ${messages.length}`);
    
    // Validate messages
    if (!Array.isArray(messages)) {
       throw new Error('Messages must be an array');
    }
    
    // DEBUG: Log full messages structure to diagnose SDK issues
    console.log('[API] Raw messages:', JSON.stringify(messages, null, 2));

    const lastMessage = messages[messages.length - 1];
    console.log(`[API] Last user message: "${lastMessage.content?.substring(0, 50)}..."`);

    // 1. ANALYZE CONTEXT (Lightweight "Pre-flight" logic)
    const interactionCount = messages.length;
    const recentUserMood = interactionCount > 2 ? "likely vulnerable" : undefined;

    console.log(`[API] Context Analysis - Count: ${interactionCount}, Mood: ${recentUserMood}`);

    // 2. BUILD THE OPINIONATED PROMPT
    const systemInstruction = buildSystemPrompt({
      interactionCount,
      recentUserMood
    });
    
    console.log('[API] Generated System Prompt:\n', systemInstruction);

    // Attempt to use SDK helper, fallback to manual if it fails
    let coreMessages;
    try {
      // We explicitly imported convertToCoreMessages, so we can try it.
      // But wait, previously it crashed with "undefined map".
      // This implies 'messages' might have been weird, OR the import is wrong.
      // Let's inspect 'messages' in logs first.
      coreMessages = messages.map((m: any) => ({
          role: m.role,
          content: m.content,
      }));
    } catch (e) {
      console.error('[API] Message conversion failed', e);
      throw e;
    }

    // 3. EXECUTE STREAM
    console.log('[API] Starting streamText with Gemini 2.5 Flash...');
    return streamText({
        model: google('gemini-2.5-flash'),
        messages: coreMessages,
        system: systemInstruction, // <--- The "Opinionated" Brain
        temperature: 0.7,
        onFinish: ({ usage, finishReason }) => {
          const { inputTokens, outputTokens, totalTokens } = usage as any;
          // Estimate cost (Gemini Flash ~ $0.10/1M input, $0.40/1M output)
          // Note: 2.5 Flash pricing may vary, using 1.5 Flash as baseline estimate
          const inputCost = (inputTokens / 1_000_000) * 0.10;
          const outputCost = (outputTokens / 1_000_000) * 0.40;
          const totalCost = inputCost + outputCost;

          console.log('[API] Token Usage:', JSON.stringify(usage, null, 2));
          console.log(`[API] Estimated Cost: $${totalCost.toFixed(6)}`);
          console.log(`[API] Finish Reason: ${finishReason}`);
        },
    }).toTextStreamResponse();

  } catch (error: any) {
    console.error('[API] Error processing request:', error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
