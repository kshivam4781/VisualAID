/**
 * 🎤 Voice Configuration
 * 
 * Configure voice input/output method for VisualAID
 */

export type VoiceMode = 'browser' | 'openai-realtime';

export interface VoiceConfig {
  // Voice output mode
  mode: VoiceMode;
  
  // Browser TTS settings (when mode === 'browser')
  browserTTS: {
    rate: number;
    pitch: number;
    volume: number;
    lang: string;
  };
  
  // OpenAI Realtime settings (when mode === 'openai-realtime')
  realtimeAPI: {
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    enabled: boolean;
  };
}

/**
 * 🎯 Default Voice Configuration
 * 
 * Change mode to 'openai-realtime' to use OpenAI Realtime API
 * Change mode to 'browser' to use browser TTS (free)
 */
export const voiceConfig: VoiceConfig = {
  // Switch between 'browser' and 'openai-realtime'
  mode: 'openai-realtime', // Using OpenAI Realtime API with nova voice
  
  browserTTS: {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US'
  },
  
  realtimeAPI: {
    voice: 'nova', // Using nova voice consistently throughout the system
    enabled: true
  }
};

/**
 * Check if Realtime API is enabled
 */
export const isRealtimeEnabled = () => voiceConfig.mode === 'openai-realtime';

/**
 * Check if browser TTS is enabled
 */
export const isBrowserTTSEnabled = () => voiceConfig.mode === 'browser';

