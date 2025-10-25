import type { GreetingMessage, GreetingType } from '../types/voice';

// Greeting messages with conversational tone
export const greetings: Record<GreetingType, string[]> = {
  welcome: [
    "Hello! I'm VisualAID, your AI-powered visual assistant. How can I help you today?",
    "Welcome back! I'm here to be your eyes. Just say 'be my eye' when you're ready.",
    "Hi there! I'm VisualAID, ready to help you navigate your surroundings. What would you like to do?",
  ],
  activated: [
    "Be my eye mode activated. I'm watching and ready to guide you.",
    "Vision mode is now active. I'll describe what I see to help you navigate safely.",
    "Got it! I'm now your eyes. Let's navigate together.",
  ],
  deactivated: [
    "Be my eye mode deactivated. I'm here if you need me again.",
    "Vision mode stopped. Say 'be my eye' whenever you need help.",
    "Alright, stopping vision assistance. I'm still listening if you need anything.",
  ],
  help: [
    "I can help you navigate your surroundings. Say 'be my eye' to activate vision mode, or 'stop be my eye' to deactivate. What would you like to do?",
    "Here's what I can do: Say 'be my eye' and I'll describe your surroundings and help you avoid obstacles. Say 'stop be my eye' when you're done. How can I assist you?",
  ],
  error: [
    "I'm sorry, I encountered an error. Please try again.",
    "Oops, something went wrong. Let me try that again.",
  ],
};

// Get random greeting message
export const getGreeting = (type: GreetingType): GreetingMessage => {
  const messages = greetings[type];
  const randomIndex = Math.floor(Math.random() * messages.length);
  
  let priority: 'high' | 'normal' | 'low' = 'normal';
  
  // Set priority based on type
  switch (type) {
    case 'activated':
    case 'error':
      priority = 'high';
      break;
    case 'deactivated':
    case 'help':
      priority = 'normal';
      break;
    case 'welcome':
      priority = 'low';
      break;
  }
  
  return {
    type,
    text: messages[randomIndex],
    priority,
  };
};

// Conversational responses for different scenarios
export const conversationalResponses = {
  // Wake word responses
  wakeWordDetected: [
    "I hear you!",
    "Yes, I'm listening.",
    "I'm here!",
  ],
  
  // Confirmation responses
  understood: [
    "Got it!",
    "Understood.",
    "Okay!",
  ],
  
  // Obstacle alerts (will be used in Phase 3)
  obstacleAhead: [
    "Careful! There's an obstacle ahead.",
    "Watch out! I see something in your path.",
    "Stop! There's an object directly in front of you.",
  ],
  
  // Encouragement
  encouragement: [
    "You're doing great!",
    "Nice and steady!",
    "Perfect, keep going!",
  ],
};

// Get time-based greeting
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Good morning!";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon!";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening!";
  } else {
    return "Hello!";
  }
};

// Get random response from array
export const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

