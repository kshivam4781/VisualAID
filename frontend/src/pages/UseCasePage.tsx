import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import './UseCasePage.css';

export const UseCasePage: React.FC = () => {
  // Use case data
  const useCases = [
    {
      title: 'Navigate Unfamiliar Spaces',
      description: 'Confidently explore new environments with real-time guidance. AAI describes your surroundings, identifies obstacles, and helps you navigate safely through unfamiliar locations.',
      examples: [
        'Walking through a new building or office',
        'Exploring a park or outdoor area',
        'Navigating public transportation stations',
        'Finding your way in hotels or airports'
      ]
    },
    {
      title: 'Read Text and Labels',
      description: 'Instantly access written information around you. AAI can read text from documents, signs, labels, menus, and more, giving you independence in daily tasks.',
      examples: [
        'Reading product labels while shopping',
        'Accessing restaurant menus',
        'Reading mail and documents',
        'Understanding signs and directions'
      ]
    },
    {
      title: 'Identify Objects and Obstacles',
      description: 'Stay aware of your environment with object recognition. AAI identifies items around you and alerts you to potential obstacles in your path.',
      examples: [
        'Locating specific items in your home',
        'Identifying obstacles on walkways',
        'Recognizing everyday objects',
        'Detecting changes in your environment'
      ]
    },
    {
      title: 'Shopping Assistance',
      description: 'Shop independently with confidence. AAI helps you identify products, read labels, compare items, and navigate store layouts.',
      examples: [
        'Finding specific products on shelves',
        'Reading ingredient lists and nutrition facts',
        'Comparing similar products',
        'Navigating grocery store aisles'
      ]
    },
    {
      title: 'Home Organization',
      description: 'Keep track of your belongings and maintain organization. AAI remembers where you keep items and helps you locate them when needed.',
      examples: [
        'Finding notes and important documents',
        'Locating stored items',
        'Organizing your living space',
        'Remembering where things belong'
      ]
    },
    {
      title: 'Environmental Descriptions',
      description: 'Experience the world through detailed descriptions. AAI paints a vivid picture of your surroundings, helping you understand and appreciate your environment.',
      examples: [
        'Understanding room layouts',
        'Learning about new locations',
        'Appreciating scenic views',
        'Getting context about your surroundings'
      ]
    },
    {
      title: 'Safety Alerts',
      description: 'Stay safe with proactive danger detection. AAI identifies potential hazards and alerts you immediately, helping prevent accidents.',
      examples: [
        'Detecting stairs or drop-offs',
        'Identifying wet floors or spills',
        'Warning about moving vehicles',
        'Alerting to unexpected obstacles'
      ]
    },
    {
      title: 'Navigation and Directions',
      description: 'Get turn-by-turn guidance to your destination. AAI provides conversational directions and helps you navigate from point A to point B.',
      examples: [
        'Walking to specific addresses',
        'Finding locations in buildings',
        'Getting public transit directions',
        'Exploring new neighborhoods'
      ]
    },
    {
      title: 'Social Interactions',
      description: 'Engage confidently in social situations. AAI helps you understand visual social cues and navigate group settings.',
      examples: [
        'Identifying who is speaking',
        'Understanding group dynamics',
        'Reading facial expressions (future feature)',
        'Navigating social gatherings'
      ]
    },
    {
      title: 'Capture Important Moments',
      description: 'Never miss special moments. AAI can capture and describe important visual experiences, helping you create lasting memories.',
      examples: [
        'Describing special events',
        'Capturing family gatherings',
        'Documenting travel experiences',
        'Preserving visual memories'
      ]
    }
  ];

  return (
    <div className="usecase-page">
      {/* Header Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="usecase-hero">
        <div className="usecase-hero-content">
          <h1 className="usecase-hero-title">How AAI Helps You</h1>
          <p className="usecase-hero-description">
            Discover the many ways VisualAID empowers you to live independently and confidently. 
            From everyday tasks to complex navigation, AAI is your trusted visual assistant.
          </p>
        </div>
      </section>

      {/* Use Cases - Alternating Layout */}
      <section className="usecase-content">
        <div className="usecase-container">
          <div className="usecase-timeline">
            {useCases.map((useCase, index) => (
              <div 
                key={index} 
                className={`usecase-item ${index % 2 === 0 ? 'usecase-left' : 'usecase-right'}`}
              >
                <div className="usecase-number">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="usecase-content-wrapper">
                  <div className="usecase-header">
                    <h3 className="usecase-title">{useCase.title}</h3>
                    <div className="usecase-divider"></div>
                  </div>
                  <p className="usecase-description">{useCase.description}</p>
                  <div className="usecase-examples">
                    <div className="examples-grid">
                      {useCase.examples.map((example, idx) => (
                        <div key={idx} className="example-item">
                          <span className="example-bullet">→</span>
                          <span>{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="usecase-how">
        <div className="usecase-container">
          <h2 className="usecase-section-title">How It Works</h2>
          <div className="how-steps">
            <div className="how-step">
              <div className="step-number">1</div>
              <h3>Activate with Your Voice</h3>
              <p>Simply say "be my eye" to start receiving visual assistance</p>
            </div>
            <div className="how-step">
              <div className="step-number">2</div>
              <h3>AI Analyzes Your Surroundings</h3>
              <p>Advanced AI processes what's in front of you in real-time</p>
            </div>
            <div className="how-step">
              <div className="step-number">3</div>
              <h3>Get Instant Descriptions</h3>
              <p>Receive clear, conversational descriptions through audio</p>
            </div>
            <div className="how-step">
              <div className="step-number">4</div>
              <h3>Navigate Confidently</h3>
              <p>Move forward with confidence and independence</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="usecase-cta">
        <div className="usecase-container">
          <div className="cta-content">
            <h2>Ready to Experience Independence?</h2>
            <p>Try AAI today and discover a new level of freedom and confidence.</p>
            <button className="cta-button" onClick={() => window.location.href = '/'}>
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer variant="detailed" />
    </div>
  );
};

