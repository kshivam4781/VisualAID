/**
 * 🎤 Gemini Conversation Service
 * 
 * Handles real-time conversational AI using Gemini 2.0 Flash
 * - Natural conversation about anything
 * - Context-aware responses
 * - Can activate "be my eye" mode
 * - Can explain features
 * - Emotionally engaging responses
 * 
 * Cost: ~$0.01-0.02 per conversation (vs $0.30/min for OpenAI Realtime)
 * Speed: 500-1000ms response time
 * Quality: Excellent, natural conversations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.0 Flash - Fast and conversational
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.7, // Balanced - not too creative
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 256, // Short for chat, enough for vision descriptions
  }
});

// Active conversation sessions
const conversationSessions = new Map();

/**
 * System prompt for conversational AI
 */
const CONVERSATION_SYSTEM_PROMPT = `You are Nova, a friendly AI assistant for VisualAID - a vision assistance app for visually impaired users.

RESPONSE LENGTH - CRITICAL:
- Keep responses SHORT: 1-2 sentences maximum (unless describing vision/safety)
- Only give longer responses when describing what you see in vision mode or safety warnings
- Be concise and direct

SMART FILTERING - VERY IMPORTANT:
1. **Incomplete requests** - Ask for clarification instead of assuming:
   - "be my" → "What would you like me to be?"
   - "my eye" → "I'm not sure what you mean. Did you want me to 'be your eye' and help you see?"
   - "my eyes" → "I'm not sure what you mean. Did you want me to 'be your eyes' and help you see?"
   - "show me" → "Show you what?"
   - "help with" → "Help with what exactly?"
   
2. **Out-of-scope requests** - Politely decline with ONE sentence:
   - "be my ear" → "Sorry, I'm designed for vision assistance, not audio tasks."
   - "be my friend" → "I'm Nova, your vision assistant! I can help you see your surroundings."
   - Any non-vision request → "I'm focused on helping with visual tasks. Try saying 'be my eye' to start!"

3. **Vision mode activation** - Only these phrases start vision:
   - "be my eye" / "be my eyes"
   - "start vision" / "activate vision"
   - "open camera" / "start camera"

4. **Vision questions WITHOUT frame data**:
   - If user asks "what do you see" but you haven't received any [VISION ANALYSIS] data yet
   - Say: "Hold on, I'm starting up the camera. Give me just a second to see what's in front of you!"
   - NEVER make up or guess what you see
   - Only describe what's in the actual [VISION ANALYSIS] data you receive
   
YOUR MAIN PURPOSE:
- Provide AI-powered vision assistance (Be My Eye mode)
- Describe surroundings, detect obstacles, read text
- Keep users safe while navigating

CONVERSATION STYLE:
✅ "Let's activate the camera!" (SHORT)
✅ "What would you like help with?" (CLARIFYING)
✅ "I'm here for vision assistance. Say 'be my eye' to start!" (BRIEF REDIRECT)
❌ "I am an AI assistant designed to help visually impaired individuals with various tasks including but not limited to..." (TOO LONG)

Keep it SHORT, SMART, and HELPFUL!`;

/**
 * Create or get a conversation session
 */
export function createConversationSession(sessionId, options = {}) {
  if (conversationSessions.has(sessionId)) {
    return conversationSessions.get(sessionId);
  }

  // Use custom system context if provided, otherwise use default
  const systemPrompt = options.systemContext || CONVERSATION_SYSTEM_PROMPT;
  console.log(`💬 Using ${options.systemContext ? 'custom' : 'default'} system context`);

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      {
        role: "model",
        parts: [{ text: "I understand! I'm Nova, your warm and friendly AI companion. I'm ready to have natural conversations, help with vision assistance, and make your experience delightful. I'll be conversational, empathetic, and genuinely helpful. Let's chat!" }]
      }
    ],
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  });

  const session = {
    sessionId,
    chat,
    messageCount: 0,
    startedAt: new Date(),
    lastActivity: new Date(),
    userInfo: options.userInfo || {},
    visionModeActive: false,
    systemContext: options.systemContext || null
  };

  conversationSessions.set(sessionId, session);
  console.log(`💬 Created conversation session: ${sessionId.substring(0, 8)}`);
  
  return session;
}

