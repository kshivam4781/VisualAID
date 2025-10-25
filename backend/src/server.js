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
import * as GeminiConversationService from './services/geminiConversationService.js';
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
          
          // Update Realtime session (if exists)
          const realtimeSession = RealtimeService.getRealtimeSession(sessionId);
          if (realtimeSession) {
            realtimeSession.updateFrameContext(analysis);
            if (criticalObstacles.length > 0) {
              const alertMessage = criticalObstacles.map(o => 
                `${o.name} at ${o.distance} to your ${o.position}. ${o.action}`
              ).join('. ');
              realtimeSession.sendUrgentAlert(alertMessage);
            }
          }
        })
        .catch(error => {
          console.error(`❌ [ANALYSIS FAILED] AI Analysis failed for frame ${metadata.captureCount}:`, error.message);
          console.error(`❌ [ANALYSIS FAILED] Error details:`, error);
          
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
    const { sessionId, command, confidence, timestamp } = data;
    console.log(`Voice command - Session: ${sessionId}, Command: "${command}", Confidence: ${(confidence * 100).toFixed(0)}%`);
    
    // TODO Phase 4: Process command with ChatGPT
    
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
      
      // Create conversation session
      GeminiConversationService.createConversationSession(sessionId, {
        userInfo: { name: userName }
      });
      console.log(`✅ Conversation session created`);
      
      // Get greeting
      const greeting = GeminiConversationService.getConversationGreeting(userName);
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
      
      // Send message to Gemini and get response
      console.log(`🤖 Sending to Gemini AI...`);
      const result = await GeminiConversationService.sendMessage(sessionId, message, context);
      console.log(`✅ Got response from Gemini:`, {
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
      
      // Stream response chunks to client
      const result = await GeminiConversationService.sendMessageStreaming(
        sessionId,
        message,
        context,
        (chunk, isComplete) => {
          if (!isComplete && chunk) {
            fullResponse += chunk;
            socket.emit('conversation:stream_chunk', {
              sessionId,
              chunk,
              timestamp: new Date().toISOString()
            });
          } else if (isComplete) {
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
          }
        }
      );
      
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
      
      const result = await GeminiConversationService.explainFeature(sessionId, featureName);
      
      if (result.success) {
        // Generate TTS
        const audioResponse = await TTSService.textToSpeechBase64(result.response, {
          voice: 'nova',
          model: 'tts-1'
        });
        
        socket.emit('conversation:feature_explained', {
          sessionId,
          featureName,
          explanation: result.response,
          audio: audioResponse,
          timestamp: result.timestamp
        });
        
        console.log(`✅ Feature explained: ${featureName}`);
      }
      
    } catch (error) {
      console.error('❌ Error explaining feature:', error);
      socket.emit('conversation:error', {
        sessionId,
        error: error.message
      });
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
          GeminiConversationService.endConversationSession(sessionId);
    
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


