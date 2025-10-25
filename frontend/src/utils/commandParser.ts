// Command parser utility for voice commands

export interface ParsedCommand {
  type: 'wake' | 'stop' | 'help' | 'question' | 'unknown';
  action: string;
  confidence: number;
  originalText: string;
}

export const parseVoiceCommand = (
  transcript: string,
  confidence: number
): ParsedCommand => {
  const normalized = transcript.toLowerCase().trim();

  // Wake word detection
  if (normalized.includes('be my eye') && !normalized.includes('stop')) {
    return {
      type: 'wake',
      action: 'activate_vision',
      confidence,
      originalText: transcript,
    };
  }

  // Stop command detection
  if (normalized.includes('stop be my eye') || 
      (normalized.includes('stop') && normalized.includes('eye'))) {
    return {
      type: 'stop',
      action: 'deactivate_vision',
      confidence,
      originalText: transcript,
    };
  }

  // Help command detection
  if (normalized.includes('help') || 
      normalized.includes('how do i') ||
      normalized.includes('what can you')) {
    return {
      type: 'help',
      action: 'show_help',
      confidence,
      originalText: transcript,
    };
  }

  // Question detection
  if (normalized.includes('what') || 
      normalized.includes('where') ||
      normalized.includes('how') ||
      normalized.includes('who') ||
      normalized.includes('when') ||
      normalized.includes('why') ||
      normalized.endsWith('?')) {
    return {
      type: 'question',
      action: 'answer_question',
      confidence,
      originalText: transcript,
    };
  }

  // Unknown command
  return {
    type: 'unknown',
    action: 'none',
    confidence,
    originalText: transcript,
  };
};

// Test if command is a wake word
export const isWakeWord = (command: string): boolean => {
  const normalized = command.toLowerCase().trim();
  return normalized.includes('be my eye') && !normalized.includes('stop');
};

// Test if command is a stop word
export const isStopWord = (command: string): boolean => {
  const normalized = command.toLowerCase().trim();
  return normalized.includes('stop be my eye') || 
         (normalized.includes('stop') && normalized.includes('eye'));
};

// Get command type as string
export const getCommandType = (command: string): string => {
  const parsed = parseVoiceCommand(command, 1.0);
  return parsed.type;
};

// Validate command confidence
export const isHighConfidence = (confidence: number): boolean => {
  return confidence >= 0.7; // 70% or higher
};

// Format confidence as percentage
export const formatConfidence = (confidence: number): string => {
  return `${(confidence * 100).toFixed(0)}%`;
};

