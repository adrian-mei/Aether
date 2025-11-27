import { useEffect, useRef } from 'react';
import { Env } from '@/shared/config/env';
import { logger } from '@/shared/lib/logger';
import { audioPlayer } from '@/shared/utils/voice/audio-player';
import { SessionStatus, VoiceState, TextSource } from '../Session.logic';

interface UseRealtimeSessionProps {
  status: SessionStatus;
  sessionId?: string;
  setVoiceState: (state: VoiceState) => void;
  setTranscript: (text: string) => void;
  setCurrentAssistantMessage: (text: string) => void;
  setCurrentMessageDuration: (duration: number) => void;
  setCurrentChunkDuration: (duration: number | undefined) => void;
  setActiveText: (text: string) => void;
  setActiveTextSource: (source: TextSource) => void;
  onLimitReached: () => void;
}

// VAD Constants
const VAD_THRESHOLD = 0.02; // RMS Threshold
const SILENCE_DURATION = 800; // ms to wait before committing
const AUDIO_TIMEOUT_MS = 3000; // 3s timeout for audio promise

export function useRealtimeSession({
  status,
  sessionId,
  setVoiceState,
  setTranscript,
  setCurrentAssistantMessage,
  setCurrentMessageDuration,
  setCurrentChunkDuration,
  setActiveText,
  setActiveTextSource,
  onLimitReached,
}: UseRealtimeSessionProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);
  const micStartTimeRef = useRef<number>(0);
  const currentVoiceStateRef = useRef<VoiceState>('idle');
  const recognitionRef = useRef<any>(null);
  const turnStartIndexRef = useRef<number>(0);
  const isNewTurnRef = useRef<boolean>(true);

  // Synchronization Queues
  const pendingAudioRef = useRef<Array<Promise<{ data: Float32Array; sampleRate: number }>>>([]);
  const pendingAudioResolversRef = useRef<Array<(val: { data: Float32Array; sampleRate: number }) => void>>([]);
  const playOperationChain = useRef<Promise<void>>(Promise.resolve());
  const playbackPromiseRef = useRef<Promise<void> | null>(null);

  // Microphone Setup
  useEffect(() => {
    if (status === 'connected') {
      startMicrophone();
      startSpeechRecognition();
    } else {
      stopMicrophone();
      stopSpeechRecognition();
    }
    
    return () => {
      stopMicrophone();
      stopSpeechRecognition();
    };
  }, [status]);

  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // STRICT TURN-TAKING: Only process STT if we are in 'listening' state.
        if (currentVoiceStateRef.current !== 'listening') {
             return;
        }

        // Handle browser-specific reset of results array
        if (turnStartIndexRef.current > event.resultIndex || turnStartIndexRef.current >= event.results.length) {
            turnStartIndexRef.current = 0;
        }

        // Handle turn-based accumulation
        if (isNewTurnRef.current) {
            turnStartIndexRef.current = event.resultIndex;
            isNewTurnRef.current = false;
        }

        let currentTurnTranscript = '';
        for (let i = turnStartIndexRef.current; i < event.results.length; ++i) {
             currentTurnTranscript += event.results[i][0].transcript;
        }
        
        if (currentTurnTranscript) {
            setTranscript(currentTurnTranscript);
            setActiveText(currentTurnTranscript);
            setActiveTextSource('user');
        }
      };

      recognition.onerror = (event: any) => {
        logger.warn('STT', 'Speech recognition error', event.error);
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      logger.info('STT', 'Browser Speech Recognition Started');

    } catch (e) {
      logger.warn('STT', 'Failed to start browser speech recognition', e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000 // Request 16kHz if possible
      } });
      
      streamRef.current = stream;
      micStartTimeRef.current = Date.now();
      const ctx = new window.AudioContext({ sampleRate: 16000 }); // Try to match
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        // IGNORE STARTUP POP: Ignore audio for the first 1s after mic start
        if (Date.now() - micStartTimeRef.current < 1000) {
            return;
        }

        // STRICT TURN-TAKING: Only process audio if we are in 'listening' state.
        // This effectively mutes the microphone during 'idle', 'processing', and 'speaking' states.
        if (currentVoiceStateRef.current !== 'listening') {
             return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // 1. Calculate RMS for VAD
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // 2. VAD Logic
        if (rms > VAD_THRESHOLD) {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            logger.info('VAD', 'Speech Detected');

            // Clear text immediately for new turn (Visual Responsiveness)
            setTranscript('');
            setActiveText('');
            setActiveTextSource('user');
            isNewTurnRef.current = true;

            sendEvent({ type: 'user.started_speaking' });
            // State is already 'listening', so no need to set it, but good for consistency
            // setVoiceState('listening'); 
          }

          // Clear silence timeout if speaking
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else if (isSpeakingRef.current) {
          // Silence detected while speaking -> Wait before committing
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              logger.info('VAD', 'Silence Detected (Commit)');
              sendEvent({ type: 'user.stopped_speaking' });
              setVoiceState('processing');
            }, SILENCE_DURATION);
          }
        }

        // 3. Stream Audio if Speaking (or holding silence)
        if (isSpeakingRef.current || silenceTimeoutRef.current) {
          // Convert Float32 to Int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send raw binary
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(int16Data.buffer);
          }
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination); // Necessary for script processor to run

    } catch (e) {
      logger.error('Mic', 'Failed to start microphone', e);
    }
  };

  const stopMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
  };

  const sendEvent = (event: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  useEffect(() => {
    // Only connect if status is connected and we have a sessionId
    if (status !== 'connected' || !sessionId) {
      // Cleanup if we disconnect
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) return; // Already connected

    const wsUrl = `${Env.NEXT_PUBLIC_WS_URL}/session/stream?sessionId=${sessionId}`;
    logger.info('WS', `Connecting to ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    socket.binaryType = 'arraybuffer'; // We want ArrayBuffer for decoding

    socket.onopen = () => {
      logger.info('WS', 'Connected to Aether Voice Stream');
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Audio Chunk: Queue Promise & Start Decoding
        logger.debug('WS', `Received Audio Chunk. Queue size: ${pendingAudioRef.current.length}`);
        let resolver: ((val: { data: Float32Array; sampleRate: number }) => void) | undefined;
        const promise = new Promise<{ data: Float32Array; sampleRate: number }>((resolve) => {
          resolver = resolve;
        });

        pendingAudioRef.current.push(promise);
        if (resolver) pendingAudioResolversRef.current.push(resolver);

        try {
          // Use AudioPlayer's context to decode (avoid creating new contexts)
          const audioBuffer = await audioPlayer.decodeAudioData(event.data);
          const data = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          
          logger.debug('WS', `Decoded Audio Chunk (${data.length} samples). Resolving promise.`);
          if (resolver) resolver({ data, sampleRate });
        } catch (e) {
          logger.error('WS', 'Failed to decode audio chunk', e);
          if (resolver) resolver({ data: new Float32Array(0), sampleRate: 0 });
        }
      } else {
        // JSON Event
        try {
          const msg = JSON.parse(event.data);
          logger.debug('WS', 'Received event', msg);

          switch (msg.type) {
            case 'user.started_speaking':
              // Only reset text/state if we aren't already listening (to avoid wiping local VAD progress)
              if (currentVoiceStateRef.current !== 'listening') {
                  setVoiceState('listening');
                  setTranscript(''); // Clear previous transcript
                  setActiveText(''); // Clear text for new turn
                  setActiveTextSource('user');
                  setCurrentChunkDuration(undefined); // Clear chunk duration
                  isNewTurnRef.current = true; // Reset transcript accumulation for new turn
                  currentVoiceStateRef.current = 'listening';
              }

              // Always clear queues on interruption/start
              pendingAudioRef.current = [];
              pendingAudioResolversRef.current = [];
              break;
            case 'user.stopped_speaking':
              setVoiceState('processing');
              currentVoiceStateRef.current = 'processing';
              break;
            case 'ai.thinking':
              setVoiceState('processing');
              currentVoiceStateRef.current = 'processing';
              break;
            case 'ai.started_speaking':
              setVoiceState('speaking');
              setTranscript(''); // Clear user transcript as AI takes over
              currentVoiceStateRef.current = 'speaking';
              break;
            case 'ai.stopped_speaking':
              // Wait for playback to finish before switching to listening
              playOperationChain.current = playOperationChain.current.then(async () => {
                if (playbackPromiseRef.current) {
                  await playbackPromiseRef.current;
                }
                setVoiceState('listening');
                currentVoiceStateRef.current = 'listening';
              });
              break;
            case 'ai.text':
              // Sync: Pop audio promise and queue playback
              const audioPromise = pendingAudioRef.current.shift();
              pendingAudioResolversRef.current.shift();
              logger.debug('WS', `Received ai.text: "${msg.text}". Paired with audio? ${!!audioPromise}`);

              playOperationChain.current = playOperationChain.current.then(async () => {
                if (audioPromise) {
                  try {
                    // Add timeout to audio promise
                    const { data, sampleRate } = await Promise.race([
                      audioPromise,
                      new Promise<{ data: Float32Array; sampleRate: number }>((_, reject) =>
                        setTimeout(() => reject(new Error('Audio timeout')), AUDIO_TIMEOUT_MS)
                      )
                    ]);
                    logger.debug('WS', `Processing Playback. Audio data size: ${data.length}`);

                    if (data.length > 0) {
                      const duration = data.length / sampleRate;
                      const playbackPromise = audioPlayer.play(data, sampleRate, {
                        onStart: (actualDuration) => {
                          logger.debug('WS', `Playback Started. Displaying text: "${msg.text}", duration: ${actualDuration.toFixed(2)}s`);
                          if (msg.text) {
                              setCurrentAssistantMessage(msg.text);
                              setActiveText(msg.text);
                              setActiveTextSource('ai');
                              setCurrentChunkDuration(actualDuration);
                          }
                          setCurrentMessageDuration(duration);
                        }
                      });
                      playbackPromiseRef.current = playbackPromise;
                      setVoiceState('speaking');
                    } else {
                      // Fallback for empty audio
                      logger.warn('WS', 'Audio was empty. Displaying text immediately.');
                      if (msg.text) {
                          setCurrentAssistantMessage(msg.text);
                          setActiveText(msg.text);
                          setActiveTextSource('ai');
                          setCurrentChunkDuration(undefined);
                      }
                    }
                  } catch (error) {
                    // Audio timeout or decode error - display text immediately with fixed speed
                    logger.warn('WS', `Audio error: ${error instanceof Error ? error.message : 'Unknown'}. Displaying text without audio sync.`);
                    if (msg.text) {
                        setCurrentAssistantMessage(msg.text);
                        setActiveText(msg.text);
                        setActiveTextSource('ai');
                        setCurrentChunkDuration(undefined); // No audio = fallback to fixed speed
                    }
                  }
                } else {
                  // Fallback for missing audio
                  logger.warn('WS', 'No pending audio for text. Displaying immediately.');
                  if (msg.text) {
                      setCurrentAssistantMessage(msg.text);
                      setActiveText(msg.text);
                      setActiveTextSource('ai');
                      setCurrentChunkDuration(undefined);
                  }
                }
              });
              break;
            case 'user.transcript':
              // Fallback: Update transcript from backend if provided
              // This ensures text appears even if client-side STT fails or is unsupported
              if (msg.text) {
                setTranscript(msg.text);
                setActiveText(msg.text);
                setActiveTextSource('user');
              }
              break;
            case 'limit_reached':
              logger.warn('Session', 'Rate limit reached');
              playOperationChain.current = playOperationChain.current.then(async () => {
                if (playbackPromiseRef.current) {
                  await playbackPromiseRef.current;
                }
                onLimitReached();
                setVoiceState('idle');
              });
              break;
          }
        } catch (e) {
          logger.error('WS', 'Failed to parse JSON event', e);
        }
      }
    };

    socket.onerror = (error) => {
      logger.error('WS', 'WebSocket Error', error);
      // setStatus('error')? We might want to notify parent.
    };

    socket.onclose = () => {
      logger.info('WS', 'Disconnected');
      socketRef.current = null;
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [status, sessionId, setVoiceState, setTranscript, setCurrentAssistantMessage]);
}
