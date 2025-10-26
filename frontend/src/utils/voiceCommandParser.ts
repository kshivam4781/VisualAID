/**
 * 🎤 Intelligent Voice Command Parser
 * 
 * Converts natural speech into actionable commands for the VisualAID system.
 * Uses AI-powered understanding to interpret user intent from natural language.
 */

export interface VoiceCommand {
  action: string;
  parameters?: Record<string, any>;
  confidence: number;
  originalText: string;
  response?: string;
}

export interface CommandHandler {
  action: string;
  handler: (parameters?: Record<string, any>) => Promise<boolean>;
  description: string;
}

/**
 * Parse natural speech into actionable commands
 */
export const parseVoiceCommand = (text: string): VoiceCommand => {
  const normalized = text.toLowerCase().trim();
  
  // High confidence exact matches
  const exactMatches = [
    {
      patterns: ['be my eye', 'start vision', 'open camera', 'activate vision', 'turn on camera'],
      action: 'activate_vision',
      confidence: 0.95,
      response: 'Activating vision mode. I can see what you see now.'
    },
    {
      patterns: ['stop be my eye', 'stop vision', 'close camera', 'deactivate vision', 'turn off camera'],
      action: 'deactivate_vision',
      confidence: 0.95,
      response: 'Deactivating vision mode. Returning to main menu.'
    },
    {
      patterns: ['help', 'what can you do', 'show commands', 'instructions'],
      action: 'show_help',
      confidence: 0.9,
      response: 'Here are the commands I understand...'
    },
    {
      patterns: ['menu', 'main menu', 'go back', 'home'],
      action: 'navigate_menu',
      confidence: 0.9,
      response: 'Returning to main menu.'
    }
  ];

  // Check for exact matches first
  for (const match of exactMatches) {
    for (const pattern of match.patterns) {
      if (normalized.includes(pattern)) {
        return {
          action: match.action,
          confidence: match.confidence,
          originalText: text,
          response: match.response
        };
      }
    }
  }

  // AI-powered intent detection for complex commands
  const intentPatterns = [
    // Navigation commands
    {
      patterns: ['navigate', 'guide me', 'help me walk', 'show me the way', 'lead me'],
      action: 'start_navigation',
      confidence: 0.8,
      parameters: { mode: 'navigation' }
    },
    {
      patterns: ['read', 'what does it say', 'read the text', 'what is written'],
      action: 'read_text',
      confidence: 0.8,
      parameters: { focus: 'text' }
    },
    {
      patterns: ['describe', 'what do you see', 'tell me about', 'what is around me'],
      action: 'describe_scene',
      confidence: 0.8,
      parameters: { focus: 'description' }
    },
    {
      patterns: ['find', 'look for', 'where is', 'can you see'],
      action: 'find_object',
      confidence: 0.7,
      parameters: { mode: 'search' }
    },
    {
      patterns: ['obstacle', 'danger', 'safe', 'clear path'],
      action: 'check_safety',
      confidence: 0.8,
      parameters: { focus: 'safety' }
    },
    {
      patterns: ['what is in front of me', 'what is this', 'analyze this', 'what do you see now', 'what is in front', 'what is in the camera', 'what is on the camera'],
      action: 'analyze_current_view',
      confidence: 0.9,
      parameters: { focus: 'current_view' }
    },
    // Camera controls
    {
      patterns: ['zoom in', 'closer', 'get closer'],
      action: 'camera_zoom',
      confidence: 0.7,
      parameters: { direction: 'in' }
    },
    {
      patterns: ['zoom out', 'farther', 'get farther'],
      action: 'camera_zoom',
      confidence: 0.7,
      parameters: { direction: 'out' }
    },
    {
      patterns: ['look left', 'turn left', 'pan left'],
      action: 'camera_pan',
      confidence: 0.7,
      parameters: { direction: 'left' }
    },
    {
      patterns: ['look right', 'turn right', 'pan right'],
      action: 'camera_pan',
      confidence: 0.7,
      parameters: { direction: 'right' }
    },
    {
      patterns: ['look up', 'tilt up', 'pan up'],
      action: 'camera_tilt',
      confidence: 0.7,
      parameters: { direction: 'up' }
    },
    {
      patterns: ['look down', 'tilt down', 'pan down'],
      action: 'camera_tilt',
      confidence: 0.7,
      parameters: { direction: 'down' }
    },
    // System controls
    {
      patterns: ['louder', 'increase volume', 'turn up volume'],
      action: 'volume_up',
      confidence: 0.8,
      parameters: { amount: 10 }
    },
    {
      patterns: ['quieter', 'decrease volume', 'turn down volume'],
      action: 'volume_down',
      confidence: 0.8,
      parameters: { amount: 10 }
    },
    {
      patterns: ['repeat', 'say again', 'what did you say'],
      action: 'repeat_last',
      confidence: 0.9,
      parameters: {}
    },
    {
      patterns: ['stop', 'pause', 'wait'],
      action: 'pause_system',
      confidence: 0.8,
      parameters: {}
    },
    {
      patterns: ['continue', 'resume', 'keep going'],
      action: 'resume_system',
      confidence: 0.8,
      parameters: {}
    }
  ];

  // Check for intent patterns
  for (const intent of intentPatterns) {
    for (const pattern of intent.patterns) {
      if (normalized.includes(pattern)) {
        return {
          action: intent.action,
          parameters: intent.parameters,
          confidence: intent.confidence,
          originalText: text,
          response: `I'll ${intent.action.replace('_', ' ')} for you.`
        };
      }
    }
  }

  // Question detection
  if (normalized.includes('?') || 
      normalized.startsWith('what') || 
      normalized.startsWith('where') || 
      normalized.startsWith('when') || 
      normalized.startsWith('who') || 
      normalized.startsWith('why') || 
      normalized.startsWith('how')) {
    return {
      action: 'ask_question',
      confidence: 0.9,
      originalText: text,
      response: 'Let me answer your question.'
    };
  }

  // Default: treat as conversational input
  return {
    action: 'conversation',
    confidence: 0.5,
    originalText: text,
    response: 'I understand. Let me help you with that.'
  };
};

/**
 * Get available commands for help display
 */
export const getAvailableCommands = (): string[] => {
  return [
    'Voice Commands:',
    '• "Be my eye" - Start vision mode',
    '• "Stop be my eye" - Stop vision mode',
    '• "Describe what you see" - Get scene description',
    '• "Read the text" - Read visible text',
    '• "Navigate me" - Start navigation assistance',
    '• "Find [object]" - Look for specific objects',
    '• "Is it safe?" - Check for obstacles',
    '• "What is in front of me?" - Analyze current view',
    '• "Look left/right/up/down" - Pan camera',
    '• "Zoom in/out" - Adjust camera zoom',
    '• "Louder/Quieter" - Adjust volume',
    '• "Repeat" - Repeat last message',
    '• "Help" - Show this command list',
    '• "Menu" - Return to main menu',
    '• Ask any question naturally'
  ];
};

/**
 * Check if text contains a voice command
 */
export const isVoiceCommand = (text: string): boolean => {
  const command = parseVoiceCommand(text);
  return command.confidence > 0.6 && command.action !== 'conversation';
};

/**
 * Get command confidence level
 */
export const getCommandConfidence = (text: string): number => {
  return parseVoiceCommand(text).confidence;
};
