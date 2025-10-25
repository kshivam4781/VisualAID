import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  variant?: 'light' | 'dark';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'dark' }) => {
  return (
    <header className={`common-header ${variant}`}>
      <div className="common-header-container">
        <Link to="/" className="common-logo">
          <img src="/icon2.png" alt="AAI Logo" className="common-logo-icon" />
          <span className="common-logo-text">VisualAID</span>
        </Link>
        <nav className="common-nav">
          <Link to="/" className="common-nav-link">Home</Link>
          <Link to="/about" className="common-nav-link">About Us</Link>
          <Link to="/use-case" className="common-nav-link">Use Cases</Link>
          <Link to="/signin" className="common-nav-link common-nav-button">Sign In</Link>
        </nav>
      </div>
    </header>
  );
};

