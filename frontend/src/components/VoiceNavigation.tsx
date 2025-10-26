/**
 * 🗣️ Voice Navigation Component
 * 
 * A reusable component that provides voice navigation functionality
 * across all pages of the website.
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useVoiceCommandHandler } from '../hooks/useVoiceCommandHandler';
import { useConversation } from '../hooks/useConversation';
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
  const location = useLocation();
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

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

  return (
    <div className="voice-navigation-wrapper">
      {children}
      
      {/* Voice Indicator */}
      {showVoiceIndicator && isVoiceActive && (
        <div className="voice-indicator">
          <div className="voice-pulse"></div>
          <span>🗣️ Voice Navigation Active</span>
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
        🗣️ Voice Help
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
        📖 Read Page
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
        
        .voice-help-button,
        .read-page-button {
          position: fixed;
          bottom: 20px;
          background: rgba(33, 150, 243, 0.9);
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }
        
        .voice-help-button {
          right: 20px;
        }
        
        .read-page-button {
          right: 140px;
        }
        
        .voice-help-button:hover,
        .read-page-button:hover {
          background: rgba(33, 150, 243, 1);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
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
            bottom: 10px;
            padding: 10px 12px;
            font-size: 12px;
          }
          
          .voice-help-button {
            right: 10px;
          }
          
          .read-page-button {
            right: 100px;
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
