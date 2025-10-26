/**
 * 🗣️ Voice Navigation Component
 * 
 * A reusable component that provides voice navigation functionality
 * across all pages of the website.
 */

import React, { useEffect, useState } from 'react';
import { useVoiceCommandHandler } from '../hooks/useVoiceCommandHandler';
import { useAudioQueue } from '../hooks/useAudioQueue';

interface VoiceNavigationProps {
  children: React.ReactNode;
  autoReadOnMount?: boolean;
  showVoiceIndicator?: boolean;
}

export const VoiceNavigation: React.FC<VoiceNavigationProps> = ({
  children,
  autoReadOnMount = false,
  showVoiceIndicator = false
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [showTooltips, setShowTooltips] = useState(false);
  const [idleTimer, setIdleTimer] = useState<number | null>(null);

  // 🔊 Audio Queue for TTS
  const audioQueue = useAudioQueue();
  
  // Speak function using queue
  const speak = React.useCallback((text: string, interrupt: boolean = false) => {
    audioQueue.speak(text, interrupt ? 'urgent' : 'normal');
  }, [audioQueue]);

  // 🤖 Mock conversation state for voice commands
  const mockConversation = {
    state: {
      isActive: true,
      sessionId: `voice-nav-${Date.now()}`,
      isListening: false,
      isSpeaking: false,
      currentMessage: null,
      transcript: '',
      conversationHistory: [],
      error: null,
      visionModeActive: false
    }
  };

  // 🎤 Voice Command Handler for Navigation
  const voiceCommandHandler = useVoiceCommandHandler({
    conversation: mockConversation as any,
    speak: speak,
    onNavigation: (path: string) => {
      console.log('🗣️ Voice navigation triggered:', path);
      setIsVoiceActive(true);
      setTimeout(() => setIsVoiceActive(false), 2000);
    },
    onPageRead: (content: any) => {
      console.log('🗣️ Page content read via voice:', content.title);
      setIsVoiceActive(true);
      setTimeout(() => setIsVoiceActive(false), 3000);
    }
  });

  // 🎤 Auto-read page content when component mounts
  useEffect(() => {
    if (autoReadOnMount) {
      const timer = setTimeout(() => {
        const currentPageContent = voiceCommandHandler.getCurrentPageContent();
        if (currentPageContent) {
          speak(`Welcome to the ${currentPageContent.title}. ${currentPageContent.description}`);
        }
      }, 1000); // Wait 1 second before auto-reading

      return () => clearTimeout(timer);
    }
  }, [autoReadOnMount, voiceCommandHandler, speak]);

  // 🎤 Process voice commands when transcript changes
  useEffect(() => {
    if (mockConversation.state.transcript && mockConversation.state.transcript !== currentTranscript) {
      const transcript = mockConversation.state.transcript.trim();
      setCurrentTranscript(transcript);
      
      if (transcript.length > 2) {
        console.log('🎤 Processing voice command:', transcript);
        
        voiceCommandHandler.processCommand(transcript, {
          isVisionMode: false,
          isListening: false,
          sessionId: mockConversation.state.sessionId
        }).then(processed => {
          if (processed) {
            console.log('🎤 Voice command processed successfully');
            setIsVoiceActive(true);
            setTimeout(() => setIsVoiceActive(false), 2000);
          }
        }).catch(error => {
          console.error('🎤 Error processing voice command:', error);
        });
      }
    }
  }, [mockConversation.state.transcript, currentTranscript, voiceCommandHandler]);

  // 🎤 Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + V for voice navigation help
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        voiceCommandHandler.showHelp();
        setIsVoiceActive(true);
        setTimeout(() => setIsVoiceActive(false), 3000);
      }
      
      // Ctrl/Cmd + R for read current page
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        const currentPageContent = voiceCommandHandler.getCurrentPageContent();
        if (currentPageContent) {
          voiceCommandHandler.readPageContent(currentPageContent);
          setIsVoiceActive(true);
          setTimeout(() => setIsVoiceActive(false), 3000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [voiceCommandHandler]);

  // 🕐 Idle detection for tooltip display
  useEffect(() => {
    const resetIdleTimer = () => {
      // Clear existing timer
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      
      // Hide tooltips immediately on any activity
      setShowTooltips(false);
      
      // Set new timer for 10 seconds of inactivity
      const timer = setTimeout(() => {
        setShowTooltips(true);
      }, 10000); // 10 seconds of inactivity
      
      setIdleTimer(timer);
    };

    // Activity events to reset timer
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    // Initialize timer
    resetIdleTimer();

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    // Cleanup
    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [idleTimer]);

  return (
    <div className="voice-navigation-wrapper">
      {children}
      
      {/* Voice Indicator */}
      {showVoiceIndicator && isVoiceActive && (
        <div className="voice-indicator">
          <div className="voice-pulse"></div>
          <svg className="voice-indicator-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>Voice Navigation Active</span>
        </div>
      )}
      
      {/* Voice Help Button */}
      <button
        className="voice-help-button"
        onClick={() => {
          voiceCommandHandler.showHelp();
          setIsVoiceActive(true);
          setTimeout(() => setIsVoiceActive(false), 3000);
        }}
        title="Voice Navigation Help (Ctrl+V)"
      >
        <svg 
          className="voice-help-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        {showTooltips && (
          <div className="button-tooltip voice-help-tooltip">
            <div className="tooltip-content">
              <h4>Voice Help</h4>
              <p>Get voice navigation commands</p>
              <small>Ctrl+V or click</small>
            </div>
            <div className="tooltip-arrow"></div>
          </div>
        )}
      </button>
      
      {/* Read Page Button */}
      <button
        className="read-page-button"
        onClick={() => {
          const currentPageContent = voiceCommandHandler.getCurrentPageContent();
          if (currentPageContent) {
            voiceCommandHandler.readPageContent(currentPageContent);
            setIsVoiceActive(true);
            setTimeout(() => setIsVoiceActive(false), 3000);
          }
        }}
        title="Read Current Page (Ctrl+R)"
      >
        <svg 
          className="read-page-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8"/>
          <path d="M8 11h8"/>
          <path d="M8 15h5"/>
        </svg>
        {showTooltips && (
          <div className="button-tooltip read-page-tooltip">
            <div className="tooltip-content">
              <h4>Read Page</h4>
              <p>Hear current page content</p>
              <small>Ctrl+R or click</small>
            </div>
            <div className="tooltip-arrow"></div>
          </div>
        )}
      </button>
      
      <style>{`
        .voice-navigation-wrapper {
          position: relative;
        }
        
        .voice-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(76, 175, 80, 0.9);
          color: white;
          padding: 10px 15px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1000;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease-out;
        }
        
        .voice-pulse {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        .voice-indicator-icon {
          width: 16px;
          height: 16px;
          color: white;
          stroke-width: 2;
        }
        
        .voice-help-button,
        .read-page-button {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 9999;
          background: linear-gradient(180deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%);
          border: none;
          border-top-left-radius: 0.25rem;
          border-bottom-left-radius: 0.25rem;
          padding: 1.5rem 0.4rem;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
          transition: all 0.3s ease;
        }
        
        .voice-help-button {
          margin-top: -3rem;
        }
        
        .read-page-button {
          margin-top: 3rem;
        }
        
        .voice-help-button:hover,
        .read-page-button:hover {
          background: linear-gradient(180deg, #06b6d4 0%, #0891b2 40%, #0e7490 80%);
          box-shadow: 0 12px 32px rgba(6, 182, 212, 0.5);
          transform: translateY(-50%) translateX(-2px);
        }
        
        .voice-help-button:active,
        .read-page-button:active {
          box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4);
        }
        
        .voice-help-icon,
        .read-page-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #ffffff;
          stroke-width: 2.5;
        }
        
        /* Tooltip Styles */
        .button-tooltip {
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 1rem;
          z-index: 4000;
          animation: tooltipFadeIn 0.3s ease-out;
        }
        
        .tooltip-content {
          background: rgba(17, 24, 39, 0.95);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(6, 182, 212, 0.3);
          min-width: 12rem;
          text-align: left;
        }
        
        .tooltip-content h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #06b6d4;
        }
        
        .tooltip-content p {
          margin: 0 0 0.25rem 0;
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.3;
        }
        
        .tooltip-content small {
          font-size: 0.625rem;
          color: #94a3b8;
          font-style: italic;
        }
        
        .tooltip-arrow {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 6px solid rgba(17, 24, 39, 0.95);
        }
        
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .voice-help-button,
          .read-page-button {
            display: none;
          }
          
          .button-tooltip {
            display: none;
          }
          
          .voice-indicator {
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};
