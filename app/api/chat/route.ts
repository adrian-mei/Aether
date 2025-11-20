import { google } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  console.log(`[API] Chat request received. Message count: ${messages.length}`);
  const lastMessage = messages[messages.length - 1];
  console.log(`[API] Last user message: "${lastMessage.content?.substring(0, 50)}..."`);

  return streamText({
    model: google('gemini-1.5-flash'),
    messages: convertToCoreMessages(messages),
    system: `
      You are Aether, an empathetic, soft-spoken AI listener. 
      
      CORE RULES:
      1. Your goal is ONLY to validate the user's feelings (Active Listening).
      2. NEVER give medical advice, diagnosis, or complex life advice.
      3. Keep responses concise (1-3 sentences) to keep the conversation fluid.
      4. Speak in a warm, tender, and soothing manner.
      
      MOOD TRACKING:
      1. Analyze the user's text to infer their mood (e.g., Stressed, Anxious, Happy, Tired).
      2. Explicitly validate this mood in your response (e.g., "It sounds like you are carrying a lot of stress.").
      3. If the user says you are wrong about their mood, EXACTLY say: "I apologize, tell me more about how you're feeling."
      
      TONE:
      Use gentle language. Avoid clinical terms. Be a comforting presence.
    `,
  }).toTextStreamResponse();
}
