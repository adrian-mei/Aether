'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAetherVoice } from '../hooks/use-aether-voice';
import { Mic, Bug } from 'lucide-react';
import AetherVisualizer from '../components/aether-visualizer';
import DebugOverlay from '../components/debug-overlay';
import { logger } from '../lib/logger';

export default function AetherInterface() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([]);
  
  // Ref to track history without triggering re-renders during stream
  const historyRef = useRef<{role: string, content: string}[]>([]);

  const handleInputComplete = useCallback(async (text: string) => {
    logger.info('APP', 'User input processing', { text });
    const start = Date.now();
    
    // Update history
    const userMessage = { role: 'user', content: text };
    const newHistory = [...historyRef.current, userMessage];
    historyRef.current = newHistory;
    // We don't necessarily need to set state if we aren't rendering bubbles, 
    // but good for debugging if we add a view later.
    // setConversationHistory(newHistory); 

    try {
        logger.info('APP', 'Sending request to LLM...');
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: newHistory })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            assistantMessage += chunk;
        }

        logger.info('APP', 'Response finished', { 
            textLength: assistantMessage.length,
            totalDurationMs: Date.now() - start 
        });

        // Update history with assistant response
        historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessage }];

        // Speak the response
        if (assistantMessage.trim()) {
            // We need to access 'speak' here. 
            // Since this function is passed TO useAetherVoice, we can't easily access 'speak' 
            // from the hook return value inside this callback (circular dependency).
            // SOLUTION: We don't pass this callback to useAetherVoice anymore.
            // We use useEffect to trigger the API call when voice input completes?
            // OR we use a ref for speak?
            
            // Wait, useAetherVoice calls onInputComplete.
            // I can't call 'speak' inside here directly if 'speak' comes from useAetherVoice return.
            // BUT I can use a ref that is updated by the component.
            speakRef.current(assistantMessage);
        } else {
            logger.warn('APP', 'Empty response received');
            speakRef.current("I'm sorry, I didn't catch that.");
        }

    } catch (e: any) {
        logger.error('APP', 'Failed to send request', { error: e.message });
        speakRef.current("I'm having trouble connecting. Please try again.");
    }
  }, []);

  // Mutable ref to hold the speak function so we can call it from the input handler
  const speakRef = useRef<(text: string) => void>(() => {});

  const { state, startListening, stopListening, reset, speak } = useAetherVoice(handleInputComplete);

  // Keep speakRef updated
  useEffect(() => {
      speakRef.current = speak;
  }, [speak]);

  // Timeout Watchdog
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (state === 'processing') {
      timeoutId = setTimeout(() => {
        logger.error('APP', 'Request timed out', { thresholdMs: 15000 });
        reset();
      }, 15000); // 15s timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state, reset]);

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

  const handleTestApi = async () => {
    logger.info('APP', 'Testing API connection...');
    try {
      const start = Date.now();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: 'PING' }] 
        })
      });
      
      if (!res.ok) {
        const text = await res.text();
        logger.error('API', 'Test failed', { status: res.status, body: text });
        throw new Error(`API responded with ${res.status}: ${text}`);
      }
      
      // Consume stream
      const reader = res.body?.getReader();
      if (reader) {
        await reader.read(); 
        reader.cancel();
      }
      
      logger.info('API', 'Test successful', { latencyMs: Date.now() - start });
    } catch (e: any) {
      logger.error('API', 'Test error', { message: e.message });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <DebugOverlay isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} onTestApi={handleTestApi} />
      
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
