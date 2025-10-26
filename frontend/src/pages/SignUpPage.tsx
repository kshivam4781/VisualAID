import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import './SignUpPage.css';

interface SignUpPageProps {
  onSignInClick?: () => void;
  onSignUpSuccess?: (user: any) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onSignInClick,
  onSignUpSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { speak } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US',
  });

  // Announce page on load for accessibility
  useEffect(() => {
    speak('Sign up page. Please enter your details to create your account.', false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      speak('Password must be at least 8 characters long', true);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      speak('Passwords do not match', true);
      setIsLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      speak('Please agree to the terms and conditions to continue', true);
      setIsLoading(false);
      return;
    }

    try {
      // TODO Phase 5: Implement actual registration
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock success
      const mockUser = {
        id: 'user-new-' + Date.now(),
        name: name,
        email: email,
      };

      speak(`Welcome ${name}! Your account has been created successfully.`, false);
      
      if (onSignUpSuccess) {
        onSignUpSuccess(mockUser);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      speak('Registration failed. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      {/* Header Navigation */}
      <Header />

      <div className="signup-content-wrapper">
        <div className="signup-container">
          {/* Welcome Image */}
          <div className="signup-welcome">
            <img src="/signup.png" alt="Welcome to VisualAID" className="welcome-image" />
          </div>

        {/* Sign Up Card */}
        <div className="signup-card">
          {/* Header */}
            <div className="signup-header">
              <h2>Create Account</h2>
              <p>Join VisualAID and start your journey</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-alert" role="alert">
                <span>{error}</span>
              </div>
            )}

            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="signup-form">
              {/* Name Field */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="form-input"
                  disabled={isLoading}
                  autoComplete="name"
                  aria-required="true"
                />
              </div>

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
                    placeholder="Create a strong password"
                    className="form-input"
                    disabled={isLoading}
                    autoComplete="new-password"
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

              {/* Confirm Password Field */}
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="form-input"
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    disabled={isLoading}
                    aria-required="true"
                  />
                  <span>
                    I agree to the <a href="#terms" className="inline-link">Terms of Service</a> and{' '}
                    <a href="#privacy" className="inline-link">Privacy Policy</a>
                  </span>
                </label>
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="signin-link">
              <p>
                Already have an account?{' '}
                <button
                  onClick={onSignInClick}
                  className="link-button"
                  disabled={isLoading}
                >
                  Sign in here
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="divider">
              <span>Or continue with</span>
            </div>

            {/* Alternative Sign Up Options */}
            <div className="alternative-signup">
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

