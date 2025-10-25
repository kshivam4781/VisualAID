import React, { useEffect, useRef } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useAudioQueue } from '../hooks/useAudioQueue';
import { useRealtimeAudio } from '../hooks/useRealtimeAudio';
import { useMenuNavigation } from '../hooks/useMenuNavigation';
import { useCameraAccess } from '../hooks/useCameraAccess';
import { useFrameCapture } from '../hooks/useFrameCapture';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { websocketService } from '../services/websocket';
import { getGreeting, getTimeBasedGreeting } from '../utils/greetings';
import { getMenuPrompt, parseMenuCommand } from '../utils/menuPrompts';
import { isRealtimeEnabled } from '../config/voice';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import './VoiceInterface.css';

export const VoiceInterface: React.FC = () => {
  const [hasGreeted, setHasGreeted] = React.useState(false);
  const [hasShownMainMenu, setHasShownMainMenu] = React.useState(false);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = React.useState(false);
  const [socket, setSocket] = React.useState<any>(null);
  const [showAuthPage, setShowAuthPage] = React.useState<'signin' | 'signup' | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const lastActiveStateRef = useRef<boolean | null>(null);
  const lastCommandRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    voiceState,
    stopListening,
    toggleListening,
    clearError,
    isSupported,
  } = useVoiceRecognition();

  // 🔊 Centralized Audio Queue - Prevents overlapping speech!
  const audioQueue = useAudioQueue();
  
  // Create ttsState object for compatibility with existing code
  const ttsState = {
    isSpeaking: audioQueue.state.isPlaying,
    isPaused: false,
    error: audioQueue.state.error,
    currentText: audioQueue.state.currentItem?.text || null
  };

  // Speak function using queue with priority support - wrapped in useCallback to prevent re-renders
  const speak = React.useCallback((text: string, interrupt: boolean = false) => {
    audioQueue.speak(text, interrupt ? 'urgent' : 'normal');
  }, []); // audioQueue methods are stable, don't need in deps
  
  const stopSpeaking = React.useCallback(() => {
    audioQueue.stopAll();
  }, []); // audioQueue methods are stable

  const isTTSSupported = () => true; // Always supported (uses API)

  const {
    menuContext,
    navigateToMenu,
    resetToMainMenu,
  } = useMenuNavigation();

  const {
    cameraState,
    startCamera,
    stopCamera,
    attachToVideo,
    clearError: clearCameraError,
  } = useCameraAccess({
    config: {
      width: 1280,
      height: 720,
      facingMode: 'environment',
      frameRate: 30,
    },
    onError: (error) => {
      console.error('Camera error:', error);
      speak(`Camera error: ${error.userMessage}`, true);
    },
    onPermissionGranted: () => {
      speak('Camera access granted. Vision mode is now active.', false);
    },
    onPermissionDenied: () => {
      speak('Camera permission was denied. Please allow camera access in your browser settings to use vision mode.', true);
    },
  });

  // Session management hook
  const {
    sessionState,
    startSession,
    endSession,
    clearError: clearSessionError,
    getSessionDuration,
  } = useSessionManagement({ isConnected: isWebSocketConnected });

  // OpenAI Realtime Audio hook (voice-to-voice)
  const realtimeAudio = useRealtimeAudio({
    socket: socket,
    sessionId: sessionState.sessionId,
    enabled: isRealtimeEnabled() && sessionState.isActive
  });

  // 🎤 Start Realtime session when session becomes active
  useEffect(() => {
    const realtimeEnabled = isRealtimeEnabled();
    
    console.log('🔍 Realtime check:', {
      realtimeEnabled,
      sessionActive: sessionState.isActive,
      sessionId: sessionState.sessionId,
      isConnected: realtimeAudio.isConnected
    });
    
    if (realtimeEnabled && sessionState.isActive && sessionState.sessionId && !realtimeAudio.isConnected) {
      console.log('🎤 Auto-starting Realtime session for active vision session...');
      realtimeAudio.startRealtime();
    }
  }, [sessionState.isActive, sessionState.sessionId, realtimeAudio.isConnected, realtimeAudio.startRealtime]);

  // Frame capture hook
  const {
    state: frameCaptureState,
    startCapture,
    stopCapture: stopFrameCapture,
  } =   useFrameCapture({
    intervalMs: 15000, // 15 seconds - reduced frequency to prevent database overload
    quality: 0.92, // High quality for better AI accuracy (images stored locally, not in DB)
    maxWidth: 1280, // Increased from 640 for more detail
    maxHeight: 720, // Increased from 480 for more detail
    format: 'jpeg',
    onFrameCaptured: async (frameData, metadata) => {
      // Send frame to backend via WebSocket
      if (isWebSocketConnected) {
        try {
          const response = await websocketService.sendFrame(frameData, metadata);
          
          // ⚡ INSTANT ACKNOWLEDGEMENT - Play immediately using TTS
          if (response.immediateAck) {
            console.log(`⚡ Immediate feedback: "${response.immediateAck}"`);
            // Speak using OpenAI TTS (simpler, cheaper than Realtime API)
            speak(response.immediateAck, false);
          }
        } catch (error) {
          console.error('Error sending frame:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Frame capture error:', error);
    },
  });

  // Connect to WebSocket on component mount
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        await websocketService.connect(serverUrl);
        setIsWebSocketConnected(true);
        setSocket(websocketService.getSocket());
        console.log('WebSocket connected successfully');
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsWebSocketConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  // ⚡ Listen for quick scan results (0.5-1s response)
  useEffect(() => {
    const handleQuickScan = (data: any) => {
      console.log(`⚡ Quick scan received (${data.duration}ms): ${data.quickResponse}`);
      
      // Speak the quick scan result using OpenAI TTS
      if (data.quickResponse) {
        const isUrgent = data.hasDanger;
        speak(data.quickResponse, isUrgent); // Interrupt if danger detected
        
        if (data.hasDanger) {
          console.log('🚨 DANGER DETECTED in quick scan!');
        }
      }
    };

    websocketService.on('frame:quick_scan', handleQuickScan);

    return () => {
      websocketService.off('frame:quick_scan', handleQuickScan);
    };
  }, [speak]);

  // 📭 Handle "no changes" - ask if user needs help
  useEffect(() => {
    if (!sessionState.sessionId) return;

    const handleNoChanges = (data: any) => {
      console.log(`📭 No changes detected for frame ${data.frameNumber}`);
      
      if (data.sessionId === sessionState.sessionId) {
        // Ask if user needs help
        const helpPrompt = "Everything looks the same. Is there anything I can help you with?";
        speak(helpPrompt, false);
        
        // Start listening for user question after a short delay
        setTimeout(() => {
          if (sessionState.isActive && !voiceState.isListening) {
            console.log('🎤 Starting to listen for user question...');
            toggleListening();
          }
        }, 3000); // Wait 3 seconds for the prompt to finish
      }
    };

    websocketService.on('frame:no_changes', handleNoChanges);

    return () => {
      websocketService.off('frame:no_changes', handleNoChanges);
    };
  }, [sessionState.sessionId, sessionState.isActive, speak, toggleListening, voiceState.isListening]);

  // 🔊 Play OpenAI TTS audio when received - Use centralized queue!
  useEffect(() => {
    if (!sessionState.sessionId) return;

    const handleFrameAudio = (data: any) => {
      console.log(`📥 Received frame:audio event:`, { 
        sessionId: data.sessionId?.substring(0, 8), 
        frameNumber: data.frameNumber,
        currentSessionId: sessionState.sessionId?.substring(0, 8),
        audioLength: data.audio?.length,
        hasImportantChanges: data.hasImportantChanges
      });
      
      if (data.sessionId === sessionState.sessionId && data.audio) {
        // If important changes detected while user might be speaking, interrupt
        if (data.hasImportantChanges && voiceState.isListening) {
          console.log('🚨 Important changes detected - interrupting listening mode');
          stopListening();
        }
        
        // Add to centralized queue - prevents overlapping!
        audioQueue.playBase64(
          data.audio, 
          `frame-${data.frameNumber}`, 
          data.hasImportantChanges ? 'high' : 'normal' // High priority if important changes
        );
      }
    };

    // Listen for TTS audio
    console.log(`🎧 Setting up frame:audio listener for session ${sessionState.sessionId.substring(0, 8)}`);
    websocketService.on('frame:audio', handleFrameAudio);

    return () => {
      console.log(`🔇 Removing frame:audio listener`);
      websocketService.off('frame:audio', handleFrameAudio);
    };
  }, [sessionState.sessionId, voiceState.isListening, stopListening]);

  // ❓ Listen for question answers from backend
  useEffect(() => {
    if (!isWebSocketConnected) return;

    const handleQuestionAnswer = (data: any) => {
      console.log('💬 Received answer to question:', data);
      
      // Play answer with HIGH priority (interrupts frame descriptions)
      if (data.audio) {
        audioQueue.playBase64(data.audio, `question-answer-${Date.now()}`, 'high');
      } else if (data.answer) {
        // Fallback to TTS if no audio provided
        audioQueue.enqueue({
          id: `question-answer-${Date.now()}`,
          audioData: '',
          type: 'tts',
          priority: 'high',
          text: data.answer
        });
      }
    };

    websocketService.on('question:answer', handleQuestionAnswer);

    return () => {
      websocketService.off('question:answer', handleQuestionAnswer);
    };
  }, [isWebSocketConnected]); // Remove audioQueue from dependencies!

  // 🤖 AI ANALYSIS: Listen for analysis from ChatGPT (GPT-4o)
  useEffect(() => {
    if (!isWebSocketConnected) return;

    const handleFrameAnalysis = (data: any) => {
      const { frameNumber, analysis } = data;
      
      console.log(`🎯 Received ChatGPT analysis for frame ${frameNumber}:`, analysis);
      
      // Log user movement (if detected)
      if (analysis.userMoving && analysis.userMoving.isMoving) {
        console.log(`🚶 USER MOVEMENT DETECTED:`, analysis.userMoving);
        console.log(`   Direction: ${analysis.userMoving.direction}`);
        console.log(`   Speed: ${analysis.userMoving.speed}`);
        console.log(`   Indication: ${analysis.userMoving.indication}`);
      }
      
      // ✅ NO NEED TO SPEAK HERE - Audio is pre-generated via frame:audio event
      // The backend sends OpenAI TTS audio separately via 'frame:audio' event
      // which is handled by the useEffect above (lines 229-265)
      
      // Log safety level
      if (analysis.safetyLevel) {
        console.log(`🛡️ Safety Level: ${analysis.safetyLevel}`);
      }
      
      // Log obstacles
      if (analysis.obstacles && analysis.obstacles.length > 0) {
        console.log(`⚠️ Obstacles detected:`, analysis.obstacles);
      }
      
      // Log moving objects (IMPORTANT for safety!)
      if (analysis.movingObjects && analysis.movingObjects.length > 0) {
        console.log(`🚨 MOTION DETECTED:`, analysis.movingObjects);
        
        // Highlight dangerous movement
        const dangerousMovement = analysis.movingObjects.filter(
          (obj: any) => obj.safetyLevel === 'danger'
        );
        if (dangerousMovement.length > 0) {
          console.warn(`⚠️⚠️⚠️ DANGEROUS MOVEMENT:`, dangerousMovement);
          
          // Could add visual alert here in the future
          dangerousMovement.forEach((obj: any) => {
            if (obj.alert) {
              console.error(`🚨 ALERT: ${obj.alert}`);
            }
          });
        }
      }
    };

    // Register event listener
    websocketService.on('frame:analyzed', handleFrameAnalysis);

    // Cleanup on unmount
    return () => {
      websocketService.off('frame:analyzed', handleFrameAnalysis);
    };
  }, [isWebSocketConnected, voiceState.isActive, speak]);

  // Greet the user after first interaction
  useEffect(() => {
    if (hasUserInteracted && !hasGreeted && isTTSSupported) {
      const timeGreeting = getTimeBasedGreeting();
      const welcomeGreeting = getGreeting('welcome');
      speak(`${timeGreeting} ${welcomeGreeting.text}`, true);
      setHasGreeted(true);
      navigateToMenu('greeting');
    }
  }, [hasUserInteracted, hasGreeted, isTTSSupported, speak, navigateToMenu]);

  // Show main menu after greeting
  useEffect(() => {
    if (hasGreeted && !hasShownMainMenu && !ttsState.isSpeaking && isTTSSupported) {
      const mainMenuPrompt = getMenuPrompt('main_menu');
      speak(mainMenuPrompt.text, false);
      setHasShownMainMenu(true);
      navigateToMenu('main_menu');
    }
  }, [hasGreeted, hasShownMainMenu, ttsState.isSpeaking, isTTSSupported, speak, navigateToMenu]);

  // Attach camera stream to video element
  useEffect(() => {
    if (cameraState.isActive && videoRef.current) {
      attachToVideo(videoRef.current);
    }
  }, [cameraState.isActive, attachToVideo]);

  // Start/stop frame capture and session when camera becomes active/inactive
  useEffect(() => {
    if (cameraState.isActive && videoRef.current && voiceState.isActive && !frameCaptureState.isCapturing) {
      console.log('Starting frame capture and session...');
      
      // Start session first
      if (isWebSocketConnected && !sessionState.isActive) {
        startSession(undefined, {
          userAgent: navigator.userAgent,
          startedFrom: 'voice_command',
          browserInfo: {
            language: navigator.language,
            platform: navigator.platform,
          }
        }).then(success => {
          if (success) {
            // Then start frame capture
            startCapture(videoRef.current!);
          } else {
            console.error('Failed to start session');
            speak('Failed to start vision session. Please try again.', true);
          }
        });
      }
    } else if (!cameraState.isActive && frameCaptureState.isCapturing) {
      console.log('Stopping frame capture and session...');
      stopFrameCapture();
      
      // End session
      if (isWebSocketConnected && sessionState.isActive) {
        endSession().then(result => {
          if (result.success) {
            console.log(`Session ended with ${result.frameCount} frames`);
          }
        });
      }
    }
  }, [cameraState.isActive, voiceState.isActive, frameCaptureState.isCapturing, isWebSocketConnected, sessionState.isActive]);

  // Cleanup on unmount ONLY (empty deps = runs once)
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
      stopCamera();
      stopFrameCapture();
    };
  }, []); // Empty deps = only cleanup on unmount

  // 🎤 Question Detection Helper
  const isQuestion = (text: string): boolean => {
    const questionWords = ['what', 'where', 'when', 'who', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'should', 'do', 'does'];
    const lowerText = text.toLowerCase().trim();
    
    // Check if starts with question word or ends with ?
    const startsWithQuestion = questionWords.some(word => lowerText.startsWith(word + ' '));
    const endsWithQuestion = lowerText.endsWith('?') || lowerText.endsWith(' question');
    
    return startsWithQuestion || endsWithQuestion;
  };

  // Handle voice commands and menu navigation
  useEffect(() => {
    if (!hasUserInteracted || !voiceState.lastCommand) return;
    
    const currentCommand = voiceState.lastCommand.command;
    
    // Avoid processing the same command twice
    if (currentCommand === lastCommandRef.current) return;
    lastCommandRef.current = currentCommand;
    
    // 🚨 PRIORITY: Check if this is a question - interrupt everything!
    if (isQuestion(currentCommand)) {
      console.log('❓ QUESTION DETECTED - Interrupting all audio!');
      audioQueue.stopAll(); // Stop everything
      
      // Send question to backend for immediate answer
      if (sessionState.isActive && sessionState.sessionId) {
        console.log(`📤 Sending question to backend: "${currentCommand}"`);
        websocketService.getSocket()?.emit('user:question', {
          sessionId: sessionState.sessionId,
          question: currentCommand,
          timestamp: new Date().toISOString()
        });
        
        // Speak acknowledgment immediately
        speak('Let me check...', true);
      } else {
        speak('Please start vision mode first by saying "be my eye"', true);
      }
      
      return; // Don't process as a menu command
    }
    
    // Parse the command for menu navigation
    const menuAction = parseMenuCommand(currentCommand, menuContext.currentMenu);
    
    if (menuAction.action === 'activate_vision') {
      // Vision mode activation
      const activatedGreeting = getGreeting('activated');
      speak(activatedGreeting.text, true);
      navigateToMenu('vision_mode');
      
      // 🎤 Realtime session will start automatically via useEffect when session is created
      
      // Start camera for vision mode (only if not already active)
      if (!cameraState.isActive && !cameraState.isLoading) {
        console.log('Attempting to start camera...');
        startCamera().then(success => {
          if (success) {
            console.log('Camera started successfully');
          } else {
            console.error('Failed to start camera - check camera permissions');
            speak('Camera failed to start. Please check your camera permissions and try again.', true);
          }
        }).catch(error => {
          console.error('Camera start error:', error);
          speak('An error occurred while starting the camera.', true);
        });
      }
    } else if (menuAction.action === 'deactivate_vision') {
      // Vision mode deactivation
      const deactivatedGreeting = getGreeting('deactivated');
      speak(deactivatedGreeting.text, true);
      navigateToMenu('main_menu');
      
      // 🔌 Stop OpenAI Realtime session (if enabled)
      if (isRealtimeEnabled()) {
        console.log('🔌 Stopping OpenAI Realtime session...');
        realtimeAudio.stopRealtime();
      }
      
      // Stop camera when deactivating vision mode
      if (cameraState.isActive) {
        console.log('Stopping camera...');
        stopCamera();
      }
      
      // Show main menu prompt after deactivation
      setTimeout(() => {
        const mainMenuPrompt = getMenuPrompt('main_menu');
        speak(mainMenuPrompt.text, false);
      }, 2000);
    } else if (menuAction.action === 'help') {
      // Help command
      navigateToMenu('help');
      const helpPrompt = getMenuPrompt('help');
      speak(helpPrompt.text, false);
    } else if (menuAction.action === 'signup') {
      // Sign up command
      navigateToMenu('signup');
      setShowAuthPage('signup');
      speak('Opening sign up page', false);
    } else if (menuAction.action === 'signin') {
      // Sign in command
      navigateToMenu('signin');
      setShowAuthPage('signin');
      speak('Opening sign in page', false);
    } else if (menuAction.action === 'tutorial') {
      // Tutorial command
      navigateToMenu('tutorial');
      const tutorialPrompt = getMenuPrompt('tutorial');
      speak(tutorialPrompt.text, false);
    } else if (menuAction.action === 'use_case') {
      // Use case command
      navigateToMenu('use_case');
      const useCasePrompt = getMenuPrompt('use_case');
      speak(useCasePrompt.text, false);
    } else if (menuAction.action === 'about') {
      // About command
      navigateToMenu('about');
      const aboutPrompt = getMenuPrompt('about');
      speak(aboutPrompt.text, false);
    } else if (menuAction.action === 'back') {
      // Return to main menu
      resetToMainMenu();
      if (menuAction.response) {
        speak(menuAction.response, false);
      }
      setTimeout(() => {
        const mainMenuPrompt = getMenuPrompt('main_menu');
        speak(mainMenuPrompt.text, false);
      }, 1500);
    }
  }, [voiceState.lastCommand, hasUserInteracted, voiceState.isActive, menuContext.currentMenu, speak, navigateToMenu, resetToMainMenu]);

  // Sync menu state with voice active state
  useEffect(() => {
    if (!hasUserInteracted) return;
    
    // Only update if the active state actually changed
    if (voiceState.isActive !== lastActiveStateRef.current) {
      lastActiveStateRef.current = voiceState.isActive;
      
      // Update menu when vision mode changes externally
      if (voiceState.isActive && menuContext.currentMenu !== 'vision_mode') {
        navigateToMenu('vision_mode');
      } else if (!voiceState.isActive && menuContext.currentMenu === 'vision_mode') {
        navigateToMenu('main_menu');
      }
    }
  }, [voiceState.isActive, hasUserInteracted, menuContext.currentMenu, navigateToMenu]);

  // Handle auth success
  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setShowAuthPage(null);
    navigateToMenu('main_menu');
    speak(`Welcome ${user.name}! You are now signed in.`, false);
  };

  if (!isSupported) {
    return (
      <div className="voice-interface error">
        <div className="error-message">
          <h2>⚠️ Browser Not Supported</h2>
          <p>
            Your browser doesn't support voice recognition. Please use Google Chrome or Microsoft Edge.
          </p>
        </div>
      </div>
    );
  }

  // Show Auth Pages
  if (showAuthPage === 'signin') {
    return (
      <SignInPage
        onSignUpClick={() => setShowAuthPage('signup')}
        onSignInSuccess={handleAuthSuccess}
      />
    );
  }

  if (showAuthPage === 'signup') {
    return (
      <SignUpPage
        onSignInClick={() => setShowAuthPage('signin')}
        onSignUpSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="voice-interface">
      <div className="header">
        <h1>VisualAID</h1>
        <p className="tagline">Your AI-powered visual assistant</p>
      </div>

      <div className={`status-container ${voiceState.isActive ? 'active' : ''} ${menuContext.currentMenu !== 'idle' ? 'menu-active' : ''}`}>
        <div className="status-indicator">
          <div className={`pulse ${voiceState.isListening ? 'listening' : ''} ${ttsState.isSpeaking ? 'speaking' : ''}`}></div>
          <div className="status-icon">
            {voiceState.isActive ? '👁️' : 
             ttsState.isSpeaking ? '🔊' : 
             menuContext.currentMenu === 'help' ? '❓' : 
             menuContext.currentMenu === 'signup' ? '📝' :
             menuContext.currentMenu === 'signin' ? '🔐' :
             menuContext.currentMenu === 'tutorial' ? '📚' :
             menuContext.currentMenu === 'use_case' ? '💡' :
             menuContext.currentMenu === 'about' ? 'ℹ️' : '🎤'}
          </div>
        </div>

        <div className="status-text">
          {voiceState.isActive ? (
            <>
              <h2>Be My Eye Mode Active</h2>
              <p>{cameraState.isActive && frameCaptureState.isCapturing 
                ? `📹 Capturing frames (${frameCaptureState.captureCount} captured)` 
                : cameraState.isLoading ? '⏳ Starting camera...' 
                : '❌ Camera not active'}</p>
              {isRealtimeEnabled() && (
                <div className="realtime-status">
                  <p>
                    🎤 OpenAI Realtime: {realtimeAudio.isConnected ? '✅ Connected' : '⏳ Connecting...'}
                    {realtimeAudio.isRecording && ' | 🔴 Recording'}
                    {realtimeAudio.isPlaying && ' | 🔊 AI Speaking'}
                  </p>
                  {realtimeAudio.userTranscript && (
                    <p className="transcript-user">👤 You: {realtimeAudio.userTranscript}</p>
                  )}
                  {realtimeAudio.aiTranscript && (
                    <p className="transcript-ai">🤖 AI: {realtimeAudio.aiTranscript}</p>
                  )}
                  {realtimeAudio.error && (
                    <p className="realtime-error">⚠️ {realtimeAudio.error}</p>
                  )}
                </div>
              )}
            </>
          ) : ttsState.isSpeaking ? (
            <>
              <h2>Speaking...</h2>
              <p>{ttsState.currentText?.substring(0, 60)}{ttsState.currentText && ttsState.currentText.length > 60 ? '...' : ''}</p>
            </>
          ) : menuContext.currentMenu === 'main_menu' ? (
            <>
              <h2>Main Menu</h2>
              <p>How can I help you today?</p>
            </>
          ) : menuContext.currentMenu === 'help' ? (
            <>
              <h2>Help & Instructions</h2>
              <p>Here's what I can do for you</p>
            </>
          ) : menuContext.currentMenu === 'signup' ? (
            <>
              <h2>Sign Up</h2>
              <p>Create a new account</p>
            </>
          ) : menuContext.currentMenu === 'signin' ? (
            <>
              <h2>Sign In</h2>
              <p>Access your account</p>
            </>
          ) : menuContext.currentMenu === 'tutorial' ? (
            <>
              <h2>Tutorial</h2>
              <p>Learn how to use VisualAID</p>
            </>
          ) : menuContext.currentMenu === 'use_case' ? (
            <>
              <h2>Use Cases</h2>
              <p>See how VisualAID can help you</p>
            </>
          ) : menuContext.currentMenu === 'about' ? (
            <>
              <h2>About VisualAID</h2>
              <p>Your AI-powered visual assistant</p>
            </>
          ) : voiceState.isListening ? (
            <>
              <h2>Listening...</h2>
              <p>Say "be my eye" to activate vision mode</p>
            </>
          ) : (
            <>
              <h2>Ready to Start</h2>
              <p>Click the microphone to begin</p>
            </>
          )}
        </div>
      </div>

      {/* Camera Preview */}
      {cameraState.isActive && (
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />
          <div className="camera-overlay">
            <div className="camera-status">
              <span className="camera-indicator">🔴 LIVE</span>
              <span className="camera-info">Camera Active</span>
            </div>
          </div>
        </div>
      )}

      {cameraState.isLoading && (
        <div className="camera-loading">
          <div className="loading-spinner"></div>
          <p>Starting camera...</p>
        </div>
      )}

      {voiceState.transcript && (
        <div className="transcript-container">
          <h3>You said:</h3>
          <p className="transcript">{voiceState.transcript}</p>
        </div>
      )}

      {voiceState.lastCommand && (
        <div className="command-container">
          <h3>Last Command:</h3>
          <p className="command">{voiceState.lastCommand.command}</p>
          <p className="confidence">
            Confidence: {(voiceState.lastCommand.confidence * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {voiceState.error && (
        <div className="error-container">
          <p className="error-message">{voiceState.error}</p>
          <button onClick={clearError} className="btn-clear">
            Dismiss
          </button>
        </div>
      )}

      {cameraState.error && (
        <div className="error-container camera-error">
          <p className="error-message">📹 {cameraState.error}</p>
          <button onClick={clearCameraError} className="btn-clear">
            Dismiss
          </button>
        </div>
      )}

      {sessionState.error && (
        <div className="error-container session-error">
          <p className="error-message">🔗 {sessionState.error}</p>
          <button onClick={clearSessionError} className="btn-clear">
            Dismiss
          </button>
        </div>
      )}

      <div className="controls">
        <button
          onClick={() => {
            setHasUserInteracted(true);
            toggleListening();
          }}
          className={`btn-mic ${voiceState.isListening ? 'active' : ''}`}
          aria-label={voiceState.isListening ? 'Stop listening' : 'Start listening'}
        >
          {voiceState.isListening ? '🛑 Stop' : '🎤 Start'}
        </button>
        
        <button
          onClick={() => {
            if (cameraState.isActive) {
              stopCamera();
            } else {
              startCamera();
            }
          }}
          className={`btn-camera ${cameraState.isActive ? 'active' : ''}`}
          aria-label={cameraState.isActive ? 'Stop camera' : 'Start camera'}
        >
          {cameraState.isActive ? '📹 Stop Camera' : '📷 Start Camera'}
        </button>
        
        {!currentUser && (
          <button
            onClick={() => setShowAuthPage('signin')}
            className="btn-auth"
            aria-label="Sign in"
          >
            🔐 Sign In
          </button>
        )}
        
        {currentUser && (
          <div className="user-badge">
            👤 {currentUser.name}
          </div>
        )}
      </div>

      {menuContext.currentMenu !== 'idle' && (
        <div className="menu-options">
          <h3>Available Commands:</h3>
          <ul>
            {menuContext.currentMenu === 'main_menu' && (
              <>
                <li><strong>"be my eye"</strong> - Start vision assistance</li>
                <li><strong>"help"</strong> - Get detailed instructions</li>
                <li><strong>"sign up"</strong> - Create an account</li>
                <li><strong>"sign in"</strong> - Access your account</li>
                <li><strong>"tutorial"</strong> - Learn how to use the app</li>
                <li><strong>"use case"</strong> - See examples</li>
                <li><strong>"about"</strong> - Learn more about VisualAID</li>
                <li>Ask me any question</li>
              </>
            )}
            {menuContext.currentMenu === 'help' && (
              <>
                <li><strong>"be my eye"</strong> - Start vision assistance</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
                <li>Ask questions anytime</li>
              </>
            )}
            {menuContext.currentMenu === 'vision_mode' && (
              <>
                <li><strong>"stop be my eye"</strong> - Deactivate vision mode</li>
                <li>Ask questions while I guide you</li>
              </>
            )}
            {menuContext.currentMenu === 'signup' && (
              <>
                <li>Sign up form will appear here</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
              </>
            )}
            {menuContext.currentMenu === 'signin' && (
              <>
                <li>Sign in form will appear here</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
              </>
            )}
            {menuContext.currentMenu === 'tutorial' && (
              <>
                <li>Step 1: Click microphone or say "be my eye"</li>
                <li>Step 2: Camera activates for vision assistance</li>
                <li>Step 3: Ask questions while I guide you</li>
                <li>Step 4: Say "stop be my eye" to deactivate</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
              </>
            )}
            {menuContext.currentMenu === 'use_case' && (
              <>
                <li>✓ Navigate unfamiliar spaces safely</li>
                <li>✓ Read text from documents, signs, or labels</li>
                <li>✓ Identify objects and obstacles</li>
                <li>✓ Get descriptions of your surroundings</li>
                <li>✓ Find specific items</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
              </>
            )}
            {menuContext.currentMenu === 'about' && (
              <>
                <li>VisualAID uses AI and computer vision</li>
                <li>Provides real-time assistance and guidance</li>
                <li>Designed for accessibility and ease of use</li>
                <li><strong>"menu"</strong> or <strong>"go back"</strong> - Return to main menu</li>
              </>
            )}
            {menuContext.currentMenu === 'greeting' && (
              <>
                <li>Greeting in progress...</li>
              </>
            )}
          </ul>
        </div>
      )}

      <div className="instructions">
        <h3>Quick Reference:</h3>
        <ul>
          <li><strong>"be my eye"</strong> - Activate vision assistance mode</li>
          <li><strong>"stop be my eye"</strong> - Deactivate vision mode</li>
          <li><strong>"help"</strong> - Get help and instructions</li>
          <li><strong>"sign up"</strong> - Create an account</li>
          <li><strong>"sign in"</strong> - Access your account</li>
          <li><strong>"tutorial"</strong> - Learn how to use the app</li>
          <li><strong>"use case"</strong> - See examples</li>
          <li><strong>"about"</strong> - Learn more about VisualAID</li>
          <li><strong>"menu"</strong> - Return to main menu</li>
        </ul>
      </div>

      <div className="info-footer">
        <p>
          Status: {voiceState.isListening ? '🟢 Listening' : '🔴 Stopped'} | 
          Mode: {voiceState.isActive ? '👁️ Vision Active' : '⏸️ Standby'} |
          Camera: {cameraState.isActive ? '📹 Active' : cameraState.isLoading ? '⏳ Loading' : '📷 Inactive'} |
          Session: {sessionState.isActive ? `🟢 Active (${sessionState.sessionId?.substring(0, 8)}...)` : '🔴 Inactive'} |
          Frames: {frameCaptureState.isCapturing ? `📸 ${frameCaptureState.captureCount}` : '⏸️ Stopped'} |
          Duration: {sessionState.isActive ? `⏱️ ${getSessionDuration()}s` : '-'} |
          WebSocket: {isWebSocketConnected ? '🟢 Connected' : '🔴 Disconnected'} |
          Menu: {menuContext.currentMenu === 'main_menu' ? '🏠 Main' : 
                 menuContext.currentMenu === 'help' ? '❓ Help' : 
                 menuContext.currentMenu === 'vision_mode' ? '👁️ Vision' : 
                 menuContext.currentMenu === 'greeting' ? '👋 Greeting' : '💤 Idle'} |
          Speech: {ttsState.isSpeaking ? '🔊 Speaking' : '🔇 Silent'}
        </p>
      </div>
    </div>
  );
};