/**
 * Send a message and get a response
 */
export async function sendMessage(sessionId, message, context = {}) {
  let session = conversationSessions.get(sessionId);
  
  if (!session) {
    session = createConversationSession(sessionId, context);
  }

  session.lastActivity = new Date();
  session.messageCount++;

  try {
    console.log(`💬 User message: "${message}"`);

    // Check for special commands
    const lowerMessage = message.toLowerCase().trim();
    
    // Detect "be my eye" activation (with common speech recognition variations)
    // IMPORTANT: Use exact phrase matching to avoid false positives like "my eye" alone
    const isVisionActivation = lowerMessage.includes('be my eye') || 
        lowerMessage.includes('be my eyes') ||
        lowerMessage === 'my eye' ||     // Only exact match, not just "includes"
        lowerMessage === 'my eyes' ||    // Only exact match, not just "includes"
        lowerMessage.includes('see my eye') ||  // Common misrecognition
        lowerMessage.includes('see my eyes') || // Common misrecognition
        lowerMessage.includes('b my eye') ||
        lowerMessage.includes('start vision') || 
        lowerMessage.includes('activate vision') ||
        lowerMessage.includes('open camera') ||
        lowerMessage.includes('turn on camera') ||
        lowerMessage.includes('use camera');
    
         if (isVisionActivation) {
       session.visionModeActive = true;
       
       // Add vision context to the message
       message += `\n\n[SYSTEM: User activated vision mode. You MUST respond with exactly this sentence and nothing else: "Starting the camera, give me just a second to see what's around you!" DO NOT add anything else. DO NOT ask what they see.]`;
     }
    
    // Detect "stop be my eye"
    if (lowerMessage.includes('stop be my eye') || 
        lowerMessage.includes('stop vision') || 
        lowerMessage.includes('deactivate vision') ||
        lowerMessage.includes('close camera')) {
      session.visionModeActive = false;
      
      message += `\n\n[SYSTEM: User stopped vision mode. Say ONE SHORT sentence confirming.]`;
    }

    // Add context if vision mode is active
    if (session.visionModeActive && context.visionContext) {
      message += `\n\n[VISION CONTEXT: ${context.visionContext}]`;
    }

    // Send message to Gemini
    const result = await session.chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    console.log(`🤖 Nova response: "${responseText.substring(0, 100)}..."`);

    return {
      success: true,
      response: responseText,
      sessionId,
      messageCount: session.messageCount,
      visionModeActive: session.visionModeActive,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Conversation error:', error);
    
    return {
      success: false,
      error: error.message,
      response: "Oops! I had a little hiccup there. Can you say that again?",
      sessionId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Stream a response (for real-time feel)
 */
export async function sendMessageStreaming(sessionId, message, context = {}, onChunk) {
  let session = conversationSessions.get(sessionId);
  
  if (!session) {
    session = createConversationSession(sessionId, context);
  }

  session.lastActivity = new Date();
  session.messageCount++;

  try {
    console.log(`💬 User message (streaming): "${message}"`);

    // Check for special commands (same as above)
    const lowerMessage = message.toLowerCase().trim();
    
    // IMPORTANT: Use exact phrase matching to avoid false positives like "my eye" alone
    const isVisionActivation = lowerMessage.includes('be my eye') || 
        lowerMessage.includes('be my eyes') ||
        lowerMessage === 'my eye' ||     // Only exact match, not just "includes"
        lowerMessage === 'my eyes' ||    // Only exact match, not just "includes"
        lowerMessage.includes('see my eye') ||  // Common misrecognition
        lowerMessage.includes('see my eyes') || // Common misrecognition
        lowerMessage.includes('b my eye') ||
        lowerMessage.includes('start vision') || 
        lowerMessage.includes('activate vision') ||
        lowerMessage.includes('open camera') ||
        lowerMessage.includes('turn on camera') ||
        lowerMessage.includes('use camera');
    
         if (isVisionActivation) {
       session.visionModeActive = true;
       message += `\n\n[SYSTEM: User activated vision mode. You MUST respond with exactly this sentence and nothing else: "Starting the camera, give me just a second to see what's around you!" DO NOT add anything else. DO NOT ask what they see.]`;
     }
    
    if (lowerMessage.includes('stop be my eye') || 
        lowerMessage.includes('stop vision') || 
        lowerMessage.includes('deactivate vision') ||
        lowerMessage.includes('close camera')) {
      session.visionModeActive = false;
      message += `\n\n[SYSTEM: User stopped vision mode. Say ONE SHORT sentence confirming.]`;
    }

    if (session.visionModeActive && context.visionContext) {
      message += `\n\n[VISION CONTEXT: ${context.visionContext}]`;
    }

    // Send message with streaming
    const result = await session.chat.sendMessageStream(message);
    
    let fullResponse = '';
    
    // Stream chunks to the callback
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      
      if (onChunk) {
        onChunk(chunkText, false);
      }
    }

    // Final callback
    if (onChunk) {
      onChunk('', true); // Signal completion
    }

    console.log(`✅ Streaming complete: "${fullResponse.substring(0, 100)}..."`);

    return {
      success: true,
      response: fullResponse,
      sessionId,
      messageCount: session.messageCount,
      visionModeActive: session.visionModeActive,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Streaming conversation error:', error);
    
    const errorResponse = "Oops! I had a little hiccup there. Can you say that again?";
    
    if (onChunk) {
      onChunk(errorResponse, true);
    }
    
    return {
      success: false,
      error: error.message,
      response: errorResponse,
      sessionId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get greeting for starting a conversation
 */
export function getConversationGreeting(userName = null) {
  const greetings = [
    `Hi! I'm Nova. Say "be my eye" to start vision mode!`,
    `Hey there! I'm Nova, your vision assistant. Ready to help!`,
    `Hello! Nova here. Try saying "be my eye" to get started!`,
    `Hi! I'm Nova. How can I help you today?`,
  ];

  if (userName) {
    return `Hey ${userName}! Nova here. What can I do for you?`;
  }

  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Explain a feature
 */
export async function explainFeature(sessionId, featureName) {
  const featurePrompts = {
    'be-my-eye': `Explain the "Be My Eye" feature warmly: It uses your camera to see the world around you, describes what's there, detects obstacles, helps with navigation, and keeps you safe. Be enthusiastic and encouraging!`,
    'voice-control': `Explain voice control warmly: Everything is voice-controlled - no touching needed! Just speak naturally and the app responds. It's like having a conversation. Be encouraging!`,
    'emergency-contacts': `Explain emergency contacts warmly: Users can set up emergency contacts who will be notified if something goes wrong. It's a safety feature for peace of mind. Be reassuring!`,
    'privacy': `Explain privacy warmly: All camera processing happens in real-time, nothing is permanently stored unless the user wants it. Privacy and security are top priorities. Be reassuring!`
  };

  const prompt = featurePrompts[featureName] || `Explain this feature warmly and clearly: ${featureName}`;
  
  return await sendMessage(sessionId, prompt);
}

/**
 * Get session info
 */
export function getSession(sessionId) {
  return conversationSessions.get(sessionId);
}

/**
 * End a conversation session
 */
export function endConversationSession(sessionId) {
  const session = conversationSessions.get(sessionId);
  
  if (session) {
    console.log(`💬 Ending conversation session: ${sessionId.substring(0, 8)} (${session.messageCount} messages)`);
    conversationSessions.delete(sessionId);
    return true;
  }
  
  return false;
}

/**
 * Clean up old sessions (run periodically)
 */
export function cleanupOldSessions(maxAgeMinutes = 30) {
  const now = new Date();
  let cleaned = 0;
  
  for (const [sessionId, session] of conversationSessions.entries()) {
    const ageMinutes = (now - session.lastActivity) / (1000 * 60);
    
    if (ageMinutes > maxAgeMinutes) {
      conversationSessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old conversation sessions`);
  }
  
  return cleaned;
}

// Auto-cleanup every 10 minutes
setInterval(() => cleanupOldSessions(30), 10 * 60 * 1000);

export default {
  createConversationSession,
  sendMessage,
  sendMessageStreaming,
  getConversationGreeting,
  explainFeature,
  getSession,
  endConversationSession,
  cleanupOldSessions
};

