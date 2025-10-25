import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceState, VoiceCommand } from '../types/voice';

export const useVoiceRecognition = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isActive: false,
    transcript: '',
    error: null,
    lastCommand: null,
  });

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<number | null>(null);

  // Check if browser supports Web Speech API
  const isSupported = useCallback(() => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported()) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.',
      }));
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setVoiceState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          
          // Create voice command
          const command: VoiceCommand = {
            command: transcript.toLowerCase().trim(),
            transcript: transcript,
            timestamp: new Date(),
            confidence: confidence,
          };

          console.log('Voice command detected:', command);

          setVoiceState(prev => ({
            ...prev,
            transcript: finalTranscript,
            lastCommand: command,
          }));

          // Check for wake words
          handleWakeWords(command.command);
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setVoiceState(prev => ({ ...prev, transcript: interimTranscript }));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'Voice recognition error occurred.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your audio settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      setVoiceState(prev => ({
        ...prev,
        error: errorMessage,
        isListening: false,
      }));
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setVoiceState(prev => ({ ...prev, isListening: false }));

      // Auto-restart if still in active mode
      if (voiceState.isActive) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, voiceState.isActive]);

  // Handle wake words
  const handleWakeWords = (command: string) => {
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
  };

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported()) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Speech recognition is not supported in this browser.',
      }));
      return;
    }

    try {
      if (recognitionRef.current && !voiceState.isListening) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error starting recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        error: 'Failed to start voice recognition.',
      }));
    }
  }, [isSupported, voiceState.isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    }
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

