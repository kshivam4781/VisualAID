import type { MenuState, MenuPrompt } from '../types/menu';

// Menu prompts for different states
export const getMenuPrompt = (menuState: MenuState): MenuPrompt => {
  switch (menuState) {
    case 'main_menu':
      return {
        state: 'main_menu',
        text: "How can I help you today? You can say 'be my eye' to start vision assistance, 'help' for instructions, or ask me a question.",
        options: [
          "Say 'be my eye' to activate vision mode",
          "Say 'help' for detailed instructions",
          "Ask me any question"
        ]
      };
    
    case 'help':
      return {
        state: 'help',
        text: "Here's what I can do. Say 'be my eye' to activate vision assistance mode where I'll help you navigate your surroundings. Say 'stop be my eye' to deactivate vision mode. You can also ask me questions anytime. Say 'menu' to return to the main menu.",
        options: [
          "'be my eye' - Start vision assistance",
          "'stop be my eye' - Stop vision assistance",
          "'menu' or 'go back' - Return to main menu",
          "Ask questions anytime"
        ]
      };
    
    case 'vision_mode':
      return {
        state: 'vision_mode',
        text: "Vision mode is now active. I'm watching and ready to help you navigate. Say 'stop be my eye' when you're done.",
        options: [
          "'stop be my eye' to deactivate",
          "Ask questions while I guide you"
        ]
      };
    
    case 'greeting':
      return {
        state: 'greeting',
        text: "Welcome to VisualAID. I'm your AI-powered visual assistant.",
        options: []
      };
    
    case 'idle':
    default:
      return {
        state: 'idle',
        text: "Click the microphone to start.",
        options: []
      };
  }
};

// Get short prompt for menu state
export const getShortMenuPrompt = (menuState: MenuState): string => {
  switch (menuState) {
    case 'main_menu':
      return "How can I help you?";
    case 'help':
      return "Here's what I can do.";
    case 'vision_mode':
      return "Vision mode active.";
    case 'greeting':
      return "Welcome!";
    case 'idle':
    default:
      return "Ready to start.";
  }
};

// Parse voice command to determine menu action
export const parseMenuCommand = (command: string, currentMenu: MenuState): {
  action: 'navigate' | 'activate_vision' | 'deactivate_vision' | 'help' | 'back' | 'none';
  targetMenu?: MenuState;
  response?: string;
} => {
  const normalized = command.toLowerCase().trim();

  // Vision activation
  if (normalized.includes('be my eye') && !normalized.includes('stop')) {
    return {
      action: 'activate_vision',
      targetMenu: 'vision_mode',
      response: "Activating vision assistance mode."
    };
  }

  // Vision deactivation
  if (normalized.includes('stop be my eye') || 
      (normalized.includes('stop') && currentMenu === 'vision_mode')) {
    return {
      action: 'deactivate_vision',
      targetMenu: 'main_menu',
      response: "Vision mode deactivated. Returning to main menu."
    };
  }

  // Help command
  if (normalized.includes('help') || 
      normalized.includes('how do i') ||
      normalized.includes('what can you do') ||
      normalized.includes('what can i say')) {
    return {
      action: 'help',
      targetMenu: 'help',
      response: "Let me explain what I can do."
    };
  }

  // Back/Menu navigation
  if (normalized.includes('menu') || 
      normalized.includes('go back') ||
      normalized.includes('main menu') ||
      normalized.includes('return')) {
    return {
      action: 'back',
      targetMenu: 'main_menu',
      response: "Returning to main menu."
    };
  }

  return {
    action: 'none'
  };
};

