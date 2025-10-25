import React from 'react';
import './HeroAgent.css';

interface HeroAgentProps {
  message: string;
  isSpeaking?: boolean;
  isListening?: boolean;
  onActivateListening?: () => void;
  transcript?: string;
  cameraActive?: boolean;
}

export const HeroAgent: React.FC<HeroAgentProps> = ({ 
  message, 
  isSpeaking = false,
  isListening = false,
  onActivateListening,
  transcript = '',
  cameraActive = false
}) => {
  const scrollToContent = () => {
    const contentSection = document.getElementById('main-content');
    contentSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger listening if clicking on header
    const target = e.target as HTMLElement;
    if (target.closest('.hero-header')) {
      return;
    }
    
    // Activate listening
    if (onActivateListening && !isListening) {
      onActivateListening();
    }
  };

  return (
    <section className="hero-agent-section" onClick={handleClick}>
      {/* Static High-Contrast Background */}
      <div 
        className="hero-background" 
        style={{ background: 'radial-gradient(circle, #1a202c 0%, #000000 100%)' }}
      />
      
      {/* Grid pattern overlay */}
      <div className="hero-grid-pattern"></div>

      {/* Hero Header/Navbar */}
      <header className="hero-header">
        <div className="hero-header-container">
          <div className="hero-logo-section">
            <img src="/icon2.png" alt="AAI Logo" className="hero-logo-icon" />
            <h1 className="hero-logo-title">AAI - Aid AI</h1>
          </div>
          
          <nav className="hero-nav-menu">
            <a href="/about" className="hero-nav-link">About Us</a>
            <a href="/use-case" className="hero-nav-link">Use Case</a>
            <a href="/signin" className="hero-nav-link hero-nav-button">Sign In</a>
          </nav>
        </div>
      </header>

      <div className="hero-agent-content">
        {/* The Blinking Agent */}
        <div className="agent-visual">
          <div className="agent-container">
            <div className={`agent-glow ${isSpeaking ? 'agent-glow-active' : ''} ${isListening ? 'agent-glow-listening' : ''}`}></div>
            <div className="agent-circle">
              <div className="agent-inner">
                <div className="agent-eye"></div>
              </div>
            </div>
          </div>
          
          {/* Speech Bubble */}
          <div className="agent-speech-bubble">
            <p className="agent-message">{message}</p>
            {cameraActive && (
              <div className="camera-badge">
                📹 Camera Active
              </div>
            )}
            <div className="speech-bubble-arrow"></div>
          </div>
        </div>

        {/* Voice Status Indicator or Click Hint */}
        {isListening ? (
          <div className="voice-status-indicator">
            <div className="pulse-ring"></div>
            <span className="status-text">Listening...</span>
            {transcript && (
              <div className="live-transcript">
                "{transcript}"
              </div>
            )}
          </div>
        ) : (
          <div className="click-hint">
            <span className="hint-text">💬 Click anywhere to speak</span>
            <div className="available-commands">
              <p>Try saying: "be my eye" | "help" | "tutorial"</p>
            </div>
          </div>
        )}

        {/* Scroll Indicator */}
        <div className="scroll-indicator" onClick={scrollToContent}>
          <div className="scroll-icon">
            <span className="scroll-text">Scroll Down</span>
            <svg 
              className="scroll-arrow" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

