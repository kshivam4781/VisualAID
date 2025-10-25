import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

interface FooterProps {
  variant?: 'simple' | 'detailed';
}

export const Footer: React.FC<FooterProps> = ({ variant = 'simple' }) => {
  const currentYear = new Date().getFullYear();

  if (variant === 'simple') {
    return (
      <footer className="common-footer simple">
        <div className="common-footer-container">
          <p className="footer-tagline">See the world through AI-powered eyes.</p>
          <p className="footer-copyright">&copy; {currentYear} VisualAID. All rights reserved.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="common-footer detailed">
      <div className="common-footer-container">
        <div className="footer-content">
          {/* Column 1: About the Company */}
          <div className="footer-section about-section">
            <div className="footer-logo">
              <img src="/icon2.png" alt="VisualAID Logo" className="footer-logo-icon" />
              <span className="footer-logo-text">VisualAID</span>
            </div>
            <p className="footer-description">
              AI-powered vision assistant empowering independence through accessible technology.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="footer-section links-section">
            <h4 className="footer-section-title">Navigation</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/use-case">Use Cases</Link></li>
              <li><Link to="/signin">Sign In</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="footer-section legal-section">
            <h4 className="footer-section-title">Legal</h4>
            <ul className="footer-links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/accessibility">Accessibility</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright Line */}
        <div className="footer-bottom">
          <div className="footer-copyright-line">
            <p>&copy; {currentYear} VisualAID, Inc. All rights reserved.</p>
            <p className="footer-tagline">See the world through AI-powered eyes.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

