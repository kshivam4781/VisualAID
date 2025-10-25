/**
 * 🎤 Conversation Hook
 * 
 * Manages conversational AI interactions with Gemini
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ConversationState {
  isActive: boolean;
  sessionId: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  currentMessage: string | null;
  transcript: string;
  conversationHistory: ConversationMessage[];
  error: string | null;
  visionModeActive: boolean;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audio?: string;
}

interface UseConversationOptions {
  socket: Socket | null;
  onVisionActivated?: () => void;
  onVisionDeactivated?: () => void;
  systemContext?: string;
}

export function useConversation({ socket, onVisionActivated, onVisionDeactivated, systemContext }: UseConversationOptions) {
  const socketRef = useRef<Socket | null>(socket);
  
  // Update socket ref whenever socket changes
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);
  
  const [state, setState] = useState<ConversationState>({
    isActive: false,
    sessionId: null,
    isListening: false,
    isSpeaking: false,
    currentMessage: null,
    transcript: '',
    conversationHistory: [],
    error: null,
    visionModeActive: false
  });

  const recognitionRef = useRef<any>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isStartingRef = useRef(false); // Prevent double-start
  const lastSentMessageRef = useRef<string>(''); // Track last sent message to prevent duplicates
  const lastMessageTimeRef = useRef<number>(0);

  // Initialize speech recognition (ONCE - not on every render)
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) {
      console.log('ℹ️ Speech recognition already initialized, skipping');
      return;
    }
    
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      isInitializedRef.current = true;
      
      console.log('✅ Speech recognition initialized (ONCE) with config:', {
        continuous: true,
        interimResults: true,
        lang: 'en-US',
        maxAlternatives: 1
      });

      recognitionRef.current.onresult = (event: any) => {
        console.log('🎤 Speech recognition result:', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length,
          isFinal: event.results[event.results.length - 1]?.isFinal
        });
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('✅ Final transcript:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Interim transcript:', transcript);
          }
        }

        setState(prev => ({
          ...prev,
          transcript: finalTranscript || interimTranscript
        }));

        // Send final transcript as message (only if session is active)
        if (finalTranscript) {
          const trimmedMessage = finalTranscript.trim();
          
          // Don't send if it's a system prompt (frame analysis)
          if (trimmedMessage.startsWith('[FRAME ANALYSIS') || trimmedMessage.startsWith('[You\'re in vision mode')) {
            console.log('ℹ️ Skipping system prompt from speech recognition');
            setState(prev => ({ ...prev, transcript: '' }));
            return;
          }
          
          // Deduplicate: check if we already have this exact message in history
          setState(currentState => {
            const recentMessages = currentState.conversationHistory.slice(-2);
            const isDuplicate = recentMessages.some(msg => 
              msg.role === 'user' && 
              msg.content.toLowerCase() === trimmedMessage.toLowerCase() &&
              (Date.now() - new Date(msg.timestamp).getTime()) < 3000 // Within 3 seconds
            );
            
            if (isDuplicate) {
              console.warn('⚠️ Duplicate message detected, skipping:', trimmedMessage);
              return { ...currentState, transcript: '' };
            }
            
            // Check if socket and session are available before sending
            const currentSocket = socketRef.current;
            console.log('🔍 Checking if ready to send message:', {
              hasSocket: !!currentSocket,
              socketConnected: currentSocket?.connected,
              hasSessionId: !!currentState.sessionId,
              isActive: currentState.isActive,
              sessionId: currentState.sessionId?.substring(0, 10)
            });
            
            if (currentSocket && currentSocket.connected && currentState.sessionId && currentState.isActive) {
              // Prevent duplicate messages (same message sent within 2 seconds)
              const now = Date.now();
              const isDuplicate = trimmedMessage === lastSentMessageRef.current && 
                                  (now - lastMessageTimeRef.current) < 2000;
              
              if (isDuplicate) {
                console.log('⚠️ Duplicate message detected, skipping:', trimmedMessage);
                return currentState;
              }
              
              lastSentMessageRef.current = trimmedMessage;
              lastMessageTimeRef.current = now;
              
              console.log('📤 Sending transcribed message:', trimmedMessage);
              currentSocket.emit('conversation:message', {
                sessionId: currentState.sessionId,
                message: trimmedMessage,
                context: {}
              });
              console.log('✅ Message sent to backend');
              
              // Add to history
              return {
                ...currentState,
                conversationHistory: [
                  ...currentState.conversationHistory,
                  {
                    role: 'user',
                    content: trimmedMessage,
                    timestamp: new Date().toISOString()
                  }
                ],
                transcript: ''
              };
            } else {
              console.warn('⚠️ Cannot send message: session not ready', {
                hasSocket: !!currentSocket,
                socketConnected: currentSocket?.connected,
                hasSessionId: !!currentState.sessionId,
                isActive: currentState.isActive
              });
              return currentState;
            }
          });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error, event);
        
        // Don't stop on "no-speech" error, just log it
        if (event.error === 'no-speech') {
          console.warn('⚠️ No speech detected, but continuing to listen...');
          return;
        }
        
        setState(prev => ({
          ...prev,
          error: `Speech recognition error: ${event.error}`,
          isListening: false
        }));
      };
      
      recognitionRef.current.onnomatch = () => {
        console.warn('⚠️ Speech recognized but no match found');
      };
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started (onstart event)');
      };
      
      recognitionRef.current.onspeechstart = () => {
        console.log('🗣️ Speech detected!');
        
        // ⚠️ INTERRUPT: Stop all playing audio immediately when user speaks
        if (isPlayingRef.current && audioQueueRef.current.length > 0) {
          console.log('⚠️ User interrupted - stopping all audio playback');
          audioQueueRef.current.forEach(audio => {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch (err) {
              console.warn('Failed to stop audio:', err);
            }
          });
          audioQueueRef.current = [];
          isPlayingRef.current = false;
          
          setState(prev => {
            // Notify backend to cancel any ongoing response generation
            const currentSocket = socketRef.current;
            if (currentSocket && currentSocket.connected && prev.sessionId) {
              console.log('📡 Notifying backend to cancel ongoing response');
              currentSocket.emit('conversation:interrupt', { 
                sessionId: prev.sessionId,
                timestamp: new Date().toISOString()
              });
            }
            
            return { ...prev, isSpeaking: false };
          });
        }
      };
      
      recognitionRef.current.onspeechend = () => {
        console.log('🔇 Speech ended');
      };
      
      recognitionRef.current.onsoundstart = () => {
        console.log('🔊 Sound detected from microphone');
      };
      
      recognitionRef.current.onsoundend = () => {
        console.log('🔇 Sound ended');
      };
      
      recognitionRef.current.onaudiostart = () => {
        console.log('🎧 Audio capture started from microphone');
      };
      
      recognitionRef.current.onaudioend = () => {
        console.log('🎧 Audio capture ended');
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended (onend event)');
        
        // Check current state before restarting
        setState(currentState => {
          console.log('   Current state - isActive:', currentState.isActive, 'isListening:', currentState.isListening);
          
          // Only restart if we're supposed to be listening
          if (currentState.isActive && currentState.isListening) {
            console.log('🔄 Auto-restarting speech recognition after unexpected end...');
            setTimeout(() => {
              try {
                if (recognitionRef.current && !isStartingRef.current) {
                  recognitionRef.current.start();
                }
              } catch (err) {
                console.error('Failed to restart recognition:', err);
              }
            }, 100);
          } else {
            console.log('ℹ️ Not restarting - listening stopped intentionally');
          }
          
          return currentState;
        });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty deps - speech recognition initialized once, handlers use socketRef

  // Listen for frame analysis and send to Nova for description (ONLY important changes)
  useEffect(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket || !state.sessionId || !state.visionModeActive) return;
    
    const handleFrameAnalyzed = (data: any) => {
      const analysis = data.analysis;
      
      // Only auto-describe if there are important changes (dangers, obstacles, or first frame)
      // Extract clean data from GPT-4 Vision analysis for Nova
      const isFirstFrame = data.frameNumber === 1;
      
      const hasImportantChanges = 
        isFirstFrame || // First frame always important
        analysis.safetyLevel === 'danger' ||
        analysis.safetyLevel === 'caution' ||
        (analysis.obstacles && analysis.obstacles.length > 0) ||
        (analysis.warnings && analysis.warnings.length > 0) ||
        (analysis.movingObjects && analysis.movingObjects.length > 0);
      
      if (!hasImportantChanges) {
        console.log(`ℹ️ Frame ${data.frameNumber}: No important changes, Nova stays quiet`);
        return;
      }
      
      const cameraOrientation = analysis.cameraOrientation || null;
      const sceneDesc = analysis.sceneDescription || analysis.description || 'Unknown scene';
      const environmentType = analysis.environmentType || 'unknown';
      const lighting = analysis.lighting || '';
      const imageQuality = analysis.imageQuality || '';
      const viewAhead = analysis.viewAhead || '';
      const relevantObjects = analysis.relevantObjects || analysis.objects || [];
      const obstacles = analysis.obstacles || [];
      const safetyLevel = analysis.safetyLevel || 'unknown';
      const warnings = analysis.warnings || [];
      const movingObjects = analysis.movingObjects || [];
      const pathStatus = analysis.pathStatus || '';
      const conversationalQuestion = analysis.conversationalQuestion || '';
      
      console.log(`🎬 ${isFirstFrame ? '🆕 FIRST FRAME' : 'Frame update'} - sending to Nova:`, {
        frameNumber: data.frameNumber,
        isFirstFrame,
        canSee: analysis.canSee !== false,
        visibilityIssue: analysis.canSee === false ? analysis.visibilityMessage : 'none',
        cameraOrientation: cameraOrientation?.direction || 'unknown',
        needsAdjustment: cameraOrientation?.needsAdjustment || false,
        environmentType,
        lighting,
        safetyLevel,
        obstacles: obstacles.length,
        movingObjects: movingObjects.length,
        warnings: warnings.length
      });
      
      // Create clean, natural prompt for Nova (remove GPT-4's technical instructions)
      let prompt = `[VISION - Frame ${data.frameNumber}${isFirstFrame ? ' - FIRST VIEW' : ''}]\n\n`;
      
      // CRITICAL: Visibility issues (dark/overexposed) - HIGHEST PRIORITY
      if (analysis.canSee === false && analysis.visibilityMessage) {
        prompt += `🚫 CANNOT SEE CLEARLY:\n`;
        prompt += `Reason: ${analysis.visibilityMessage}\n`;
        prompt += `⚠️ PRIORITY: Tell user the visibility problem and what they can do!\n\n`;
      }
      
      // CRITICAL: Camera orientation issues (especially for first frame)
      if (cameraOrientation && cameraOrientation.needsAdjustment) {
        prompt += `🎥 CAMERA ADJUSTMENT NEEDED:\n`;
        prompt += `Direction: ${cameraOrientation.direction} (${cameraOrientation.percentageOfFrame} of frame)\n`;
        prompt += `Message to user: ${cameraOrientation.adjustmentMessage}\n`;
        prompt += `⚠️ PRIORITY: Tell user to adjust camera FIRST before describing scene!\n\n`;
      }
      
      if (isFirstFrame) {
        // First frame: Provide complete context
        prompt += `Environment: ${environmentType}\n`;
        prompt += `Scene: ${sceneDesc}\n`;
        if (lighting && (lighting === 'dim' || lighting === 'dark' || lighting === 'very dark')) {
          prompt += `⚠️ Lighting: ${lighting} - mention this to user\n`;
        }
        if (viewAhead) prompt += `View ahead: ${viewAhead}\n`;
        if (relevantObjects.length > 0) {
          prompt += `Objects: ${relevantObjects.map((o: any) => `${o.name} (${o.position || o.distance || 'nearby'})`).join(', ')}\n`;
        }
        if (conversationalQuestion) prompt += `Question for user: ${conversationalQuestion}\n`;
      } else {
        // Subsequent frames: Focus on changes
        prompt += `Scene: ${sceneDesc}\n`;
        if (relevantObjects.length > 0) {
          prompt += `Objects: ${relevantObjects.map((o: any) => o.name).join(', ')}\n`;
        }
      }
      
      // Focused object analysis (person or large object)
      if (analysis.focusedObject && analysis.focusedObject.detected) {
        const focused = analysis.focusedObject;
        prompt += `\n🎯 MAIN FOCUS (${focused.coveragePercentage || 'unknown'}% of frame):\n`;
        prompt += `Type: ${focused.type || 'unknown'}\n`;
        prompt += `Name: ${focused.name}\n`;
        if (focused.description) prompt += `Description: ${focused.description}\n`;
        if (focused.text) prompt += `Text: ${focused.text}\n`;
        
        // Detailed person analysis
        if (focused.type === 'person') {
          if (focused.facialExpression) prompt += `Expression: ${focused.facialExpression}\n`;
          if (focused.emotion) prompt += `Emotion: ${focused.emotion}\n`;
          if (focused.bodyLanguage) prompt += `Body language: ${focused.bodyLanguage}\n`;
          if (focused.actions) prompt += `Actions: ${focused.actions}\n`;
          if (focused.eyeContact) prompt += `Looking: ${focused.eyeContact}\n`;
        }
      }
      
      // Safety-critical information (always include)
      if (obstacles.length > 0) prompt += `\n⚠️ Obstacles: ${obstacles.map((o: any) => `${o.name} at ${o.distance || 'unknown distance'}`).join(', ')}\n`;
      if (movingObjects.length > 0) prompt += `⚠️ Moving: ${movingObjects.map((o: any) => `${o.name} ${o.direction} (${o.speed})`).join(', ')}\n`;
      if (warnings.length > 0) prompt += `⚠️ Warnings: ${warnings.join(', ')}\n`;
      if (safetyLevel === 'danger' || safetyLevel === 'caution') prompt += `Safety: ${safetyLevel}\n`;
      if (pathStatus) prompt += `Path: ${pathStatus}\n`;
      
      if (isFirstFrame) {
        if (analysis.canSee === false && analysis.visibilityMessage) {
          prompt += `\n[PRIORITY ACTION: Tell user about the visibility problem using the visibility message provided above. Be clear and helpful about what they can do to fix it!]`;
        } else if (cameraOrientation && cameraOrientation.needsAdjustment) {
          prompt += `\n[PRIORITY ACTION: Tell user to adjust camera first using the adjustment message provided above. Then briefly say you'll describe what you see once the camera is adjusted. Be friendly and helpful!]`;
        } else {
          prompt += `\n[This is the FIRST view - give user a complete description of their surroundings in 2-3 sentences. Describe the environment type, what's ahead, and any obstacles. IMPORTANT: If there's a person sitting or standing directly in front of the camera, they are an obstacle blocking the path - describe them as such! If there's a person very close (taking up 30%+ of the frame), analyze them in detail: describe their appearance, facial expression, body language, what they're doing, and their emotional state. ${lighting && (lighting === 'dim' || lighting === 'dark' || lighting === 'very dark') ? 'Mention the poor lighting.' : ''} Be friendly and welcoming - this is their first glimpse through your eyes!]`;
        }
        console.log('📋 First frame prompt:', prompt);
      } else {
        if (analysis.canSee === false && analysis.visibilityMessage) {
          prompt += `\n[Visibility problem: Use the visibility message provided. Be brief and helpful.]`;
        } else if (cameraOrientation && cameraOrientation.needsAdjustment) {
          prompt += `\n[Camera adjustment needed: Use the adjustment message provided. Be brief and polite.]`;
        } else {
          // Check for motion detection alerts
          const hasApproachingObjects = analysis.movingObjects && analysis.movingObjects.some((obj: any) => obj.isApproaching === true);
          const hasUserMoving = analysis.userMoving && analysis.userMoving.isMoving === true;
          
          if (hasApproachingObjects) {
            prompt += `\n[URGENT: Someone or something is approaching the user! Alert them immediately about the approaching object(s) and their direction. Be clear and urgent about the safety concern.]`;
          } else if (hasUserMoving) {
            prompt += `\n[User is moving - provide navigation guidance based on obstacles and path status. Focus on where they're going and any obstacles ahead.]`;
          } else {
            prompt += `\n[User appears stationary - focus on what they're looking at. If there's a person very close (30%+ of frame), analyze them in detail. If someone is moving in the background, mention it briefly.]`;
          }
        }
      }

      // Send to conversation system (use ref to get current socket)
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('conversation:message', {
          sessionId: state.sessionId,
          message: prompt,
          context: {
            isFrameAnalysis: true,
            frameNumber: data.frameNumber,
            automated: true // Mark as automated description
          }
        });
      }
    };
    
    currentSocket.on('frame:analyzed', handleFrameAnalyzed);
    
    return () => {
      currentSocket.off('frame:analyzed', handleFrameAnalyzed);
    };
  }, [state.sessionId, state.visionModeActive]);

  // Listen for conversation events
  useEffect(() => {
    if (!socket) return;

    const handleConversationStarted = (data: any) => {
      console.log('✅ 💬 Conversation started successfully:', {
        sessionId: data.sessionId?.substring(0, 8),
        greeting: data.greeting?.substring(0, 50),
        hasAudio: !!data.audio,
        timestamp: data.timestamp
      });
      
      // Clear the timeout since we got a response
      if ((window as any).__conversationStartTimeout) {
        clearTimeout((window as any).__conversationStartTimeout);
        delete (window as any).__conversationStartTimeout;
      }
      
      setState(prev => ({
        ...prev,
        isActive: true,
        sessionId: data.sessionId,
        conversationHistory: [{
          role: 'assistant',
          content: data.greeting,
          timestamp: data.timestamp,
          audio: data.audio
        }]
      }));

      // Play greeting audio
      if (data.audio) {
        console.log('🔊 Playing greeting audio...');
        playAudio(data.audio, true); // Mark as greeting
      } else {
        console.warn('⚠️ No audio in greeting response');
      }
    };

    const handleConversationResponse = (data: any) => {
      console.log('✅ 💬 Response received:', {
        message: data.message?.substring(0, 50),
        hasAudio: !!data.audio,
        visionModeActive: data.visionModeActive,
        timestamp: data.timestamp
      });
      
      // Stop listening while Nova responds (prevent echo)
      setState(prev => {
        if (prev.isListening && recognitionRef.current) {
          console.log('🔇 Stopping listening while Nova responds...');
          try {
            recognitionRef.current.stop();
          } catch (err) {
            console.warn('Failed to stop recognition:', err);
          }
        }
        
        return {
          ...prev,
          isListening: false,
          currentMessage: data.message,
          visionModeActive: data.visionModeActive,
          conversationHistory: [
            ...prev.conversationHistory,
            {
              role: 'assistant',
              content: data.message,
              timestamp: data.timestamp,
              audio: data.audio
            }
          ]
        };
      });

      // Play response audio
      if (data.audio) {
        console.log('🔊 Playing response audio...');
        playAudio(data.audio, false); // Not a greeting, will auto-restart listening after
      } else {
        console.warn('⚠️ No audio in response');
      }
    };

    const handleVisionActivated = (data: any) => {
      console.log('👁️ Vision mode activated via conversation');
      setState(prev => ({ ...prev, visionModeActive: true }));
      onVisionActivated?.();
    };

    const handleVisionDeactivated = (data: any) => {
      console.log('👁️ Vision mode deactivated via conversation');
      setState(prev => ({ ...prev, visionModeActive: false }));
      onVisionDeactivated?.();
    };

    const handleConversationError = (data: any) => {
      console.error('❌ 💬 Conversation error:', {
        error: data.error,
        message: data.message,
        sessionId: data.sessionId?.substring(0, 8)
      });
      setState(prev => ({
        ...prev,
        error: data.error || data.message || 'An error occurred'
      }));
      
      // Show error as audio too
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(data.error || 'An error occurred');
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleConversationEnded = (data: any) => {
      console.log('💬 Conversation ended');
      setState(prev => ({
        ...prev,
        isActive: false,
        sessionId: null,
        isListening: false
      }));
    };

    socket.on('conversation:started', handleConversationStarted);
    socket.on('conversation:response', handleConversationResponse);
    socket.on('conversation:vision_activated', handleVisionActivated);
    socket.on('conversation:vision_deactivated', handleVisionDeactivated);
    socket.on('conversation:error', handleConversationError);
    socket.on('conversation:ended', handleConversationEnded);

    return () => {
      socket.off('conversation:started', handleConversationStarted);
      socket.off('conversation:response', handleConversationResponse);
      socket.off('conversation:vision_activated', handleVisionActivated);
      socket.off('conversation:vision_deactivated', handleVisionDeactivated);
      socket.off('conversation:error', handleConversationError);
      socket.off('conversation:ended', handleConversationEnded);
    };
  }, [socket, onVisionActivated, onVisionDeactivated]);

  // Play audio from base64
  const playAudio = useCallback((audioBase64: string, isGreeting: boolean = false) => {
    setState(prev => ({ ...prev, isSpeaking: true }));

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    
    audio.onended = () => {
      console.log('🔊 Audio playback ended', { isGreeting, queueLength: audioQueueRef.current.length });
      setState(prev => ({ ...prev, isSpeaking: false }));
      audioQueueRef.current.shift();
      
      // Play next in queue
      if (audioQueueRef.current.length > 0) {
        console.log('📋 Playing next audio in queue...');
        audioQueueRef.current[0].play();
      } else {
        // All audio finished - NOW we can safely start listening
        isPlayingRef.current = false;
        console.log('✅ All audio playback complete - microphone should be free now');
        
        // Auto-restart listening after any audio (greeting or response)
        console.log('🎤 Scheduling listening restart in 500ms...');
        setTimeout(() => {
          console.log('⏰ Listening restart timer fired');
          
        setState(currentState => {
          // Prevent double-start from React double-render
          if (isStartingRef.current) {
            console.log('⚠️ Already starting recognition, skipping duplicate');
            return currentState;
          }
          
            if (!currentState.isListening && currentState.isActive) {
              console.log('✅ Conditions met - starting speech recognition');
              console.log('   - isListening:', currentState.isListening);
              console.log('   - isActive:', currentState.isActive);
              console.log('   - recognitionRef exists:', !!recognitionRef.current);
              console.log('   - isStarting flag:', isStartingRef.current);
              
              // Call startListening directly
              if (recognitionRef.current) {
                try {
                  isStartingRef.current = true;
                  console.log('🎤 Calling recognitionRef.current.start()...');
                  recognitionRef.current.start();
                  console.log('✅ Speech recognition start() called successfully');
                  
                  // Reset flag after a short delay
                  setTimeout(() => {
                    isStartingRef.current = false;
                  }, 1000);
                  
                  return { ...currentState, isListening: true, transcript: '', error: null };
                } catch (err: any) {
                  isStartingRef.current = false;
                  
                  // If already started, that's fine - just update state to match reality
                  if (err.name === 'InvalidStateError' && err.message?.includes('already started')) {
                    console.log('ℹ️ Recognition already running, updating state to match');
                    return { ...currentState, isListening: true, transcript: '', error: null };
                  }
                  
                  console.error('❌ Failed to auto-start listening:', err);
                  console.error('   Error name:', err.name);
                  console.error('   Error message:', err.message);
                }
              } else {
                console.error('❌ Cannot start - recognitionRef null');
              }
            } else {
              console.log('ℹ️ Skipping auto-start:');
              console.log('   - isListening:', currentState.isListening, '(should be false)');
              console.log('   - isActive:', currentState.isActive, '(should be true)');
            }
            return currentState;
          });
        }, 500); // Reduced to 500ms - just enough for audio to release mic
      }
    };

    audio.onerror = (err) => {
      console.error('Audio playback error:', err);
      setState(prev => ({ ...prev, isSpeaking: false }));
      isPlayingRef.current = false;
    };

    audioQueueRef.current.push(audio);

    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      audio.play();
    }
  }, []);

  // Start conversation
  const startConversation = useCallback((userName?: string) => {
    if (!socket) {
      console.error('❌ Cannot start conversation: socket not connected');
      setState(prev => ({ ...prev, error: 'Not connected to server' }));
      return;
    }

    const sessionId = `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    console.log('💬 Starting conversation...', {
      sessionId: sessionId.substring(0, 8),
      socketConnected: socket.connected,
      socketId: socket.id
    });
    socket.emit('conversation:start', { sessionId, userName });
    console.log('✅ Emitted conversation:start event');
    
    setState(prev => ({
      ...prev,
      sessionId,
      isActive: true, // Set active immediately so user can speak right away
      error: null
    }));
    
    // Set a timeout to detect if backend doesn't respond
    const timeoutId = setTimeout(() => {
      setState(currentState => {
        // Only show error if still not active after 10 seconds
        if (!currentState.isActive && currentState.sessionId === sessionId) {
          console.error('❌ Backend did not respond to conversation:start event');
          return {
            ...currentState,
            error: 'Backend server is not responding. Please check if the backend is running on port 3000.'
          };
        }
        return currentState;
      });
    }, 10000); // 10 second timeout
    
    // Store timeout ID for cleanup
    (window as any).__conversationStartTimeout = timeoutId;
  }, [socket]);

  // Start listening
  const startListening = useCallback(() => {
    console.log('🎤 startListening() called');
    
    if (!recognitionRef.current) {
      console.error('❌ Speech recognition not available');
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    // CRITICAL: Stop any playing audio first to free up microphone
    audioQueueRef.current.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) {
        console.warn('Failed to stop audio:', err);
      }
    });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    setState(prev => ({ ...prev, isSpeaking: false }));

    // Small delay to ensure audio is fully released
    setTimeout(() => {
      try {
        console.log('🎤 Starting speech recognition (microphone should be free)...');
        recognitionRef.current.start();
        setState(prev => ({ ...prev, isListening: true, transcript: '', error: null }));
        console.log('✅ Speech recognition start command sent');
      } catch (err: any) {
        console.error('❌ Failed to start listening:', err);
        // If already started, just update state
        if (err.message?.includes('already started')) {
          console.log('ℹ️ Speech recognition already running, updating state only');
          setState(prev => ({ ...prev, isListening: true, transcript: '', error: null }));
        } else {
          setState(prev => ({ ...prev, error: `Failed to start listening: ${err.message}` }));
        }
      }
    }, 100); // 100ms delay to ensure audio is released
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  // Send message
  const sendMessage = useCallback((message: string) => {
    if (!socket) {
      console.error('❌ Cannot send message: socket not connected');
      return;
    }
    
    if (!state.sessionId) {
      console.error('❌ Cannot send message: no active session');
      return;
    }

    console.log('📤 Sending message:', {
      message: message.substring(0, 50),
      sessionId: state.sessionId.substring(0, 8),
      socketConnected: socket.connected
    });
    
    // Add to history
    setState(prev => ({
      ...prev,
      conversationHistory: [
        ...prev.conversationHistory,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        }
      ],
      transcript: ''
    }));

    // Send to backend
    socket.emit('conversation:message', {
      sessionId: state.sessionId,
      message,
      context: {
        systemContext: systemContext || undefined
      }
    });
    console.log('✅ Message sent to backend');
  }, [socket, state.sessionId, systemContext]);

  // End conversation
  const endConversation = useCallback(() => {
    if (!socket || !state.sessionId) return;

    console.log('💬 Ending conversation...');
    socket.emit('conversation:end', { sessionId: state.sessionId });
    
    stopListening();
  }, [socket, state.sessionId, stopListening]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    startConversation,
    startListening,
    stopListening,
    sendMessage,
    endConversation,
    clearError
  };
}

