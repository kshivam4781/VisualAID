import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 🎤 OpenAI Realtime API Service
 * 
 * This service provides voice-to-voice communication using OpenAI's Realtime API.
 * It handles:
 * - Direct voice input from user
 * - Real-time AI voice responses
 * - Frame analysis integration
 * - Conversation context management
 * 
 * Model: gpt-4o-realtime-preview-2024-10-01
 * Protocol: WebSocket with audio streaming
 */

class OpenAIRealtimeSession {
  constructor(sessionId, clientSocket) {
    this.sessionId = sessionId;
    this.clientSocket = clientSocket; // Socket.io connection to frontend
    this.openaiWs = null; // WebSocket to OpenAI Realtime API
    this.conversationHistory = [];
    this.isConnected = false;
    this.frameContext = null; // Store latest frame analysis for context
  }

  /**
   * 🔌 Connect to OpenAI Realtime API
   */
  async connect() {
    try {
      console.log(`🎤 Connecting to OpenAI Realtime API for session ${this.sessionId.substring(0, 8)}...`);

      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      
      this.openaiWs = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Connection opened
      this.openaiWs.on('open', () => {
        console.log('✅ OpenAI Realtime API connected');
        this.isConnected = true;

        // Configure the session
        this.sendSessionUpdate({
          modalities: ['text', 'audio'],
          instructions: `You are a compassionate AI assistant helping a visually impaired person navigate their surroundings. 
          
Your role is to:
1. Describe what you see in camera frames (I'll provide descriptions)
2. Answer questions about the environment
3. Warn about obstacles and dangers immediately
4. Maintain a friendly, encouraging, and helpful tone
5. Be concise but informative
6. Prioritize safety alerts over general conversation

When the user asks "what do you see?" or similar questions, describe the current environment based on the frame analysis I provide.

Remember: This person cannot see, so your descriptions are their eyes. Be clear, specific, and supportive.`,
          voice: 'nova', // Using nova voice consistently throughout the system
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad', // Voice Activity Detection
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          temperature: 0.8,
          max_response_output_tokens: 4096
        });

        // Send initial greeting
        this.sendConversationItem({
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hello! I\'m here to be your eyes. Say "be my eye" to start, and I\'ll describe what I see around you.'
            }
          ]
        });

        this.createResponse();

        this.clientSocket.emit('realtime:connected', {
          sessionId: this.sessionId,
          status: 'connected'
        });
      });

