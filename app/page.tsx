'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAetherVoice } from '../hooks/use-aether-voice';
import { Mic, Bug } from 'lucide-react';
import AetherVisualizer from '../components/aether-visualizer';
import DebugOverlay from '../components/debug-overlay';
import { logger } from '../lib/logger';

export default function AetherInterface() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const requestStartTime = useRef<number>(0);

  // Custom Voice Hook
  // We define this first to pass its 'speak' function to useChat if needed, 
  // or simpler: define useChat first and pass 'append' to voice hook.
  // But voice hook needs 'onInputComplete' which calls 'append'.
  // And useChat 'onFinish' calls 'speak'.
  // This circular dependency is solved by using refs or careful ordering.
  // In the user's example, they pass `append` to `useAetherVoice`.
  
  // We need 'speak' available for 'onFinish'. 
  // But 'speak' comes from 'useAetherVoice'.
  // 'useAetherVoice' needs 'append' from 'useChat'.
  
  // Let's assume the user's provided code structure works or I adapt it.
  // User code:
  /*
  const { messages, append, isLoading } = useChat({
    ...
    onFinish: (message) => { speak(message.content); },
  });
  
  const { ..., speak } = useAetherVoice(async (text) => { await append(...) });
  */
  // This creates a closure issue because 'speak' is used in 'useChat' config before it's defined.
  // However, in React functional components, we can't use a variable before declaration.
  // We can solve this by using a ref for 'speak' or 'append'.
  
  // Better approach:
  // 1. Define useChat.
  // 2. Define useAetherVoice.
  // 3. Use a useEffect to handle the speaking of new messages, OR use a Ref for the speak function passed to onFinish.
  
  // Let's try to implement it closer to the provided snippet but fixing the dependency.
  // I'll use a mutable ref for the 'speak' function so useChat can call it.
  
  // ... actually, useChat's onFinish capture the closure.
  // If I define useAetherVoice *after* useChat, I can't pass 'speak' to useChat options directly if it's static.
  // BUT, useChat options are re-evaluated on render? No, usually static.
  // However, I can use `useEffect` on `messages` to trigger speak, similar to how I did before?
  // The user's code snippet:
  // `const { messages, append, isLoading } = useChat({ ..., onFinish: (m) => speak(m.content) })`
  // This implies `speak` is available.
  // But `const { ..., speak } = useAetherVoice(...)` comes AFTER.
  // This is invalid JS/TS (using variable before declaration).
  
  // I will re-arrange or use a Ref.
  // Using a Ref for `speak` is safe.
  
  // Wait, I can just use `useEffect` to watch for new assistant messages that just finished?
  // Or simpler:
  // Declare `useAetherVoice` first with a dummy callback, then `useChat`, then update `useAetherVoice`? No.
  
  // Solution:
  // Define `handleInputComplete` which calls `append`.
  // Define `handleMessageFinished` which calls `speak`.
  // But `append` comes from `useChat`.
  // And `speak` comes from `useAetherVoice`.
  
  // I will use a ref for `append` to break the cycle for `useAetherVoice`.
  // And I will use a ref for `speak` to break the cycle for `useChat`.

  /* 
     User provided code had this structure which is technically impossible if literally pasted:
     const { ... } = useChat({ onFinish: (m) => speak(...) }) // speak is not defined yet
     const { speak } = useAetherVoice(...)
  */

  // I will implement a robust version.
  
  const speakRef = useRef<(text: string) => void>(() => {});
  const appendRef = useRef<(req: any) => Promise<any>>(async () => null);

  const { messages, append, isLoading } = useChat({
    api: '/api/chat',
    onResponse: (response: any) => {
      const duration = Date.now() - requestStartTime.current;
      logger.info('API', 'Response stream started', { 
        status: response.status, 
        statusText: response.statusText,
        latencyMs: duration 
      });
    },
    onFinish: (result: any) => {
      const duration = Date.now() - requestStartTime.current;
      const message = result?.message;
      let text = '';
      if (message) {
        if (message.parts) {
            text = message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
        } else if ((message as any).content) {
            text = (message as any).content;
        }
      }
      logger.info('API', 'Response finished', { 
        textLength: text.length,
        totalDurationMs: duration
      });
      if (text) speakRef.current(text);
    },
    onError: (error: any) => {
        logger.error('API', 'Chat error', error);
    }
  } as any) as any;
  
  // Update appendRef
  useEffect(() => {
    if (append) {
      appendRef.current = append;
    }
  }, [append]);

  const handleInputComplete = useCallback(async (text: string) => {
    logger.info('APP', 'User input processing', { text });
    requestStartTime.current = Date.now();
    // When user finishes speaking, send to AI
    await appendRef.current({ role: 'user', content: text });
  }, []);

  const { state, startListening, stopListening, speak } = useAetherVoice(handleInputComplete);
  
  // Update speakRef
  useEffect(() => {
    if (speak) {
      speakRef.current = speak;
    }
  }, [speak]);

  // Initial Greeting Logic
  const handleStartSession = () => {
    logger.info('APP', 'Session started');
    setHasStarted(true);
    const greeting = "Hello, I am Aether. How are you feeling right now?";
    speak(greeting);
  };

  const toggleListening = () => {
    if (state === 'idle') {
      startListening();
    } else {
      stopListening();
    }
  };

  // Debug toggle
  const toggleDebug = () => {
      const isEnabled = localStorage.getItem('aether_debug') === 'true';
      const newState = !isEnabled;
      logger.toggleDebug(newState);
      setIsDebugOpen(newState);
  };

  // Sync debug state on mount
  useEffect(() => {
      setIsDebugOpen(localStorage.getItem('aether_debug') === 'true');
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <DebugOverlay isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      
      {/* Ambient Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-slate-950 pointer-events-none" />

      <div className="z-10 max-w-md w-full text-center space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-thin tracking-tight text-indigo-200">Aether</h1>
          <p className="text-slate-400 text-sm mt-2">Empathetic Voice Companion</p>
        </div>

        {/* Interaction Area */}
        <div className="min-h-[200px] flex flex-col items-center justify-center">
          {!hasStarted ? (
            <button 
              onClick={handleStartSession}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all duration-300 shadow-lg shadow-indigo-900/20 text-white font-medium cursor-pointer"
            >
              Begin Session
            </button>
          ) : (
            <div className="flex flex-col items-center gap-8">
              
              {/* The New Component */}
              <AetherVisualizer state={state} />

              {/* Controls */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={toggleListening}
                  className={`p-4 rounded-full transition-all duration-300 cursor-pointer active:scale-95 border ${
                    state === 'listening' 
                      ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30' 
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                  aria-label={state === 'idle' ? "Start listening" : "Stop listening"}
                >
                  <Mic className={`w-6 h-6 ${state === 'listening' ? 'text-red-400' : 'text-white'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer Footer (Required by FR-1.2) */}
        <div className="mt-12 p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-400">Disclaimer:</span> Aether is an AI demo. It is not a healthcare provider. 
            Responses are generated by AI and may be inaccurate. 
            If you are in crisis, please contact local emergency services immediately.
          </p>
          <button 
            onClick={toggleDebug} 
            className={`mt-2 text-[10px] flex items-center gap-1 transition-colors ${isDebugOpen ? 'text-indigo-400' : 'text-slate-700 hover:text-slate-500'}`}
          >
             <Bug size={10} /> {isDebugOpen ? 'Debug On' : 'Debug Mode'}
          </button>
        </div>
      </div>
    </main>
  );
}
