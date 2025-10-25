import { useState, useCallback } from 'react';
import type { VoiceState, VoiceCommand } from '../types/voice';
import { isRealtimeEnabled } from '../config/voice';

/**
 * 🎤 Voice Recognition Hook
 * 
 * Note: When OpenAI Realtime is enabled, voice input/output is handled by useRealtimeAudio hook.
 * This hook maintains compatibility for non-Realtime mode (not currently used).
 */
export const useVoiceRecognition = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isActive: false,
    transcript: '',
    error: null,
    lastCommand: null,
  });

  // Check if Realtime API is enabled (which we are using)
  const isSupported = useCallback(() => {
    // If Realtime API is enabled, this hook is not used for actual recognition
    // The useRealtimeAudio hook handles that
    return isRealtimeEnabled();
  }, []);

  // Note: When using OpenAI Realtime, voice recognition is handled by useRealtimeAudio hook
  // This hook is kept for compatibility but doesn't initialize Web Speech API

  // Handle wake words
  const handleWakeWords = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();

    // Check for "be my eye" wake word
    if (normalizedCommand.includes('be my eye') && !normalizedCommand.includes('stop')) {
      console.log('Wake word detected: be my eye');
      setVoiceState(prev => ({
        ...prev,
        isActive: true,
        error: null,
      }));
    }

    // Check for "stop be my eye" wake word
    if (normalizedCommand.includes('stop be my eye') || 
        (normalizedCommand.includes('stop') && voiceState.isActive)) {
      console.log('Stop command detected');
      setVoiceState(prev => ({
        ...prev,
        isActive: false,
      }));
    }
  }, [voiceState.isActive]);

  // Start listening
  // Note: When Realtime is enabled, actual listening is handled by useRealtimeAudio
  const startListening = useCallback(() => {
    console.log('🎤 startListening called - using OpenAI Realtime for voice recognition');
    setVoiceState(prev => ({
      ...prev,
      isListening: true,
      error: null,
    }));
  }, []);

  // Stop listening
  // Note: When Realtime is enabled, actual stopping is handled by useRealtimeAudio
  const stopListening = useCallback(() => {
    console.log('🎤 stopListening called');
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isActive: false,
    }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState.isListening, startListening, stopListening]);

  // Clear error
  const clearError = useCallback(() => {
    setVoiceState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    voiceState,
    startListening,
    stopListening,
    toggleListening,
    clearError,
    isSupported: isSupported(),
  };
};

