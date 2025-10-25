import { useState, useEffect, useRef, useCallback } from 'react';

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  error: string | null;
  currentText: string | null;
}

export interface TTSOptions {
  rate?: number;      // Speed: 0.1 to 10 (default: 1)
  pitch?: number;     // Pitch: 0 to 2 (default: 1)
  volume?: number;    // Volume: 0 to 1 (default: 1)
  voice?: string;     // Voice name (optional)
  lang?: string;      // Language code (default: 'en-US')
}

export const useTextToSpeech = (options: TTSOptions = {}) => {
  const [ttsState, setTTSState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    error: null,
    currentText: null,
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);

  // Check if browser supports Web Speech Synthesis API
  const isSupported = useCallback(() => {
    return 'speechSynthesis' in window;
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported()) {
      setTTSState(prev => ({
        ...prev,
        error: 'Text-to-speech is not supported in this browser.',
      }));
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Log available voices for debugging
      if (availableVoices.length > 0) {
        console.log('Available voices:', availableVoices.map(v => ({ name: v.name, lang: v.lang })));
      }
    };

    // Chrome loads voices asynchronously
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Select the best voice based on options
  const selectVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    const lang = options.lang || 'en-US';

    // If a specific voice name is requested
    if (options.voice) {
      const voice = voices.find(v => v.name === options.voice);
      if (voice) return voice;
    }

    // Find best match for language
    // Prefer local voices over Google/remote voices for better performance
    const localVoices = voices.filter(v => v.localService && v.lang.startsWith(lang.split('-')[0]));
    if (localVoices.length > 0) {
      // Prefer female voices for accessibility (generally considered more pleasant)
      const femaleVoice = localVoices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('zira')
      );
      return femaleVoice || localVoices[0];
    }

    // Fallback to any voice matching language
    const langVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    return langVoice || voices[0];
  }, [voices, options.voice, options.lang]);

  // Internal function to actually speak (without interrupt logic)
  const speakNow = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    utterance.lang = options.lang || 'en-US';

    // Select voice
    const voice = selectVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Event handlers
    utterance.onstart = () => {
      console.log('Speech started:', text);
      setTTSState(prev => ({
        ...prev,
        isSpeaking: true,
        isPaused: false,
        error: null,
        currentText: text,
      }));
    };

    utterance.onend = () => {
      console.log('Speech ended');
      setTTSState(prev => ({
        ...prev,
        isSpeaking: false,
        currentText: null,
      }));

      // Process queue if there are pending texts
      if (queueRef.current.length > 0) {
        const nextText = queueRef.current.shift();
        if (nextText) {
          setTimeout(() => speak(nextText), 100);
        }
      }
    };

    utterance.onerror = (event) => {
      // These are expected when we cancel/interrupt speech, not real errors
      if (event.error === 'canceled' || event.error === 'interrupted') {
        console.log('Speech interrupted (expected)');
        setTTSState(prev => ({
          ...prev,
          isSpeaking: false,
        }));
        return;
      }
      
      // 'not-allowed' means user hasn't interacted yet (autoplay policy)
      if (event.error === 'not-allowed') {
        console.warn('Speech blocked by browser autoplay policy - user interaction required');
        setTTSState(prev => ({
          ...prev,
          isSpeaking: false,
        }));
        return;
      }
      
      // Real errors
      console.error('Speech error:', event);
      setTTSState(prev => ({
        ...prev,
        isSpeaking: false,
        error: `Speech error: ${event.error}`,
      }));
    };

    utterance.onpause = () => {
      setTTSState(prev => ({ ...prev, isPaused: true }));
    };

    utterance.onresume = () => {
      setTTSState(prev => ({ ...prev, isPaused: false }));
    };

    utteranceRef.current = utterance;

    // Ensure speech synthesis is ready
    if (window.speechSynthesis.speaking) {
      console.warn('Speech synthesis busy, waiting...');
      setTimeout(() => window.speechSynthesis.speak(utterance), 100);
    } else {
      // Speak!
      window.speechSynthesis.speak(utterance);
    }
  }, [options, selectVoice]);

  // Speak text (with interrupt logic)
  const speak = useCallback((text: string, interrupt: boolean = false) => {
    if (!isSupported()) {
      setTTSState(prev => ({
        ...prev,
        error: 'Text-to-speech is not supported.',
      }));
      return;
    }

    // If interrupting, cancel current speech
    if (interrupt) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      // Give browser time to cancel before starting new speech
      setTimeout(() => speakNow(text), 50);
      return;
    }

    // If already speaking and not interrupting, queue the text
    if (ttsState.isSpeaking && !interrupt) {
      queueRef.current.push(text);
      return;
    }

    speakNow(text);
  }, [isSupported, ttsState.isSpeaking, speakNow]);

  // Stop speaking
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setTTSState(prev => ({
      ...prev,
      isSpeaking: false,
      isPaused: false,
      currentText: null,
    }));
  }, []);

  // Pause speaking
  const pause = useCallback(() => {
    if (ttsState.isSpeaking && !ttsState.isPaused) {
      window.speechSynthesis.pause();
    }
  }, [ttsState.isSpeaking, ttsState.isPaused]);

  // Resume speaking
  const resume = useCallback(() => {
    if (ttsState.isSpeaking && ttsState.isPaused) {
      window.speechSynthesis.resume();
    }
  }, [ttsState.isSpeaking, ttsState.isPaused]);

  // Clear error
  const clearError = useCallback(() => {
    setTTSState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ttsState,
    speak,
    stop,
    pause,
    resume,
    clearError,
    isSupported: isSupported(),
    voices,
  };
};

