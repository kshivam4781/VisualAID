import { useState, useCallback, useRef } from 'react';

export interface OpenAITTSState {
  isSpeaking: boolean;
  error: string | null;
  currentText: string | null;
}

export interface OpenAITTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number; // 0.25 to 4.0
  context?: 'greeting' | 'navigation' | 'alert' | 'description';
}

/**
 * 🔊 OpenAI Text-to-Speech Hook
 * 
 * Uses OpenAI's natural AI voice for all speech output.
 * Replaces robotic browser TTS with high-quality AI voice.
 */
export const useOpenAITTS = (options: OpenAITTSOptions = {}) => {
  const [state, setState] = useState<OpenAITTSState>({
    isSpeaking: false,
    error: null,
    currentText: null
  });

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Array<{ text: string; interrupt: boolean }>>([]);
  const isProcessingRef = useRef(false);

  /**
   * 🔊 Speak text using OpenAI TTS
   */
  const speak = useCallback(async (text: string, interrupt: boolean = false) => {
    if (!text || text.trim() === '') {
      console.warn('⚠️ Empty text provided to speak');
      return;
    }

    console.log(`🔊 OpenAI TTS request: "${text.substring(0, 50)}..."${interrupt ? ' (interrupt)' : ''}`);

    // If interrupt, stop current speech and clear queue
    if (interrupt) {
      stop();
      audioQueueRef.current = [];
    }

    // Add to queue
    audioQueueRef.current.push({ text, interrupt });

    // Process queue if not already processing
    if (!isProcessingRef.current) {
      await processQueue();
    }
  }, []);

  /**
   * 📋 Process audio queue
   */
  const processQueue = async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift();
      if (!item) break;

      try {
        setState(prev => ({ ...prev, isSpeaking: true, currentText: item.text, error: null }));

        // Call backend TTS API
        const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${serverUrl}/api/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: item.text,
            voice: options.voice,
            context: options.context,
            speed: options.speed || 1.0
          })
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        // Wait for audio to finish playing
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio playback error'));
          };

          audio.play().catch(reject);
        });

        console.log('✅ OpenAI TTS audio played successfully');

      } catch (error: any) {
        console.error('❌ OpenAI TTS error:', error);
        setState(prev => ({ ...prev, error: error.message }));
      }
    }

    setState(prev => ({ ...prev, isSpeaking: false, currentText: null }));
    currentAudioRef.current = null;
    isProcessingRef.current = false;
  };

  /**
   * 🛑 Stop current speech
   */
  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setState(prev => ({ ...prev, isSpeaking: false, currentText: null }));
  }, []);

  /**
   * ❌ Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    speak,
    stop,
    clearError
  };
};

