import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import './SignInPage.css';

interface SignInPageProps {
  onSignUpClick?: () => void;
  onSignInSuccess?: (user: any) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onSignUpClick,
  onSignInSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { speak } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US',
  });

  // Announce page on load for accessibility
  useEffect(() => {
    speak('Sign in page. Please enter your email and password to access your account.', false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      speak('Please fill in all fields', true);
      setIsLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      speak('Please enter a valid email address', true);
      setIsLoading(false);
      return;
    }

    try {
      // TODO Phase 5: Implement actual authentication
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock success
      const mockUser = {
        id: 'user-123',
        name: 'User',
        email: email,
      };

      speak('Sign in successful. Welcome back!', false);
      
      if (onSignInSuccess) {
        onSignInSuccess(mockUser);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
      speak('Sign in failed. Please check your credentials and try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    speak('Password reset feature coming soon. Please contact support for assistance.', false);
    // TODO Phase 5: Implement password reset
  };

  return (
    <div className="signin-page">
      {/* Header Navigation */}
      <Header />

      <div className="signin-content-wrapper">
        <div className="signin-container">
          {/* Welcome Image */}
          <div className="signin-welcome">
            <img src="/signin.png" alt="Welcome to VisualAID" className="welcome-image" />
          </div>

        {/* Sign In Card */}
        <div className="signin-card">
          {/* Header */}
            <div className="signin-header">
              <h2>Welcome Back</h2>
              <p>Sign in to continue your journey</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-alert" role="alert">
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="signin-form">
              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="form-input"
                  disabled={isLoading}
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="form-input"
                    disabled={isLoading}
                    autoComplete="current-password"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="forgot-password"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="signup-link">
              <p>
                New to VisualAID?{' '}
                <button
                  onClick={onSignUpClick}
                  className="link-button"
                  disabled={isLoading}
                >
                  Create an account
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="divider">
              <span>Or continue with</span>
            </div>

            {/* Alternative Sign In Options */}
            <div className="alternative-signin">
              <button className="social-button google-button" disabled>
                Google
              </button>
              <button className="social-button voice-button" disabled>
                Voice
              </button>
            </div>

            {/* Accessibility Note */}
            <div className="accessibility-note">
              <p>Voice commands supported • High contrast mode available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer variant="simple" />
    </div>
  );
};

