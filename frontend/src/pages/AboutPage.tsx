import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import './AboutPage.css';

export const AboutPage: React.FC = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const heroTexts = [
    "The world is beautiful, and we show it to everyone.",
    "Independence starts from AAI.",
    "Between you and your destination is AAI helping you reach there.",
    "Increase your memory with AAI.",
    "See the world through AI-powered eyes.",
    "Your vision assistant, always by your side."
  ];

  const startDate = new Date('2025-10-24T17:46:00');
  const currentDate = new Date();
  const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % heroTexts.length);
    }, 4000); // Change text every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send to a backend
      console.log('Newsletter subscription:', email);
      setIsSubmitted(true);
      setTimeout(() => {
        setEmail('');
        setIsSubmitted(false);
      }, 3000);
    }
  };

  return (
    <div className="about-page">
      {/* Header Navigation */}
      <Header />

      {/* Hero Section with Video Background */}
      <section className="about-hero">
        <video 
          className="about-hero-video" 
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source 
            src="https://www.unitedway.org/sites/default/files/video/Website%20Loop%2003%20%20Centered%20Crop%20-%20Normal%20No%20Doula%20Center%20Cut.mp4" 
            type="video/mp4" 
          />
        </video>
        
        <div className="about-hero-overlay"></div>
        
        <div className="about-hero-content">
          <h1 className="about-hero-title">AAI - Aid AI</h1>
          <p className="about-hero-text">
            {heroTexts[currentTextIndex]}
          </p>
          <div className="hero-indicators">
            {heroTexts.map((_, index) => (
              <span 
                key={index} 
                className={`indicator ${index === currentTextIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="about-intro">
        <div className="about-container">
          <h2 className="about-section-title">Welcome to VisualAID</h2>
          <div className="about-intro-content">
            <p className="about-description">
              VisualAID is an AI-powered vision assistant designed to empower individuals with visual 
              impairments to navigate and understand their environment with confidence and independence. 
              Our mission is to make the world more accessible through cutting-edge artificial intelligence 
              and computer vision technology.
            </p>
            
            <p className="about-description">
              Built with compassion and innovation, VisualAID provides real-time assistance through voice 
              commands, helping users identify objects, read text, navigate spaces, and stay aware of their 
              surroundings. We believe that everyone deserves to experience the beauty of the world, and 
              we're here to make that possible.
            </p>

            <div className="about-features-grid">
              <div className="feature-card">
                <h3>Computer Vision</h3>
                <p>Advanced AI analyzes your surroundings in real-time</p>
              </div>
              
              <div className="feature-card">
                <h3>Voice Control</h3>
                <p>Natural voice commands for seamless interaction</p>
              </div>
              
              <div className="feature-card">
                <h3>Navigation</h3>
                <p>Safe guidance through unfamiliar environments</p>
              </div>
              
              <div className="feature-card">
                <h3>Text Recognition</h3>
                <p>Read signs, labels, and documents instantly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Human Connection Section */}
      <section className="about-connection">
        <div className="about-container">
          <h2 className="about-section-title">Built with Heart</h2>
          <div className="connection-content">
            <p className="connection-text">
              VisualAID isn't just technology—it's a bridge to independence, a companion on your journey, 
              and a tool that understands your needs. We've designed every feature with real people in mind, 
              listening to the community and building solutions that truly make a difference.
            </p>
            
            <p className="connection-text">
              Every voice command, every obstacle detected, every text read aloud—these aren't just features. 
              They're moments of freedom, confidence, and connection to the world around you.
            </p>

            <div className="connection-quote">
              <p>"Technology should empower, not complicate. Independence should be accessible to everyone."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="about-journey">
        <div className="about-container">
          <h2 className="about-section-title">Our Journey</h2>
          <div className="journey-content">
            <div className="journey-card">
              <h3>Born at CalHacks 12.0</h3>
              <p>
                This project was created during CalHacks 12.0, one of the world's premier hackathons. 
                Starting on <strong>October 24, 2025 at 5:46 PM</strong>, our team came together with 
                a vision to make the world more accessible.
              </p>
            </div>
            
            <div className="journey-card">
              <h3>Day {daysSinceStart} of Development</h3>
              <p>
                Today is <strong>{currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong> at <strong>{currentDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</strong>. Since our start, we've been continuously improving and adding features 
                to make VisualAID even better.
              </p>
            </div>
            
            <div className="journey-card">
              <h3>Continuous Innovation</h3>
              <p>
                We're just getting started! With feedback from our community and advances in AI technology, 
                VisualAID will continue to evolve, adding new features and improving existing ones to serve 
                you better every day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="about-newsletter" id="newsletter">
        <div className="about-container">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Stay Updated</h2>
            <p className="newsletter-description">
              Subscribe to our newsletter to get the latest updates, new features, and success stories 
              from the VisualAID community. Be the first to know about improvements and enhancements!
            </p>
            
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                className="newsletter-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitted}
              />
              <button 
                type="submit" 
                className="newsletter-button"
                disabled={isSubmitted}
              >
                {isSubmitted ? '✓ Subscribed!' : 'Subscribe'}
              </button>
            </form>
            
              {isSubmitted && (
              <p className="newsletter-success">
                Thank you for subscribing! We'll keep you updated on our journey.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer variant="detailed" />
    </div>
  );
};

