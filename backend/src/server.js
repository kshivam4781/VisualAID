import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { router as healthRouter } from './routes/health.js';
import { router as testDbRouter } from './routes/test-db.js';
import { router as usersRouter } from './routes/users.js';
import { router as framesRouter } from './routes/frames.js';
import { router as sessionsRouter } from './routes/sessions.js';
import { router as geminiTestRouter } from './routes/gemini-test.js';
import { router as openaiTestRouter } from './routes/openai-test.js';
import { router as ttsTestRouter } from './routes/tts-test.js';
import { router as ttsRouter } from './routes/tts.js';
import { router as cacheStatsRouter } from './routes/cache-stats.js';
import { testConnection, query } from './config/database.js';
import { saveFrameToFile } from './utils/frameStorage.js';
import * as OpenAIService from './services/openaiService.js';
import { openai } from './services/openaiService.js';
import * as RealtimeService from './services/openaiRealtimeService.js';
import * as TTSService from './services/openaiTTSService.js';
import * as ResponseCache from './services/responseCacheService.js';
// GeminiConversationService removed - using OpenAI instead
import fs from 'fs/promises';

// Load environment variables from backend/.env explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/test-db', testDbRouter);
app.use('/api/users', usersRouter);
app.use('/api/frames', framesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/gemini-test', geminiTestRouter);
app.use('/api/openai-test', openaiTestRouter);
app.use('/api/tts-test', ttsTestRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/cache', cacheStatsRouter);

// Active sessions tracking
const activeSessions = new Map();

// Frame history tracking (for context comparison)
const frameHistory = new Map(); // sessionId -> { frameCount, lastAnalysis }

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Clean up any active sessions for this socket
    for (const [sessionId, data] of activeSessions.entries()) {
      if (data.socketId === socket.id) {
        console.log(`Cleaning up session: ${sessionId}`);
        activeSessions.delete(sessionId);
        // Also clean up frame history
        frameHistory.delete(sessionId);
      }
    }
  });

  // Session start event
  socket.on('session:start', async (data) => {
    const { sessionId, userId, timestamp, metadata } = data;
    
    console.log(`✨ Vision session started: ${sessionId.substring(0, 8)}...`);
    
    // Track active session in memory
    activeSessions.set(sessionId, {
      socketId: socket.id,
      userId: userId || null,
      startTime: timestamp,
      frameCount: 0,
      metadata: metadata || {}
    });
    
    // Store session in database
    try {
      await query(
        `INSERT INTO active_sessions (id, user_id, started_at, status, frame_count, session_data) 
         VALUES ($1, $2, to_timestamp($3 / 1000.0), 'active', 0, $4) 
         ON CONFLICT (id) DO UPDATE SET 
           status = 'active', 
           started_at = to_timestamp($3 / 1000.0),
           frame_count = 0`,
        [sessionId, userId || null, timestamp, JSON.stringify(metadata || {})]
      );
      console.log(`💾 Session stored in database: ${sessionId.substring(0, 8)}...`);
    } catch (error) {
      console.error('❌ Error storing session:', error.message);
    }
    
    socket.emit('session:started', { sessionId, success: true, timestamp });
  });

  // Session end event
  socket.on('session:end', async (data) => {
    const { sessionId, timestamp } = data;
    
    console.log(`🛑 Vision session ended: ${sessionId.substring(0, 8)}...`);
    
    const session = activeSessions.get(sessionId);
    
    if (session) {
      // Update database with final frame count
      try {
        await query(
          `UPDATE active_sessions 
           SET ended_at = to_timestamp($1 / 1000.0), 
               status = 'stopped',
               frame_count = $3
           WHERE id = $2`,
          [timestamp, sessionId, session.frameCount]
        );
        console.log(`✅ Session ended - Total frames: ${session.frameCount}`);
      } catch (error) {
        console.error('❌ Error updating session:', error.message);
      }
      
      // Clean up memory
      activeSessions.delete(sessionId);
    } else {
      console.warn(`⚠️  Session not found in memory: ${sessionId.substring(0, 8)}...`);
    }
    
    socket.emit('session:ended', { 
      sessionId, 
      success: true, 
      timestamp,
      frameCount: session?.frameCount || 0 
    });
  });

  // Frame capture event handling
  socket.on('frame:capture', async (data, callback) => {
    const { sessionId, userId, frameData, timestamp, metadata } = data;
    
    console.log(`📸 Frame ${metadata.captureCount} - Session: ${sessionId.substring(0,8)}..., Size: ${(metadata.size / 1024).toFixed(2)}KB`);
    
    try {
      // Update session frame count in memory
      const session = activeSessions.get(sessionId);
      if (session) {
        session.frameCount = metadata.captureCount;
        
        // Update frame count in database (async)
        query(
          `UPDATE active_sessions SET frame_count = $1 WHERE id = $2`,
          [metadata.captureCount, sessionId]
        ).catch(error => {
          console.log(`⚠️  Failed to update session frame count: ${error.message}`);
        });
      }
      
      // Save frame to local filesystem (ALWAYS succeeds, fast)
      const filePath = await saveFrameToFile(sessionId, metadata.captureCount, frameData);
      console.log(`💾 Saved locally: ${filePath}`);
      
      // ⚡ IMMEDIATE ACKNOWLEDGEMENT - Send instant feedback to user
      const fastScanService = await import('./services/fastScanService.js');
      const immediateAck = fastScanService.getImmediateAck(
        metadata.captureCount, 
        frameHistory.get(sessionId)?.lastAnalysis?.environmentType
      );
      
      // Send immediate success response with acknowledgement (don't wait for AI)
      if (callback) {
        callback({
          success: true,
          filePath: filePath,
          message: 'Frame saved locally',
          captureCount: metadata.captureCount,
          sessionId: sessionId,
          immediateAck: immediateAck // ⚡ NEW: Instant user feedback
        });
      }
      
      // Send frame captured event to frontend for tracking
      socket.emit('frame:captured', {
        sessionId,
        frameNumber: metadata.captureCount,
        timestamp: Date.now()
      });
      
      // 🚀 PARALLEL FAST SCAN + FULL ANALYSIS
      // Get previous frame analysis for context comparison
      const previousAnalysis = frameHistory.get(sessionId)?.lastAnalysis || null;
      
      console.log(`🔍 Starting frame analysis for frame ${metadata.captureCount}...`);
      
      // Start both scans in parallel for maximum speed
      const fastScanPromise = fastScanService.quickDangerScan(frameData, metadata);
      const fullAnalysisPromise = OpenAIService.analyzeFrame(frameData, metadata, previousAnalysis);
      
      // ⚡ Wait for fast scan first (0.5-1s) - send immediate alerts
      fastScanPromise.then(async (fastResult) => {
        console.log(`⚡ Fast scan result: ${fastResult.quickResponse} (${fastResult.duration}ms)`);
        
        // Send quick response to frontend immediately
        // Frontend will use OpenAI TTS to speak it
        socket.emit('frame:quick_scan', {
          sessionId,
          frameCount: metadata.captureCount,
          quickResponse: fastResult.quickResponse,
          hasDanger: fastResult.hasDanger,
          duration: fastResult.duration
        });
      }).catch(error => {
        console.error('❌ Fast scan failed:', error);
      });
      
      // 🤖 Full analysis continues in parallel (2-3s)
      fullAnalysisPromise.then(async (analysis) => {
          console.log(`🎯 [ANALYSIS SUCCESS] ChatGPT Analysis complete for frame ${metadata.captureCount}`);
          console.log(`🎯 [ANALYSIS] Analysis keys:`, Object.keys(analysis));
          
          // Store analysis for next frame comparison
          frameHistory.set(sessionId, {
            frameCount: metadata.captureCount,
            lastAnalysis: analysis
          });
          
          // Detect critical obstacles
          const criticalObstacles = OpenAIService.detectCriticalObstacles(analysis);
          
          // Generate voice-friendly description
          const isFirstFrame = metadata.captureCount === 1;
          const voiceDescription = OpenAIService.generateVoiceDescription(analysis, isFirstFrame);
          
          // 💾 Cache the response for future similar scenarios
          ResponseCache.cacheResponse(analysis, { voiceDescription, analysis });
          
          // 🔊 PRIORITY: Generate and send TTS audio IMMEDIATELY (don't wait for database)
          // Only generate TTS if there's actual content to speak
          if (voiceDescription && voiceDescription.trim().length > 0) {
            console.log(`🎤 Generating TTS for: "${voiceDescription.substring(0, 100)}..."`);
            TTSService.textToSpeechBase64(voiceDescription, { 
              voice: TTSService.getVoiceForContext(isFirstFrame ? 'description' : 'navigation'),
              model: 'tts-1' // Fast model
            })
              .then(audioBase64 => {
                console.log(`✅ TTS audio generated for frame ${metadata.captureCount} (${audioBase64.length} chars)`);
                console.log(`📤 Sending frame:audio event to session ${sessionId.substring(0, 8)}...`);
                
                // Send audio to frontend IMMEDIATELY
                socket.emit('frame:audio', {
                  sessionId,
                  frameNumber: metadata.captureCount,
                  audio: audioBase64,
                  format: 'mp3',
                  timestamp: Date.now(),
                  hasImportantChanges: true
                });
                
                console.log(`✅ Audio sent to frontend - user can hear it now!`);
              })
              .catch(ttsError => {
                console.error(`❌ TTS generation failed for frame ${metadata.captureCount}:`, ttsError.message);
              });
          } else {
            // No changes detected - signal frontend to ask if user needs help
            console.log(`📭 No changes detected for frame ${metadata.captureCount} - signaling frontend`);
            socket.emit('frame:no_changes', {
              sessionId,
              frameNumber: metadata.captureCount,
              timestamp: Date.now()
            });
          }
          
          // Send analysis to frontend (for display/logging)
          socket.emit('frame:analyzed', {
            sessionId,
            frameNumber: metadata.captureCount,
            analysis: {
              description: voiceDescription,
              safetyLevel: analysis.safetyLevel,
              obstacles: analysis.obstacles,
              criticalObstacles: criticalObstacles,
              navigationGuidance: analysis.navigationGuidance,
              // Include all analysis data for frontend comparison
              ...analysis
            },
            frameImage: frameData, // Include the original frame image for visual comparison
            timestamp: Date.now()
          });
          
          // 💾 Database saves happen in background (don't await - non-blocking)
          query(
            `INSERT INTO session_frames 
             (session_id, user_id, frame_number, frame_url, analysis, obstacles, detection_confidence) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [
              sessionId,
              userId || null,
              metadata.captureCount,
              filePath,
              JSON.stringify(analysis),
              JSON.stringify(analysis.obstacles || []),
              analysis.metadata?.confidence || null
            ]
          )
            .then(() => console.log(`✅ DB synced: Frame ${metadata.captureCount}`))
            .catch(dbError => console.log(`⚠️  DB sync failed: ${dbError.message}`));
          
          // Save danger alerts in background (non-blocking)
          if (criticalObstacles.length > 0) {
            const alertData = {
              obstacles: criticalObstacles,
              sceneDescription: analysis.sceneDescription,
              safetyLevel: analysis.safetyLevel,
              warnings: analysis.warnings || []
            };
            
            query(
              `INSERT INTO danger_alerts 
               (user_id, session_id, frame_url, alert_type, severity, alert_data) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                userId || null,
                sessionId,
                filePath,
                'obstacle_detected',
                criticalObstacles[0].urgency || 'high',
                JSON.stringify(alertData)
              ]
            )
              .then(() => console.log(`🚨 Danger alert saved: ${criticalObstacles.length} obstacles`))
              .catch(err => console.log(`⚠️  Danger alert save failed: ${err.message}`));
          }
          
          // Update Realtime session (if exists) - try both session IDs
          let realtimeSession = RealtimeService.getRealtimeSession(sessionId);
          if (!realtimeSession) {
            // Try to find the conversation session that might be using a different ID
            console.log(`🔍 Looking for Realtime session for vision session: ${sessionId.substring(0, 8)}...`);
            // The conversation session might be different from the vision session
            // We need to find the active conversation session
            for (const [convSessionId, convSession] of RealtimeService.getAllActiveSessions?.() || []) {
              console.log(`🔍 Checking conversation session: ${convSessionId.substring(0, 8)}...`);
              if (convSession && convSession.isConnected) {
                realtimeSession = convSession;
                console.log(`✅ Found active conversation session: ${convSessionId.substring(0, 8)}`);
                break;
              }
            }
          }
          
          if (realtimeSession) {
            console.log(`📤 Sending frame analysis to Nova for frame ${metadata.captureCount}...`);
            realtimeSession.updateFrameContext(analysis);
            if (criticalObstacles.length > 0) {
              const alertMessage = criticalObstacles.map(o => 
                `${o.name} at ${o.distance} to your ${o.position}. ${o.action}`
              ).join('. ');
              realtimeSession.sendUrgentAlert(alertMessage);
            }
          } else {
            console.warn(`⚠️ No active Realtime session found for frame analysis`);
          }
          
          // Also send frame analysis directly to conversation system
          // This ensures Nova gets the frame data even if Realtime session lookup fails
          console.log(`📤 Sending frame analysis to conversation system...`);
          socket.emit('conversation:frame_analysis', {
            sessionId: sessionId,
            frameNumber: metadata.captureCount,
            analysis: analysis,
            voiceDescription: voiceDescription,
            timestamp: Date.now()
          });
        })
        .catch(error => {
          console.error(`❌ [ANALYSIS FAILED] AI Analysis failed for frame ${metadata.captureCount}:`, error.message);
          console.error(`❌ [ANALYSIS FAILED] Error details:`, error);
          
          // Send error to frontend so it knows analysis failed
          socket.emit('frame:analysis_error', {
            sessionId,
            frameNumber: metadata.captureCount,
            error: error.message,
            timestamp: Date.now()
          });
          
          // Still save basic metadata to database even if analysis fails
          query(
            `INSERT INTO session_frames 
             (session_id, user_id, frame_number, frame_url, analysis, obstacles, detection_confidence) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              sessionId,
              userId || null,
              metadata.captureCount,
              filePath,
              JSON.stringify({ 
                error: true,
                errorMessage: error.message,
                metadata: metadata,
                capturedAt: new Date(timestamp).toISOString()
              }),
              JSON.stringify([]),
              null
            ]
          ).catch(err => console.log(`⚠️  DB backup save failed: ${err.message}`));
        });
      
      // TODO Phase 4: Send description to ChatGPT for natural conversational response
      
    } catch (error) {
      console.error('❌ Error saving frame:', error.message);
      
      if (callback) {
        callback({
          success: false,
          message: error.message
        });
      }
    }
  });

  // Voice command event handling
  socket.on('voice:command', (data) => {
    const { sessionId, command, parameters, originalText, confidence, timestamp } = data;
    console.log(`🎤 Voice command - Session: ${sessionId}, Command: "${command}", Confidence: ${(confidence * 100).toFixed(0)}%`);
    console.log(`📝 Original text: "${originalText}"`);
    console.log(`⚙️ Parameters:`, parameters);
    
    // Handle different voice commands
    switch (command) {
      case 'activate_vision':
        console.log('👁️ Vision activation requested');
        // Emit vision activation event
        socket.emit('conversation:vision_activated', {
          sessionId,
          timestamp: new Date().toISOString()
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'activate_vision',
          success: true,
          message: 'Vision mode activated. I can see what you see now.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'deactivate_vision':
        console.log('👁️ Vision deactivation requested');
        // Emit vision deactivation event
        socket.emit('conversation:vision_deactivated', {
          sessionId,
          timestamp: new Date().toISOString()
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'deactivate_vision',
          success: true,
          message: 'Vision mode deactivated. I can no longer see your surroundings.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'describe_scene':
        console.log('📝 Scene description requested');
        // Send description request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please describe what you see in detail.',
          context: { isVoiceCommand: true, command: 'describe_scene' }
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'describe_scene',
          success: true,
          message: 'I\'ll describe what I see in detail.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'read_text':
        console.log('📖 Text reading requested');
        // Send text reading request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please read any visible text in the scene.',
          context: { isVoiceCommand: true, command: 'read_text' }
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'read_text',
          success: true,
          message: 'I\'ll read any visible text for you.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'start_navigation':
        console.log('🧭 Navigation assistance requested');
        // Send navigation request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please help me navigate safely. Describe the path ahead and any obstacles.',
          context: { isVoiceCommand: true, command: 'start_navigation' }
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'start_navigation',
          success: true,
          message: 'I\'ll help you navigate safely. Let me describe the path ahead.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'find_object':
        console.log('🔍 Object search requested');
        // Send object search request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please look for the object I mentioned and describe its location.',
          context: { isVoiceCommand: true, command: 'find_object', parameters }
        });
        break;
        
      case 'check_safety':
        console.log('🛡️ Safety check requested');
        // Send safety check request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please check if the path is safe and describe any obstacles or dangers.',
          context: { isVoiceCommand: true, command: 'check_safety' }
        });
        break;
        
      case 'camera_zoom':
        console.log('📷 Camera zoom requested:', parameters);
        // Send camera instruction to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: `I can't physically control the camera, but I can focus on specific areas. What would you like me to look at more closely?`,
          context: { isVoiceCommand: true, command: 'camera_zoom', parameters }
        });
        break;
        
      case 'camera_pan':
        console.log('📷 Camera pan requested:', parameters);
        // Send camera instruction to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: `I can't physically move the camera, but I can describe what's to the ${parameters?.direction || 'left'}. Please turn your device in that direction.`,
          context: { isVoiceCommand: true, command: 'camera_pan', parameters }
        });
        break;
        
      case 'camera_tilt':
        console.log('📷 Camera tilt requested:', parameters);
        // Send camera instruction to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: `I can't physically tilt the camera, but I can describe what's ${parameters?.direction || 'up'}. Please tilt your device in that direction.`,
          context: { isVoiceCommand: true, command: 'camera_tilt', parameters }
        });
        break;
        
      case 'volume_up':
        console.log('🔊 Volume up requested');
        // Send volume instruction to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Volume increased. I\'ll speak louder now.',
          context: { isVoiceCommand: true, command: 'volume_up' }
        });
        break;
        
      case 'volume_down':
        console.log('🔇 Volume down requested');
        // Send volume instruction to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Volume decreased. I\'ll speak quieter now.',
          context: { isVoiceCommand: true, command: 'volume_down' }
        });
        break;
        
      case 'repeat_last':
        console.log('🔄 Repeat last message requested');
        // Send repeat request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please repeat your last message.',
          context: { isVoiceCommand: true, command: 'repeat_last' }
        });
        break;
        
      case 'show_help':
        console.log('❓ Help requested');
        // Send help information to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Here are the commands I understand: Say "be my eye" to start vision mode, "describe what you see" for scene description, "read the text" to read visible text, "navigate me" for navigation help, "find" followed by an object name, "is it safe" to check for obstacles, "help" anytime for this list, or ask me any question naturally.',
          context: { isVoiceCommand: true, command: 'show_help' }
        });
        break;
        
      case 'navigate_menu':
        console.log('🏠 Navigate to menu requested');
        // Send menu navigation to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Returning to main menu. How can I help you?',
          context: { isVoiceCommand: true, command: 'navigate_menu' }
        });
        break;
        
      case 'ask_question':
        console.log('❓ Question asked:', originalText);
        // Send question to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: originalText,
          context: { isVoiceCommand: true, command: 'ask_question' }
        });
        break;
        
      case 'analyze_current_view':
        console.log('🔍 Current view analysis requested');
        // Send analysis request to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: 'Please analyze what is currently in front of me and describe it in detail.',
          context: { isVoiceCommand: true, command: 'analyze_current_view' }
        });
        // Send command response
        socket.emit('voice:command_response', {
          sessionId,
          command: 'analyze_current_view',
          success: true,
          message: 'I\'ll capture and analyze what\'s in front of you right now.',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'conversation':
        console.log('💬 Conversational input:', originalText);
        // Send to conversation system for natural processing
        socket.emit('conversation:message', {
          sessionId,
          message: originalText,
          context: { isVoiceCommand: true, command: 'conversation' }
        });
        break;
        
      default:
        console.log(`❓ Unknown voice command: ${command}`);
        // Send unknown command to conversation system
        socket.emit('conversation:message', {
          sessionId,
          message: `I'm not sure how to handle "${command}". Can you rephrase that?`,
          context: { isVoiceCommand: true, command: 'unknown' }
        });
    }
    
    socket.emit('command:received', { sessionId, success: true });
  });

  // ===== OpenAI Realtime API Event Handlers =====

  /**
   * 🎤 Start OpenAI Realtime session
   */
  socket.on('realtime:start', async (data) => {
    const { sessionId } = data;
    
    try {
      console.log(`🎤 Starting Realtime session: ${sessionId.substring(0, 8)}...`);
      
      // Create and connect Realtime session
      const realtimeSession = RealtimeService.createRealtimeSession(sessionId, socket);
      await realtimeSession.connect();
      
      console.log(`✅ Realtime session started: ${sessionId.substring(0, 8)}`);
      
    } catch (error) {
      console.error('❌ Failed to start Realtime session:', error);
      socket.emit('realtime:error', {
        sessionId,
        error: error.message
      });
    }
  });

  /**
   * ⚡ Handle instant acknowledgement for immediate TTS playback
   */
  socket.on('realtime:instant_ack', async (data) => {
    const { sessionId, text } = data;
    
    try {
      const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
      if (realtimeSession && realtimeSession.isConnected) {
        console.log(`⚡ Speaking instant ack: "${text}"`);
        realtimeSession.speakText(text);
      }
    } catch (error) {
      console.error(`❌ Failed to send instant ack:`, error);
    }
  });

  /**
   * 🎤 Send audio from user to OpenAI Realtime API
   */
  socket.on('realtime:audio', (data) => {
    const { sessionId, audio } = data;
    
    const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
    if (realtimeSession) {
      realtimeSession.sendAudio(audio);
    } else {
      console.warn(`⚠️ No Realtime session found for ${sessionId.substring(0, 8)}`);
    }
  });

  /**
   * 🔌 Stop OpenAI Realtime session
   */
  socket.on('realtime:stop', (data) => {
    const { sessionId } = data;
    
    console.log(`🔌 Stopping Realtime session: ${sessionId.substring(0, 8)}...`);
    RealtimeService.removeRealtimeSession(sessionId);
    
    socket.emit('realtime:stopped', { sessionId });
  });

  /**
   * 💬 Send text message to Realtime API (for debugging or text-based interaction)
   */
  socket.on('realtime:message', (data) => {
    const { sessionId, message } = data;
    
    const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
    if (realtimeSession) {
      realtimeSession.sendConversationItem({
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      });
      realtimeSession.createResponse();
    }
  });

  /**
   * 🎤 Parse voice command using OpenAI Realtime API
   */
  socket.on('realtime:parse_command', async (data) => {
    const { sessionId, transcript, timestamp } = data;
    
    try {
      console.log(`🤖 [REALTIME AI] Parsing command: "${transcript}"`);
      
      const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
      if (!realtimeSession) {
        console.error('❌ [REALTIME AI] No realtime session found');
        socket.emit('realtime:command_parsed', {
          sessionId,
          success: false,
          action: 'error',
          message: 'No realtime session available',
          confidence: 0
        });
        return;
      }

      // Create a specialized prompt for command parsing
      const commandPrompt = `You are an AI assistant that helps parse voice commands for a vision assistance system. 

The user said: "${transcript}"

Analyze this input and determine:
1. What action they want to perform
2. Any parameters needed
3. Your confidence level (0-1)
4. A helpful response message

Available actions:
- activate_vision: Start vision mode (phrases like "be my eye", "open camera", "start vision")
- deactivate_vision: Stop vision mode (phrases like "stop be my eye", "close camera", "stop vision")
- describe_scene: Describe what you see (phrases like "what do you see", "describe the scene")
- read_text: Read visible text (phrases like "read the text", "what does it say")
- navigate: Help with navigation (phrases like "help me navigate", "where should I go")
- find_object: Look for specific objects (phrases like "find my keys", "where is my phone")
- check_safety: Check for obstacles (phrases like "is it safe", "any dangers")
- analyze_current_view: Analyze what's in front of me (phrases like "what is in front of me", "what is this", "analyze this", "what do you see now")
- camera_control: Camera adjustments (phrases like "look left", "zoom in")
- volume_control: Audio adjustments (phrases like "louder", "quieter")
- help: Show available commands (phrases like "help", "what can I say")
- conversation: General conversation (questions, comments)

Respond with a JSON object in this exact format:
{
  "success": true/false,
  "action": "action_name",
  "parameters": {"key": "value"},
  "message": "Response to user",
  "confidence": 0.0-1.0
}

Be intelligent about understanding natural speech and context.`;

      // Send to OpenAI for parsing
      const response = await realtimeSession.parseCommand(commandPrompt);
      
      console.log(`✅ [REALTIME AI] Command parsed:`, response);
      
      // Send response back to frontend
      socket.emit('realtime:command_parsed', {
        sessionId,
        success: response.success || false,
        action: response.action || 'unknown',
        parameters: response.parameters || {},
        message: response.message || 'Command processed',
        confidence: response.confidence || 0.5,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [REALTIME AI] Command parsing failed:', error);
      socket.emit('realtime:command_parsed', {
        sessionId,
        success: false,
        action: 'error',
        message: `Failed to parse command: ${error.message}`,
        confidence: 0
      });
    }
  });

  /**
   * 🎯 Execute a parsed command
   */
  socket.on('realtime:execute_command', async (data) => {
    const { sessionId, action, parameters, originalText, confidence, timestamp } = data;
    
    try {
      console.log(`🎯 [REALTIME AI] Executing command: ${action}`, parameters);
      
      // Handle different command actions
      switch (action) {
        case 'activate_vision':
          console.log('👁️ [REALTIME AI] Activating vision mode');
          socket.emit('conversation:vision_activated', {
            sessionId,
            timestamp: new Date().toISOString()
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'Vision mode activated. I can see what you see now.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'deactivate_vision':
          console.log('👁️ [REALTIME AI] Deactivating vision mode');
          socket.emit('conversation:vision_deactivated', {
            sessionId,
            timestamp: new Date().toISOString()
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'Vision mode deactivated. I can no longer see your surroundings.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'describe_scene':
          console.log('📝 [REALTIME AI] Requesting scene description');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Please describe what you see in detail.',
            context: { isVoiceCommand: true, command: 'describe_scene', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll describe what I see in detail.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'read_text':
          console.log('📖 [REALTIME AI] Requesting text reading');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Please read any visible text in the scene.',
            context: { isVoiceCommand: true, command: 'read_text', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll read any visible text for you.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'navigate':
          console.log('🧭 [REALTIME AI] Requesting navigation help');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Please help me navigate safely. Describe the path ahead and any obstacles.',
            context: { isVoiceCommand: true, command: 'navigate', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll help you navigate safely. Let me describe the path ahead.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'find_object':
          console.log('🔍 [REALTIME AI] Requesting object search');
          const objectName = parameters.object || 'the object you mentioned';
          socket.emit('conversation:message', {
            sessionId,
            message: `Please look for ${objectName} and describe its location.`,
            context: { isVoiceCommand: true, command: 'find_object', parameters, aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: `I'll look for ${objectName} and tell you where it is.`,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'check_safety':
          console.log('🛡️ [REALTIME AI] Requesting safety check');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Please check if the path is safe and describe any obstacles or dangers.',
            context: { isVoiceCommand: true, command: 'check_safety', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll check for any safety concerns and obstacles.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'camera_control':
          console.log('📷 [REALTIME AI] Camera control requested');
          const direction = parameters.direction || 'the requested direction';
          socket.emit('conversation:message', {
            sessionId,
            message: `I can't physically control the camera, but I can describe what's ${direction}. Please turn your device in that direction.`,
            context: { isVoiceCommand: true, command: 'camera_control', parameters, aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: `I'll help you look ${direction}. Please turn your device accordingly.`,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'volume_control':
          console.log('🔊 [REALTIME AI] Volume control requested');
          const volumeAction = parameters.action || 'adjust';
          socket.emit('conversation:message', {
            sessionId,
            message: `Volume ${volumeAction}. I'll speak ${volumeAction === 'up' ? 'louder' : 'quieter'} now.`,
            context: { isVoiceCommand: true, command: 'volume_control', parameters, aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: `Volume ${volumeAction}. I'll adjust my speaking volume.`,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'help':
          console.log('❓ [REALTIME AI] Help requested');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Here are the commands I understand: Say "be my eye" to start vision mode, "describe what you see" for scene description, "read the text" to read visible text, "navigate me" for navigation help, "find" followed by an object name, "is it safe" to check for obstacles, "help" anytime for this list, or ask me any question naturally.',
            context: { isVoiceCommand: true, command: 'help', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll show you all the available commands.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'analyze_current_view':
          console.log('🔍 [REALTIME AI] Current view analysis requested');
          socket.emit('conversation:message', {
            sessionId,
            message: 'Please analyze what is currently in front of me and describe it in detail.',
            context: { isVoiceCommand: true, command: 'analyze_current_view', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I\'ll capture and analyze what\'s in front of you right now.',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'conversation':
          console.log('💬 [REALTIME AI] General conversation');
          socket.emit('conversation:message', {
            sessionId,
            message: originalText,
            context: { isVoiceCommand: true, command: 'conversation', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: true,
            message: 'I understand. Let me respond to that.',
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          console.log(`❓ [REALTIME AI] Unknown command: ${action}`);
          socket.emit('conversation:message', {
            sessionId,
            message: `I'm not sure how to handle that. Can you rephrase it?`,
            context: { isVoiceCommand: true, command: 'unknown', aiParsed: true }
          });
          socket.emit('realtime:command_executed', {
            sessionId,
            action,
            success: false,
            message: 'I didn\'t understand that command. Please try again.',
            timestamp: new Date().toISOString()
          });
      }
      
    } catch (error) {
      console.error('❌ [REALTIME AI] Command execution failed:', error);
      socket.emit('realtime:command_executed', {
        sessionId,
        action,
        success: false,
        message: `Failed to execute command: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * ❓ Handle user questions (interrupt current flow)
   */
  socket.on('user:question', async (data) => {
    const { sessionId, question, timestamp } = data;
    
    console.log(`❓ User question received: "${question}" (session: ${sessionId?.substring(0, 8)})`);
    
    try {
      // Get the latest frame for context
      const latestFrame = await query(
        `SELECT frame_path FROM frames 
         WHERE session_id = $1 
         ORDER BY frame_number DESC 
         LIMIT 1`,
        [sessionId]
      );
      
      let contextImage = null;
      if (latestFrame.rows.length > 0 && latestFrame.rows[0].frame_path) {
        const framePath = latestFrame.rows[0].frame_path;
        const imageBuffer = await fs.readFile(framePath);
        contextImage = imageBuffer.toString('base64');
      }
      
      // Ask GPT-4 Vision the question with context
      const prompt = `User Question: "${question}"

Please answer this question based on the current camera view. Be concise and specific. If the question asks about something not visible in the frame, say so.`;

      const messages = [
        {
          role: 'user',
          content: contextImage ? [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${contextImage}` }
            }
          ] : [{ type: 'text', text: prompt + '\n\n(No camera frame available)' }]
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7
      });

      const answer = response.choices[0].message.content;
      console.log(`💬 Answer generated: "${answer.substring(0, 100)}..."`);
      
      // Generate audio for the answer
      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: answer,
        speed: 1.0
      });

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
      const audioBase64 = audioBuffer.toString('base64');
      
      // Send answer back to client with high priority
      socket.emit('question:answer', {
        question,
        answer,
        audio: audioBase64,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Answer sent for question: "${question}"`);
      
    } catch (error) {
      console.error('❌ Error handling user question:', error);
      socket.emit('question:answer', {
        question,
        answer: "I'm sorry, I couldn't process your question at the moment.",
        error: error.message
      });
    }
  });

  /**
   * 📸 Handle on-demand frame capture and analysis
   */
  socket.on('frame:capture_now', async (data, callback) => {
    const { sessionId, userId, frameData, timestamp, metadata } = data;
    
    console.log(`📸 ON-DEMAND Frame capture - Session: ${sessionId.substring(0,8)}..., Size: ${(metadata.size / 1024).toFixed(2)}KB`);
    
    try {
      // Update session frame count in memory
      const session = activeSessions.get(sessionId);
      if (session) {
        session.frameCount = metadata.captureCount;
        
        // Update frame count in database (async)
        query(
          `UPDATE active_sessions SET frame_count = $1 WHERE id = $2`,
          [metadata.captureCount, sessionId]
        ).catch(error => {
          console.log(`⚠️  Failed to update session frame count: ${error.message}`);
        });
      }
      
      // Save frame to local filesystem (ALWAYS succeeds, fast)
      const filePath = await saveFrameToFile(sessionId, metadata.captureCount, frameData);
      console.log(`💾 Saved locally: ${filePath}`);
      
      // Send immediate success response
      if (callback) {
        callback({
          success: true,
          filePath: filePath,
          message: 'Frame captured and saved',
          captureCount: metadata.captureCount,
          sessionId: sessionId
        });
      }
      
      // Send frame captured event to frontend for tracking
      socket.emit('frame:captured', {
        sessionId,
        frameNumber: metadata.captureCount,
        timestamp: Date.now()
      });
      
      // 🚀 IMMEDIATE ANALYSIS - Enhanced for on-demand requests
      console.log(`🔍 Starting enhanced analysis for on-demand request...`);
      
      // Get previous frame analysis for context comparison
      const previousAnalysis = frameHistory.get(sessionId)?.lastAnalysis || null;
      
      // Use enhanced analysis for on-demand requests
      const analysis = await OpenAIService.analyzeFrame(frameData, {
        ...metadata,
        isOnDemand: true,
        requestType: 'detailed_analysis'
      }, previousAnalysis);
      
      console.log(`🎯 [ON-DEMAND ANALYSIS] Enhanced analysis complete for frame ${metadata.captureCount}`);
      
      // Store analysis for next frame comparison
      frameHistory.set(sessionId, {
        frameCount: metadata.captureCount,
        lastAnalysis: analysis
      });
      
      // Generate enhanced voice description for on-demand requests
      const voiceDescription = OpenAIService.generateEnhancedVoiceDescription(analysis, true);
      
      // Check if this was requested by a vision command (user asking "what do you see")
      const visionSession = activeSessions.get(sessionId);
      const hasPendingRequest = visionSession && visionSession.pendingVisionRequests && visionSession.pendingVisionRequests.length > 0;
      
      if (hasPendingRequest) {
        // This is a response to a vision command - send directly to Nova
        const visionRequest = visionSession.pendingVisionRequests.shift(); // Get and remove first request
        console.log(`📸 Responding to vision request: "${visionRequest.userMessage}"`);
        
        // Send to Nova via conversation
        // Use the conversation session ID from the vision request, not the vision session ID
        const conversationSessionId = visionRequest.sessionId;
        const realtimeSession = RealtimeService.getRealtimeSession(conversationSessionId);
        console.log(`🔍 Looking for Realtime session with conversation ID: ${conversationSessionId.substring(0, 8)}`);
        if (realtimeSession && realtimeSession.isConnected) {
          console.log(`📤 Sending on-demand analysis to Nova...`);
          const frameMessage = `[USER ASKED: "${visionRequest.userMessage}"] I can see: ${voiceDescription}`;
          realtimeSession.sendConversationItem({
            type: 'message',
            role: 'system',
            content: [
              {
                type: 'text',
                text: frameMessage
              }
            ]
          });
          
          // Request immediate response
          realtimeSession.createResponse();
          console.log(`✅ Nova will respond to user's vision request`);
        } else {
          console.warn(`⚠️ No Realtime session found - using OpenAI to generate response`);
          
          // Generate response using OpenAI
          const response = await OpenAIService.generateResponse(
            `User asked: "${visionRequest.userMessage}". Based on what I see: ${voiceDescription}. Please describe this to the user.`,
            {
              systemPrompt: `You are Nova, a compassionate AI vision assistant. The user asked you what you can see. Describe what's in the camera view in 2-3 sentences. Be warm and helpful.`,
              maxTokens: 150
            }
          );
          
          // Generate TTS
          const audioResponse = await TTSService.textToSpeechBase64(response, {
            voice: 'nova',
            model: 'tts-1'
          });
          
          // Send response to client
          socket.emit('conversation:response', {
            sessionId,
            message: response,
            audio: audioResponse,
            visionModeActive: true,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Direct response sent to user`);
        }
      } else {
        // This is a scheduled frame capture - use normal TTS
        if (voiceDescription && voiceDescription.trim().length > 0) {
          console.log(`🎤 Generating enhanced TTS for scheduled frame: "${voiceDescription.substring(0, 100)}..."`);
          TTSService.textToSpeechBase64(voiceDescription, { 
            voice: 'nova',
            model: 'tts-1'
          })
            .then(audioBase64 => {
              console.log(`✅ Enhanced TTS audio generated for on-demand frame ${metadata.captureCount}`);
              
              // Send enhanced audio to frontend
              socket.emit('frame:audio', {
                sessionId,
                frameNumber: metadata.captureCount,
                audio: audioBase64,
                format: 'mp3',
                timestamp: Date.now(),
                hasImportantChanges: true,
                isOnDemand: true
              });
              
              console.log(`✅ Enhanced audio sent to frontend - user can hear detailed analysis!`);
            })
            .catch(ttsError => {
              console.error(`❌ Enhanced TTS generation failed for on-demand frame ${metadata.captureCount}:`, ttsError.message);
            });
        }
      }
      
      // Send enhanced analysis to frontend
      socket.emit('frame:analyzed', {
        sessionId,
        frameNumber: metadata.captureCount,
        analysis: {
          description: voiceDescription,
          safetyLevel: analysis.safetyLevel,
          obstacles: analysis.obstacles,
          criticalObstacles: analysis.criticalObstacles || [],
          navigationGuidance: analysis.navigationGuidance,
          focusedObject: analysis.focusedObject,
          sceneDescription: analysis.sceneDescription,
          environmentType: analysis.environmentType,
          // Include all analysis data for frontend
          ...analysis
        },
        frameImage: frameData,
        timestamp: Date.now(),
        isOnDemand: true
      });
      
      // Save to database in background
      query(
        `INSERT INTO session_frames 
         (session_id, user_id, frame_number, frame_url, analysis, obstacles, detection_confidence) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          sessionId,
          userId || null,
          metadata.captureCount,
          filePath,
          JSON.stringify(analysis),
          JSON.stringify(analysis.obstacles || []),
          analysis.metadata?.confidence || null
        ]
      )
        .then(() => console.log(`✅ On-demand frame ${metadata.captureCount} saved to database`))
        .catch(dbError => console.log(`⚠️  On-demand frame DB save failed: ${dbError.message}`));
      
    } catch (error) {
      console.error('❌ Error in on-demand frame capture:', error.message);
      
      if (callback) {
        callback({
          success: false,
          message: error.message
        });
      }
    }
  });

  /**
   * 📸 Handle immediate frame capture for vision commands
   */
  socket.on('frame:capture_immediate', async (data) => {
    const { sessionId, reason, userMessage } = data;
    
    console.log(`📸 IMMEDIATE Frame capture requested - Session: ${sessionId ? sessionId.substring(0,8) : 'null'}..., Reason: ${reason}, User message: ${userMessage}`);
    
    try {
      // Get session data - vision session
      // First, try to find the vision session by the conversation session ID
      let visionSession = null;
      let visionSessionId = sessionId;
      
      // Look through all active sessions to find the vision session for this socket
      console.log(`🔍 Looking for vision session for conversation: ${sessionId.substring(0, 8)}...`);
      for (const [sid, sess] of activeSessions.entries()) {
        if (sess.socketId === socket.id && sess.isActive) {
          visionSession = sess;
          visionSessionId = sid;
          console.log(`✅ Found vision session: ${sid.substring(0, 8)}`);
          break;
        }
      }

      if (!visionSession) {
        console.warn(`⚠️ No vision session found for socket ${socket.id} - creating placeholder`);
        // Create a minimal session object to store pending requests
        visionSession = {
          socketId: socket.id,
          isActive: true,
          pendingVisionRequests: []
        };
        // Store it with the conversation session ID for now
        activeSessions.set(sessionId, visionSession);
        visionSessionId = sessionId;
      }

      // Send immediate acknowledgment to user
      console.log(`✅ Sending acknowledgment to frontend...`);
      socket.emit('frame:immediate_ack', {
        sessionId: sessionId,
        message: 'Analyzing what I see...',
        timestamp: Date.now(),
        reason: reason,
        userMessage: userMessage
      });

      // Request immediate frame capture from frontend
      console.log(`📤 Requesting immediate frame capture from frontend...`);
      socket.emit('frame:capture_request', {
        sessionId: visionSessionId, // Use the actual vision session ID
        reason: reason,
        priority: 'high',
        userMessage: userMessage
      });

      // Store the user message for when the frame analysis comes back
      // This will be picked up by the frame:capture_now handler
      if (!visionSession.pendingVisionRequests) {
        visionSession.pendingVisionRequests = [];
      }
      visionSession.pendingVisionRequests.push({
        userMessage: userMessage,
        timestamp: Date.now(),
        sessionId: sessionId, // Store the conversation session ID for reference
        visionSessionId: visionSessionId // Store the vision session ID too
      });
      
      console.log(`✅ Vision request queued for vision session: ${visionSessionId.substring(0, 8)}`);
      console.log(`   Waiting for frame capture and analysis...`);

    } catch (error) {
      console.error('❌ Error handling immediate frame capture:', error);
      socket.emit('frame:capture_error', {
        sessionId: sessionId,
        error: error.message
      });
    }
  });

  // ===== Conversational AI Event Handlers =====

  /**
   * 💬 Start a conversation session
   */
  socket.on('conversation:start', async (data) => {
    const { sessionId, userName } = data;
    
    try {
      console.log(`💬 Starting conversation session: ${sessionId.substring(0, 8)}`);
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   User name: ${userName || 'Anonymous'}`);
      
      // Create conversation session (using OpenAI instead of Gemini)
      console.log(`✅ Conversation session created`);
      
      // Get greeting using OpenAI
      const greeting = `Hey there! I'm Nova, your vision assistant. Ready to help you navigate and understand your surroundings. How can I assist you today?`;
      console.log(`✅ Got greeting: "${greeting.substring(0, 50)}..."`);
      
      // Generate TTS for greeting
      console.log(`🔊 Generating TTS audio for greeting...`);
      const audioResponse = await TTSService.textToSpeechBase64(greeting, {
        voice: 'nova',
        model: 'tts-1'
      });
      console.log(`✅ TTS audio generated: ${audioResponse.length} chars`);
      
      // Send greeting to client
      socket.emit('conversation:started', {
        sessionId,
        greeting,
        audio: audioResponse,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Conversation started successfully - greeting sent to client`);
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      socket.emit('conversation:error', {
        sessionId,
        error: error.message,
        message: `Failed to start conversation: ${error.message}`
      });
    }
  });

  /**
   * 💬 Send a message in the conversation
   */
  socket.on('conversation:message', async (data) => {
    const { sessionId, message, context } = data;
    
    try {
      console.log(`💬 Message received from session ${sessionId.substring(0, 8)}: "${message.substring(0, 50)}..."`);
      console.log(`   Socket ID: ${socket.id}`);
      
      // Send message to OpenAI and get response
      console.log(`🤖 Sending to OpenAI AI...`);
      
      // Simple OpenAI response generation
      const openaiResponse = await OpenAIService.generateResponse(message, {
        systemPrompt: `You are Nova, a compassionate AI assistant helping a visually impaired person. Be helpful, encouraging, and concise. If they ask to "be my eyes" or activate vision, respond positively.`,
        maxTokens: 200
      });
      
      const result = {
        success: true,
        response: openaiResponse,
        visionModeActive: message.toLowerCase().includes('be my eye') || message.toLowerCase().includes('activate vision')
      };
      
      console.log(`✅ Got response from OpenAI:`, {
        success: result.success,
        responseLength: result.response?.length,
        visionModeActive: result.visionModeActive
      });
      
      if (result.success) {
        // Generate TTS for response
        console.log(`🔊 Generating TTS audio for response...`);
        const audioResponse = await TTSService.textToSpeechBase64(result.response, {
          voice: 'nova',
          model: 'tts-1'
        });
        console.log(`✅ TTS audio generated: ${audioResponse.length} chars`);
        
        // Send response to client
        socket.emit('conversation:response', {
          sessionId,
          message: result.response,
          audio: audioResponse,
          visionModeActive: result.visionModeActive,
          timestamp: result.timestamp
        });
        
        console.log(`✅ Response sent to client: "${result.response.substring(0, 100)}..."`);
        
        // If vision mode was activated, signal the client
        if (result.visionModeActive && message.toLowerCase().includes('be my eye')) {
          socket.emit('conversation:vision_activated', {
            sessionId,
            timestamp: new Date().toISOString()
          });
        }
        
        // If vision mode was deactivated, signal the client
        if (!result.visionModeActive && message.toLowerCase().includes('stop')) {
          socket.emit('conversation:vision_deactivated', {
            sessionId,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Error occurred
        console.error(`❌ Gemini returned error:`, result.error);
        socket.emit('conversation:error', {
          sessionId,
          error: result.error,
          message: result.response
        });
      }
      
    } catch (error) {
      console.error('❌ Error in conversation:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      socket.emit('conversation:error', {
        sessionId,
        error: error.message,
        message: `Error processing message: ${error.message}`
      });
    }
  });

  /**
   * ⚠️ Handle conversation interruption (user spoke while Nova was responding)
   */
  socket.on('conversation:interrupt', async (data) => {
    const { sessionId, timestamp } = data;
    
    console.log(`⚠️ Conversation interrupted by user: ${sessionId.substring(0, 8)}`);
    console.log(`   User spoke at: ${timestamp}`);
    
    // Note: Gemini API doesn't support canceling ongoing requests
    // The frontend handles interruption by clearing the audio queue
    // This event is logged for analytics and future improvements
    
    // Could add tracking here for analytics:
    // - How often users interrupt
    // - Which responses get interrupted
    // - User satisfaction metrics
  });

  /**
   * 💬 Stream a message response (real-time feel)
   */
  socket.on('conversation:message_stream', async (data) => {
    const { sessionId, message, context } = data;
    
    try {
      console.log(`💬 Streaming message: "${message}"`);
      
      let fullResponse = '';
      
      // Generate response using OpenAI (simplified streaming)
      const openaiResponse = await OpenAIService.generateResponse(message, {
        systemPrompt: `You are Nova, a compassionate AI assistant helping a visually impaired person. Be helpful, encouraging, and concise.`,
        maxTokens: 200
      });
      
      fullResponse = openaiResponse;
      
      // Send complete response
      socket.emit('conversation:stream_complete', {
        sessionId,
        fullResponse,
        timestamp: new Date().toISOString()
      });
      
      // Generate TTS for full response
      TTSService.textToSpeechBase64(fullResponse, {
        voice: 'nova',
        model: 'tts-1'
      }).then(audioResponse => {
        socket.emit('conversation:stream_audio', {
          sessionId,
          audio: audioResponse,
          timestamp: new Date().toISOString()
        });
      }).catch(err => {
        console.error('❌ TTS generation failed:', err);
      });
      
      console.log(`✅ Streaming complete`);
      
    } catch (error) {
      console.error('❌ Error in streaming conversation:', error);
      socket.emit('conversation:error', {
        sessionId,
        error: error.message
      });
    }
  });

  /**
   * 💬 Explain a feature
   */
  socket.on('conversation:explain_feature', async (data) => {
    const { sessionId, featureName } = data;
    
    try {
      console.log(`💬 Explaining feature: ${featureName}`);
      
      // Generate feature explanation using OpenAI
      const explanation = await OpenAIService.generateResponse(`Explain the feature: ${featureName}`, {
        systemPrompt: `You are Nova, a helpful AI assistant. Explain the requested feature in a clear, concise way for a visually impaired user.`,
        maxTokens: 150
      });
      
      // Generate TTS
      const audioResponse = await TTSService.textToSpeechBase64(explanation, {
        voice: 'nova',
        model: 'tts-1'
      });
      
      socket.emit('conversation:feature_explained', {
        sessionId,
        featureName,
        explanation: explanation,
        audio: audioResponse,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Feature explained: ${featureName}`);
      
    } catch (error) {
      console.error('❌ Error explaining feature:', error);
      socket.emit('conversation:error', {
        sessionId,
        error: error.message
      });
    }
  });

  /**
   * 📸 Handle frame analysis for conversation
   */
  socket.on('conversation:frame_analysis', async (data) => {
    const { sessionId, frameNumber, analysis, voiceDescription } = data;
    
    try {
      console.log(`📸 Processing frame analysis for conversation session: ${sessionId.substring(0, 8)}`);
      
      // Find the active Realtime session for this conversation
      const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
      if (realtimeSession && realtimeSession.isConnected) {
        console.log(`📤 Sending frame analysis to Nova...`);
        
        // Send frame context to Nova
        realtimeSession.updateFrameContext(analysis);
        
        // Also send a direct message to Nova about what was seen
        const frameMessage = `[CAMERA UPDATE] I can see: ${voiceDescription}`;
        realtimeSession.sendConversationItem({
          type: 'message',
          role: 'system',
          content: [
            {
              type: 'text',
              text: frameMessage
            }
          ]
        });
        
        console.log(`✅ Frame analysis sent to Nova for frame ${frameNumber}`);
      } else {
        console.warn(`⚠️ No active Realtime session found for conversation: ${sessionId.substring(0, 8)}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing frame analysis for conversation:', error);
    }
  });

  /**
   * 👁️ Handle vision activation (emitted from client button click)
   */
  socket.on('conversation:vision_activated', (data) => {
    const { sessionId } = data;
    
    console.log(`👁️ Vision activated for session ${sessionId.substring(0, 8)}`);
    
    // Echo the event back to client to enable frame analysis
    socket.emit('conversation:vision_activated', {
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Vision activation signal sent to client`);
  });

  /**
   * 💬 End conversation session
   */
  socket.on('conversation:end', (data) => {
    const { sessionId } = data;
    
    console.log(`💬 Ending conversation: ${sessionId.substring(0, 8)}`);
    // Conversation session cleanup (no longer using Gemini)
    
    socket.emit('conversation:ended', {
      sessionId,
      timestamp: new Date().toISOString()
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 VisualAID Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection on startup
  await testConnection();
  
  // Initialize response cache with common scenarios
  ResponseCache.initializeCommonScenarios();
  console.log('💾 Response cache initialized');
});

export { app, io };


