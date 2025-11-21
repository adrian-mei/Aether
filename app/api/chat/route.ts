import { google } from '@ai-sdk/google';
import { streamText, type CoreMessage } from 'ai';
import { buildSystemPrompt } from '@/features/ai/utils/system-prompt';

export const maxDuration = 30;

// Helper to create a stream for logs
function createLogStream(encoder: TextEncoder) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    function log(category: string, message: string, data?: any) {
        const logEntry = { type: 'log', category, message, data: data || {} };
        writer.write(encoder.encode(`data: ${JSON.stringify(logEntry)}\n\n`));
    }

    return { log, readable: stream.readable, close: () => writer.close() };
}


export async function POST(req: Request) {
    const encoder = new TextEncoder();
    const { log, readable: logReadable, close: closeLogStream } = createLogStream(encoder);

    try {
        log('API', 'Request received');

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            log('ERROR', 'Missing GOOGLE_GENERATIVE_AI_API_KEY');
            throw new Error('Missing API Key');
        }

        const { messages } = await req.json();
        log('API', `Processing ${messages.length} messages`);

        if (!Array.isArray(messages)) {
            throw new Error('Messages must be an array');
        }

        const systemInstruction = buildSystemPrompt({
            interactionCount: messages.length,
            recentUserMood: undefined, // Basic context for now
        });
        log('API', 'System prompt generated', { length: systemInstruction.length });

        const geminiResponse = streamText({
            model: google('gemini-2.5-flash'),
            messages: messages as CoreMessage[],
            system: systemInstruction,
            temperature: 0.7,
            onFinish: ({ usage }) => {
                log('API', 'Token usage', usage);
                closeLogStream();
            },
        });

        const geminiStream = geminiResponse.toTextStreamResponse().body!;

        // Interleave AI response with logs
        const combinedStream = new ReadableStream({
            async start(controller) {
                let geminiDone = false;
                let logDone = false;

                const reader = geminiStream.getReader();
                const logReader = logReadable.getReader();

                async function pushData(streamReader: ReadableStreamDefaultReader<Uint8Array>, isLog: boolean) {
                    while (true) {
                        try {
                            const { done, value } = await streamReader.read();
                            if (done) {
                                if (isLog) logDone = true; else geminiDone = true;
                                if (geminiDone && logDone) controller.close();
                                break;
                            }
                            
                            if (isLog) {
                                 controller.enqueue(value);
                            } else {
                                const chunk = { type: 'text', value: new TextDecoder().decode(value) };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                            }
                        } catch (e) {
                            log('ERROR', 'Stream push error', { message: (e as Error).message });
                            break;
                        }
                    }
                }
                
                pushData(reader, false);
                pushData(logReader, true);
            }
        });

        return new Response(combinedStream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });

    } catch (error: any) {
        log('ERROR', 'Error processing request', { message: error.message });
        closeLogStream();
        // Return the log stream even on error
        return new Response(logReadable, { 
            status: 500,
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
    }
}
