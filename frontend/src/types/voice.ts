// Voice recognition types
export interface VoiceCommand {
  command: string;
  transcript: string;
  timestamp: Date;
  confidence: number;
}

export interface VoiceState {
  isListening: boolean;
  isActive: boolean; // "be my eye" mode active
  transcript: string;
  error: string | null;
  lastCommand: VoiceCommand | null;
}

export type WakeWord = 'be my eye' | 'stop be my eye';

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Text-to-Speech types
export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  error: string | null;
  currentText: string | null;
}

// Greeting types
export type GreetingType = 'welcome' | 'activated' | 'deactivated' | 'help' | 'error';

export interface GreetingMessage {
  type: GreetingType;
  text: string;
  priority: 'high' | 'normal' | 'low';
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
