import React, { useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { HeroAgent } from '../components/HeroAgent';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useAudioQueue } from '../hooks/useAudioQueue';
import { useConversation } from '../hooks/useConversation';
import { useCameraAccess } from '../hooks/useCameraAccess';
import { useMenuNavigation } from '../hooks/useMenuNavigation';
import { useFrameCapture } from '../hooks/useFrameCapture';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { websocketService } from '../services/websocket';
import { parseMenuCommand, getMenuPrompt } from '../utils/menuPrompts';
import { getGreeting } from '../utils/greetings';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const [heroMessage, setHeroMessage] = useState("Welcome to VisualAID. Click anywhere to start your journey.");
  const [hasStarted, setHasStarted] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const lastCommandRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { voiceState, toggleListening } = useVoiceRecognition();
  
  // 🔊 Centralized Audio Queue - Prevents overlapping speech!
  const audioQueue = useAudioQueue();
  
  // Track if vision is being activated to prevent duplicates
  const visionActivatingRef = useRef(false);
  
  // 🤖 Conversational AI
  const conversation = useConversation({
    socket: socket,
    onVisionActivated: () => {
      console.log('👁️ Vision activated via conversation');
      
      // Prevent duplicate activation
      if (visionActivatingRef.current) {
        console.log('⚠️ Vision already activating, skipping duplicate');
        return;
      }
      
      if (!cameraState.isActive) {
        visionActivatingRef.current = true;
        console.log('📷 Starting camera for vision mode...');
        startCamera().then(success => {
          if (success && videoRef.current) {
            console.log('📷 Camera started, attaching to video element...');
            
            // Wait for video to be ready before starting capture
            const videoElement = videoRef.current;
            
            // Attach camera stream to video
            attachToVideo(videoElement);
            
            // Wait for video to have data before starting session
            const waitForVideo = new Promise<void>((resolve) => {
              if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
                console.log('✅ Video already ready');
                resolve();
              } else {
                console.log('⏳ Waiting for video to be ready...');
                const onLoadedData = () => {
                  console.log('✅ Video ready with data');
                  videoElement.removeEventListener('loadeddata', onLoadedData);
                  resolve();
                };
                videoElement.addEventListener('loadeddata', onLoadedData);
              }
            });
            
            waitForVideo.then(() => {
              console.log('📷 Video element ready, now starting session and frame capture...');
              
              // Start session if not already active
              if (!sessionState.isActive && isWebSocketConnected) {
                startSession(undefined, {
                  userAgent: navigator.userAgent,
                  startedFrom: 'conversation_vision',
                  browserInfo: {
                    language: navigator.language,
                    platform: navigator.platform,
                  }
                }).then(sessionSuccess => {
                  if (sessionSuccess && videoRef.current) {
                    console.log('✅ Session started, beginning frame capture...');
                    startCapture(videoRef.current);
                    setHeroMessage('Vision mode active. I can see what you see now.');
                  } else {
                    console.error('❌ Failed to start session');
                    setHeroMessage('Failed to start vision session.');
                  }
                  visionActivatingRef.current = false;
                });
              } else if (sessionState.isActive && videoRef.current && !frameCaptureState.isCapturing) {
                // Session already active, just start capture
                console.log('✅ Session already active, starting frame capture...');
                startCapture(videoRef.current);
                setHeroMessage('Vision mode active. I can see what you see now.');
                visionActivatingRef.current = false;
              }
            });
          } else {
            console.error('❌ Failed to start camera');
            setHeroMessage('Failed to start camera.');
            visionActivatingRef.current = false;
          }
        });
      } else {
        // Camera already active, make sure frame capture is running
        console.log('📷 Camera already active, ensuring frame capture is running...');
        if (!frameCaptureState.isCapturing && videoRef.current) {
          if (!sessionState.isActive && isWebSocketConnected) {
            startSession(undefined, {
              userAgent: navigator.userAgent,
              startedFrom: 'conversation_vision',
              browserInfo: {
                language: navigator.language,
                platform: navigator.platform,
              }
            }).then(sessionSuccess => {
              if (sessionSuccess && videoRef.current) {
                startCapture(videoRef.current);
                setHeroMessage('Vision mode active. I can see what you see now.');
              }
              visionActivatingRef.current = false;
            });
          } else if (sessionState.isActive && videoRef.current) {
            startCapture(videoRef.current);
            setHeroMessage('Vision mode active. I can see what you see now.');
            visionActivatingRef.current = false;
          }
        } else {
          visionActivatingRef.current = false;
        }
      }
    },
    onVisionDeactivated: () => {
      console.log('👁️ Vision deactivated via conversation');
      
      // Stop frame capture
      if (frameCaptureState.isCapturing) {
        console.log('📷 Stopping frame capture...');
        stopFrameCapture();
      }
      
      // End session
      if (sessionState.isActive) {
        console.log('📷 Ending session...');
        endSession();
      }
      
      // Stop camera
      if (cameraState.isActive) {
        console.log('📷 Stopping camera...');
        stopCamera();
      }
      
      setHeroMessage('Vision mode deactivated.');
    }
  });
  
  // Create ttsState for compatibility
  const ttsState = {
    isSpeaking: audioQueue.state.isPlaying,
    isPaused: false,
    error: audioQueue.state.error,
    currentText: audioQueue.state.currentItem?.text || null
  };
  
  // Speak function using queue - wrapped in useCallback to prevent re-renders
  const speak = React.useCallback((text: string, interrupt: boolean = false) => {
    audioQueue.speak(text, interrupt ? 'urgent' : 'normal');
  }, []); // audioQueue methods are stable, don't need in deps

  const { menuContext, navigateToMenu } = useMenuNavigation();

  const { cameraState, startCamera, stopCamera, attachToVideo } = useCameraAccess({
    config: {
      width: 1280,
      height: 720,
      facingMode: 'environment',
      frameRate: 30,
    },
    onError: (error) => {
      console.error('Camera error:', error);
      // Don't use separate TTS when in conversation mode - Nova handles all speech
      if (!conversation.state.isActive) {
        speak(`Camera error: ${error.userMessage}`, true);
      }
      setHeroMessage(`Camera error: ${error.userMessage}`);
    },
    onPermissionGranted: () => {
      // Don't use separate TTS when in conversation mode - Nova handles all speech
      if (!conversation.state.isActive) {
        speak('Camera access granted. Vision mode is now active.', false);
      }
      setHeroMessage('Camera access granted. Vision mode active.');
    },
    onPermissionDenied: () => {
      // Don't use separate TTS when in conversation mode - Nova handles all speech
      if (!conversation.state.isActive) {
        speak('Camera permission denied. Please allow camera access in your browser settings.', true);
      }
      setHeroMessage('Camera permission denied. Please check your settings.');
    },
  });

  // Session management hook
  const {
    sessionState,
    startSession,
    endSession,
  } = useSessionManagement({ isConnected: isWebSocketConnected });

  // Frame capture hook
  const {
    state: frameCaptureState,
    startCapture,
    stopCapture: stopFrameCapture,
  } = useFrameCapture({
    intervalMs: 15000, // 15 seconds
    quality: 0.7,
    maxWidth: 640,
    maxHeight: 480,
    format: 'jpeg',
    onFrameCaptured: async (frameData, metadata) => {
      if (isWebSocketConnected) {
        try {
          await websocketService.sendFrame(frameData, metadata);
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

  // 🔊 Listen for frame analysis from backend
  // DISABLED: Frame audio now handled by conversation system when in conversation mode
  // This prevents two voices (Nova + Frame TTS) from speaking at the same time
  useEffect(() => {
    if (!sessionState.isActive || !sessionState.sessionId) {
      return;
    }

    // Only enable direct frame audio if NOT in conversation mode
    // When in conversation mode, Nova handles describing what she sees
    if (!conversation.state.isActive) {
      const handleFrameAudio = (data: any) => {
        console.log(`📥 [HomePage] Received frame:audio event:`, { 
          sessionId: data.sessionId?.substring(0, 8), 
          frameNumber: data.frameNumber,
          currentSessionId: sessionState.sessionId?.substring(0, 8),
          audioLength: data.audio?.length 
        });
        
        if (data.sessionId === sessionState.sessionId && data.audio) {
          console.log(`🎵 [HomePage] Adding frame audio to queue via audioQueue`);
          // Add to centralized queue - prevents overlapping!
          audioQueue.playBase64(
            data.audio, 
            `frame-${data.frameNumber}`, 
            'normal' // Normal priority for frame descriptions
          );
        }
      };

      // Listen for TTS audio
      console.log(`🎧 [HomePage] Setting up frame:audio listener for session ${sessionState.sessionId.substring(0, 8)}`);
      websocketService.on('frame:audio', handleFrameAudio);

      return () => {
        console.log(`🔇 [HomePage] Removing frame:audio listener`);
        websocketService.off('frame:audio', handleFrameAudio);
      };
    } else {
      console.log(`ℹ️ [HomePage] Conversation mode active - frame audio handled by Nova`);
    }
  }, [sessionState.isActive, sessionState.sessionId, conversation.state.isActive, audioQueue]);

  // Attach camera stream to video element
  useEffect(() => {
    if (cameraState.isActive && videoRef.current) {
      attachToVideo(videoRef.current);
    }
  }, [cameraState.isActive, attachToVideo]);

  // Start/stop frame capture and session when camera becomes active/inactive
  // DISABLED: Now handled by conversation.onVisionActivated callback
  // This old logic was for the voice command mode, conversation mode handles it differently
  useEffect(() => {
    // Only handle cleanup when camera is stopped
    if (!cameraState.isActive && frameCaptureState.isCapturing) {
      console.log('⚠️ Camera stopped unexpectedly, cleaning up frame capture and session...');
      stopFrameCapture();
      
      if (isWebSocketConnected && sessionState.isActive) {
        endSession().then(result => {
          if (result.success) {
            console.log(`Session ended with ${result.frameCount} frames`);
          }
        });
      }
    }
  }, [cameraState.isActive, frameCaptureState.isCapturing, isWebSocketConnected, sessionState.isActive, endSession, stopFrameCapture]);

  const handleActivateListening = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setHeroMessage("Starting conversation with Nova...");
      
      // Start conversation with Gemini AI
      console.log('🤖 Starting conversation with Nova...');
      conversation.startConversation();
      
      // NOTE: Auto-start listening is now handled by useConversation after audio finishes
      // No need for manual timeout here - it will start automatically when greeting ends
    } else if (!conversation.state.isListening) {
      console.log('🎤 Manually starting listening...');
      conversation.startListening();
    }
  };

  const handleBeMyEye = () => {
    console.log('👁️ Be My Eye button clicked - activating vision directly');
    
    // Start conversation if not already started
    if (!hasStarted) {
      setHasStarted(true);
      console.log('🤖 Starting conversation with Nova...');
      conversation.startConversation();
      
      // Manually set visionModeActive to true for button click
      // This enables the frame:audio listener even before the backend responds
      console.log('👁️ Manually activating vision mode for button click');
      conversation.setVisionModeActive(true);
      
      // Wait a bit for the conversation to initialize, then activate vision
      setTimeout(() => {
        console.log('📷 Activating vision mode after conversation started...');
        triggerVisionActivation();
      }, 1000);
    } else {
      // Conversation already started, activate vision immediately
      conversation.setVisionModeActive(true);
      triggerVisionActivation();
    }
  };

  const triggerVisionActivation = () => {
    // Use the same logic as onVisionActivated callback
    if (visionActivatingRef.current) {
      console.log('⚠️ Vision already activating, skipping duplicate');
      return;
    }
    
    visionActivatingRef.current = true;
    console.log('📷 Starting camera for vision mode...');
    
    if (!cameraState.isActive) {
      startCamera().then(success => {
        if (success && videoRef.current) {
          console.log('📷 Camera started, attaching to video element...');
          
          const videoElement = videoRef.current;
          attachToVideo(videoElement);
          
          const waitForVideo = new Promise<void>((resolve) => {
            if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
              console.log('✅ Video already ready');
              resolve();
            } else {
              const onLoadedData = () => {
                videoElement.removeEventListener('loadeddata', onLoadedData);
                resolve();
              };
              videoElement.addEventListener('loadeddata', onLoadedData);
            }
          });
          
          waitForVideo.then(() => {
            console.log('📷 Video element ready, now starting session and frame capture...');
            
            if (!sessionState.isActive && isWebSocketConnected) {
              startSession(undefined, {
                userAgent: navigator.userAgent,
                startedFrom: 'button_click',
                browserInfo: {
                  language: navigator.language,
                  platform: navigator.platform,
                }
                              }).then(sessionSuccess => {
                  if (sessionSuccess && videoRef.current) {
                    console.log('✅ Session started, beginning frame capture...');
                    startCapture(videoRef.current);
                    setHeroMessage('Vision mode active. I can see what you see now.');
                    
                    // Start describing what the camera sees
                    console.log('🔊 Beginning vision analysis...');
                    
                    // Emit vision_activated event to enable frame analysis
                    console.log('👁️ Emitting vision_activated event to enable frame analysis');
                    if (socket && conversation.state.sessionId) {
                      socket.emit('conversation:vision_activated', {
                        sessionId: conversation.state.sessionId,
                        timestamp: Date.now()
                      });
                    }
                  } else {
                    console.error('❌ Failed to start session');
                    setHeroMessage('Failed to start vision session.');
                  }
                  visionActivatingRef.current = false;
                });
            } else if (sessionState.isActive && videoRef.current && !frameCaptureState.isCapturing) {
              console.log('✅ Session already active, starting frame capture...');
              startCapture(videoRef.current);
              setHeroMessage('Vision mode active. I can see what you see now.');
              visionActivatingRef.current = false;
            }
          });
        } else {
          console.error('❌ Failed to start camera');
          setHeroMessage('Failed to start camera.');
          visionActivatingRef.current = false;
        }
      });
    } else {
      // Camera already active, make sure frame capture is running
      console.log('📷 Camera already active, ensuring frame capture is running...');
      if (!frameCaptureState.isCapturing && videoRef.current) {
        if (!sessionState.isActive && isWebSocketConnected) {
          startSession(undefined, {
            userAgent: navigator.userAgent,
            startedFrom: 'button_click',
            browserInfo: {
              language: navigator.language,
              platform: navigator.platform,
            }
          }).then(sessionSuccess => {
            if (sessionSuccess && videoRef.current) {
              startCapture(videoRef.current);
              setHeroMessage('Vision mode active. I can see what you see now.');
            }
            visionActivatingRef.current = false;
          });
        } else if (sessionState.isActive && videoRef.current) {
          startCapture(videoRef.current);
          setHeroMessage('Vision mode active. I can see what you see now.');
          visionActivatingRef.current = false;
        }
      } else {
        visionActivatingRef.current = false;
      }
    }
  };

  // Handle voice commands (OLD SYSTEM - disabled when conversation is active)
  useEffect(() => {
    // Skip if conversation mode is active (Nova handles everything)
    if (conversation.state.isActive) {
      console.log('ℹ️ Skipping old voice command handler - conversation mode active');
      return;
    }
    
    if (!hasStarted || !voiceState.lastCommand) return;
    
    const currentCommand = voiceState.lastCommand.command;
    
    if (currentCommand === lastCommandRef.current) return;
    lastCommandRef.current = currentCommand;
    
    console.log('Processing OLD voice command:', currentCommand);
    
    const menuAction = parseMenuCommand(currentCommand, menuContext.currentMenu);
    
    if (menuAction.action === 'activate_vision') {
      const activatedGreeting = getGreeting('activated');
      setHeroMessage(activatedGreeting.text);
      console.log('🔊 Speaking activation message:', activatedGreeting.text);
      speak(activatedGreeting.text, true);
      navigateToMenu('vision_mode');
      
      if (!cameraState.isActive && !cameraState.isLoading) {
        console.log('Starting camera for vision mode...');
        startCamera().then(success => {
          if (success) {
            console.log('Camera started successfully');
            setHeroMessage('Vision mode active. Camera is watching.');
          } else {
            console.error('Failed to start camera');
            setHeroMessage('Failed to start camera. Check permissions.');
          }
        }).catch(error => {
          console.error('Camera start error:', error);
          setHeroMessage('Error starting camera.');
        });
      }
    } else if (menuAction.action === 'deactivate_vision') {
      const deactivatedGreeting = getGreeting('deactivated');
      setHeroMessage(deactivatedGreeting.text);
      console.log('🔊 Speaking deactivation message:', deactivatedGreeting.text);
      speak(deactivatedGreeting.text, true);
      navigateToMenu('main_menu');
      
      if (cameraState.isActive) {
        console.log('Stopping camera...');
        stopCamera();
      }
      
      setTimeout(() => {
        const mainMenuPrompt = getMenuPrompt('main_menu');
        setHeroMessage(mainMenuPrompt.text);
        speak(mainMenuPrompt.text, false);
      }, 2000);
    } else if (menuAction.action === 'help') {
      navigateToMenu('help');
      const helpPrompt = getMenuPrompt('help');
      setHeroMessage(helpPrompt.text);
      speak(helpPrompt.text, false);
    } else {
      setHeroMessage(`You said: "${currentCommand}". Try saying 'help' to see what I can do.`);
    }
  }, [voiceState.lastCommand, hasStarted, menuContext.currentMenu, cameraState.isActive, cameraState.isLoading, speak, navigateToMenu, startCamera, stopCamera]);

  // Update message based on conversation state
  useEffect(() => {
    if (conversation.state.currentMessage) {
      setHeroMessage(conversation.state.currentMessage);
    } else if (conversation.state.transcript) {
      setHeroMessage(`You: "${conversation.state.transcript}"`);
    } else if (voiceState.transcript) {
      setHeroMessage(`Hearing: "${voiceState.transcript}"`);
    }
  }, [conversation.state.currentMessage, conversation.state.transcript, voiceState.transcript]);

  return (
    <div className="home-page">
      {/* Hero Section with Interactive Agent */}
      <section className="home-hero">
        <HeroAgent 
          message={heroMessage}
          isSpeaking={conversation.state.isSpeaking || ttsState.isSpeaking}
          isListening={conversation.state.isListening || voiceState.isListening}
          onActivateListening={handleActivateListening}
          onBeMyEye={handleBeMyEye}
          transcript={conversation.state.transcript || voiceState.transcript}
          cameraActive={cameraState.isActive}
        />
        
        {/* Video preview for camera - visible when active */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ 
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: cameraState.isActive ? '200px' : '0px',
            height: cameraState.isActive ? '150px' : '0px',
            opacity: cameraState.isActive ? 1 : 0,
            border: '3px solid #4CAF50',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            transition: 'all 0.3s ease',
            objectFit: 'cover'
          }}
        />
      </section>

      {/* Main Content */}
      <div id="main-content" className="home-content">
        <Header />

        {/* Mission Statement - Large Typography */}
        <section className="mission-section">
          <div className="mission-content">
            <div className="mission-text">
              <span className="mission-label">Our Mission</span>
              <h1 className="mission-title">
                Empowering Independence Through
                <span className="highlight-text"> Vision AI</span>
              </h1>
              <p className="mission-description">
                VisualAID transforms the way visually impaired individuals experience the world. 
                Using cutting-edge artificial intelligence and computer vision, we provide real-time 
                assistance that brings confidence, freedom, and autonomy to everyday life.
              </p>
            </div>
          </div>
          <div className="section-divider"></div>
        </section>

        {/* Feature 1 - AI Vision (Left Aligned) */}
        <section className="feature-section left-aligned">
          <div className="feature-container">
            <div className="feature-content">
              <span className="feature-number">01</span>
              <h2 className="feature-heading">AI-Powered Vision</h2>
              <p className="feature-text">
                Advanced computer vision technology that understands your environment in real-time. 
                Our AI analyzes scenes, identifies objects, and provides detailed descriptions through 
                natural, conversational audio feedback.
              </p>
              <div className="feature-highlight">
                Instant scene understanding • Object detection • Real-time analysis
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2 - Voice Control (Right Aligned) */}
        <section className="feature-section right-aligned">
          <div className="feature-container">
            <div className="feature-content">
              <span className="feature-number">02</span>
              <h2 className="feature-heading">Natural Voice Commands</h2>
              <p className="feature-text">
                Simply speak to interact with VisualAID. Our advanced voice recognition understands 
                natural language, making every interaction intuitive and effortless. No complicated 
                commands to memorize.
              </p>
              <div className="feature-highlight">
                Hands-free operation • Natural language • Always listening
              </div>
            </div>
          </div>
        </section>

        {/* Feature 3 - Navigation (Left Aligned) */}
        <section className="feature-section left-aligned">
          <div className="feature-container">
            <div className="feature-content">
              <span className="feature-number">03</span>
              <h2 className="feature-heading">Smart Navigation</h2>
              <p className="feature-text">
                Navigate unfamiliar spaces with confidence. VisualAID provides real-time guidance, 
                obstacle detection, and spatial awareness to help you move safely through any environment.
              </p>
              <div className="feature-highlight">
                Obstacle detection • Turn-by-turn guidance • Safety alerts
              </div>
            </div>
          </div>
        </section>

        {/* Feature 4 - Text Recognition (Right Aligned) */}
        <section className="feature-section right-aligned">
          <div className="feature-container">
            <div className="feature-content">
              <span className="feature-number">04</span>
              <h2 className="feature-heading">Instant Text Reading</h2>
              <p className="feature-text">
                Read any text instantly - from product labels to restaurant menus, street signs to 
                important documents. VisualAID makes written information accessible at your command.
              </p>
              <div className="feature-highlight">
                OCR technology • Multi-language support • Document scanning
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="stats-section">
          <div className="stats-container">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Always Available</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">Best AI</div>
              <div className="stat-label">Industry Leading Technology</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">Real-Time</div>
              <div className="stat-label">Instant Response</div>
            </div>
          </div>
        </section>

        {/* Use Cases - Flowing Layout */}
        <section className="usecases-section">
          <div className="usecases-header">
            <span className="section-label">Real Impact</span>
            <h2 className="usecases-title">How VisualAID Changes Lives</h2>
          </div>
          <div className="usecases-flow">
            <div className="usecase-item usecase-large">
              <h3>Navigate Safely</h3>
              <p>Explore unfamiliar spaces with confidence using real-time guidance and obstacle detection.</p>
            </div>
            <div className="usecase-item usecase-small">
              <h3>Read Instantly</h3>
              <p>Access any written information at your command.</p>
            </div>
            <div className="usecase-item usecase-medium">
              <h3>Stay Organized</h3>
              <p>Keep track of belongings and important information with AI-powered memory.</p>
            </div>
            <div className="usecase-item usecase-small">
              <h3>Shop Independently</h3>
              <p>Identify products and navigate stores with ease.</p>
            </div>
          </div>
          <div className="usecases-cta">
            <a href="/use-case" className="link-arrow">
              Explore All Use Cases <span className="arrow">→</span>
            </a>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta">
          <div className="final-cta-content">
            <h2 className="final-cta-title">Ready to Experience Freedom?</h2>
            <p className="final-cta-text">
              Join thousands discovering independence through VisualAID
            </p>
            <div className="final-cta-buttons">
              <a href="/signup" className="btn-primary">Get Started Free</a>
              <a href="/about" className="btn-secondary">Learn More About Us</a>
            </div>
          </div>
        </section>

        <Footer variant="detailed" />
      </div>
    </div>
  );
};