      // Handle messages from OpenAI
      this.openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleOpenAIEvent(event);
        } catch (error) {
          console.error('❌ Error parsing OpenAI message:', error);
        }
      });

      // Handle errors
      this.openaiWs.on('error', (error) => {
        console.error('❌ OpenAI Realtime API error:', error);
        this.clientSocket.emit('realtime:error', {
          sessionId: this.sessionId,
          error: error.message
        });
      });

      // Handle disconnection
      this.openaiWs.on('close', () => {
        console.log('🔌 OpenAI Realtime API disconnected');
        this.isConnected = false;
        this.clientSocket.emit('realtime:disconnected', {
          sessionId: this.sessionId
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to OpenAI Realtime API:', error);
      throw error;
    }
  }

  /**
   * 📨 Handle events from OpenAI Realtime API
   */
  handleOpenAIEvent(event) {
    console.log(`📨 OpenAI event: ${event.type}`);

    switch (event.type) {
      // Session events
      case 'session.created':
        console.log('✅ Session created:', event.session.id);
        break;

      case 'session.updated':
        console.log('✅ Session updated');
        break;

      // Conversation events
      case 'conversation.item.created':
        console.log('💬 Conversation item created:', event.item.id);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('🎤 User said:', event.transcript);
        this.clientSocket.emit('realtime:user_transcript', {
          sessionId: this.sessionId,
          transcript: event.transcript
        });
        break;

      // Response events
      case 'response.created':
        console.log('🤖 Response created:', event.response.id);
        break;

      case 'response.output_item.added':
        console.log('📝 Output item added');
        break;

      case 'response.content_part.added':
        console.log('📝 Content part added');
        break;

      case 'response.audio_transcript.delta':
        // AI is speaking - send transcript to frontend
        this.clientSocket.emit('realtime:ai_transcript_delta', {
          sessionId: this.sessionId,
          delta: event.delta
        });
        break;

      case 'response.audio_transcript.done':
        console.log('🗣️ AI said:', event.transcript);
        this.clientSocket.emit('realtime:ai_transcript', {
          sessionId: this.sessionId,
          transcript: event.transcript
        });
        break;

      case 'response.audio.delta':
        // Audio chunk from AI - forward to frontend
        this.clientSocket.emit('realtime:audio_delta', {
          sessionId: this.sessionId,
          audio: event.delta // Base64 encoded audio
        });
        break;

      case 'response.audio.done':
        console.log('✅ Audio response complete');
        this.clientSocket.emit('realtime:audio_done', {
          sessionId: this.sessionId
        });
        break;

      case 'response.done':
        console.log('✅ Response complete');
        break;

      // Error events
      case 'error':
        console.error('❌ OpenAI error:', event.error);
        this.clientSocket.emit('realtime:error', {
          sessionId: this.sessionId,
          error: event.error
        });
        break;

      // Rate limit events
      case 'rate_limits.updated':
        console.log('📊 Rate limits:', event.rate_limits);
        break;

      default:
        console.log('📨 Unhandled event type:', event.type);
    }
  }

  /**
   * 🎤 Send audio from user to OpenAI
   * @param {string} audioBase64 - Base64 encoded PCM16 audio
   */
  sendAudio(audioBase64) {
    if (!this.isConnected) {
      console.warn('⚠️ Cannot send audio - not connected');
      return;
    }

    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioBase64
    });
  }

  /**
   * 💬 Send frame analysis as context to the conversation
   * @param {object} frameAnalysis - Analysis from Gemini/ChatGPT
   */
  updateFrameContext(frameAnalysis) {
    this.frameContext = frameAnalysis;

    if (!this.isConnected) return;

    // Create a conversational description from frame analysis
    const description = this.formatFrameDescription(frameAnalysis);

    // Add to conversation as system message
    this.sendConversationItem({
      type: 'message',
      role: 'system',
      content: [
        {
          type: 'text',
          text: `[FRAME ANALYSIS UPDATE] ${description}`
        }
      ]
    });
  }

  /**
   * 📝 Format frame analysis into natural description
   */
  formatFrameDescription(analysis) {
    let description = '';

    if (analysis.sceneDescription) {
      description += `Scene: ${analysis.sceneDescription}. `;
    }

    if (analysis.obstacles && analysis.obstacles.length > 0) {
      const criticalObstacles = analysis.obstacles.filter(o => 
        o.urgency === 'high' || o.urgency === 'critical'
      );
      if (criticalObstacles.length > 0) {
        description += 'OBSTACLES DETECTED: ';
        criticalObstacles.forEach(o => {
          description += `${o.name} at ${o.distance} to your ${o.position}. `;
        });
      }
    }

    if (analysis.pathStatus) {
      description += `Path status: ${analysis.pathStatus}. `;
    }

    return description || 'No significant changes in environment.';
  }

  /**
   * 🚨 Send urgent alert (interrupts current response)
   */
  sendUrgentAlert(message) {
    if (!this.isConnected) return;

    // Cancel any ongoing response
    this.sendEvent({
      type: 'response.cancel'
    });

    // Send urgent message
    this.sendConversationItem({
      type: 'message',
      role: 'system',
      content: [
        {
          type: 'text',
          text: `[URGENT SAFETY ALERT] ${message}`
        }
      ]
    });

    // Request immediate response
    this.createResponse();
  }

  /**
   * ⚡ Speak text immediately (for instant acknowledgements)
   */
  speakText(text) {
    if (!this.isConnected) return;

    // Add text as user context (so AI doesn't respond, just speaks it)
    this.sendConversationItem({
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    });

    // Request immediate audio response
    this.createResponse();
  }

  /**
   * 🔧 Send session configuration update
   */
  sendSessionUpdate(config) {
    this.sendEvent({
      type: 'session.update',
      session: config
    });
  }

  /**
   * 💬 Add item to conversation
   */
  sendConversationItem(item) {
    this.sendEvent({
      type: 'conversation.item.create',
      item: item
    });
  }

  /**
   * 🎯 Request AI to create a response
   */
  createResponse() {
    this.sendEvent({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Respond naturally and helpfully. If there are safety alerts, prioritize those immediately.'
      }
    });
  }

  /**
   * 📤 Send event to OpenAI
   */
  sendEvent(event) {
    if (!this.openaiWs || this.openaiWs.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send event - WebSocket not open');
      return;
    }

    this.openaiWs.send(JSON.stringify(event));
  }

  /**
   * 🔌 Disconnect from OpenAI Realtime API
   */
  disconnect() {
    console.log(`🔌 Disconnecting Realtime session ${this.sessionId.substring(0, 8)}...`);
    
    if (this.openaiWs) {
      this.openaiWs.close();
      this.openaiWs = null;
    }
    
    this.isConnected = false;
  }
}

// Session management
const activeSessions = new Map();

/**
 * 🎬 Create a new Realtime session
 */
export function createRealtimeSession(sessionId, clientSocket) {
  console.log(`🎬 Creating Realtime session: ${sessionId.substring(0, 8)}...`);
  
  const session = new OpenAIRealtimeSession(sessionId, clientSocket);
  activeSessions.set(sessionId, session);
  
  return session;
}

/**
 * 📞 Get existing Realtime session
 */
export function getRealtimeSession(sessionId) {
  return activeSessions.get(sessionId);
}

/**
 * 🗑️ Remove Realtime session
 */
export function removeRealtimeSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.disconnect();
    activeSessions.delete(sessionId);
    console.log(`🗑️ Removed Realtime session: ${sessionId.substring(0, 8)}`);
  }
}

/**
 * 📊 Get active session count
 */
export function getActiveSessionCount() {
  return activeSessions.size;
}

export default {
  createRealtimeSession,
  getRealtimeSession,
  removeRealtimeSession,
  getActiveSessionCount
};

