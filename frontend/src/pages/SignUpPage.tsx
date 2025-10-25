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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [emergencyContact, setEmergencyContact] = useState({
    name: 'Sky Transport Solutions',
    phone: '3502178666',
    email: '@skytransportsolutions.com',
  });
  const [useDefaultContact, setUseDefaultContact] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form

  const { speak } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US',
  });

  // Announce page on load
  useEffect(() => {
    speak('Sign up page. Create your VisualAID account to get started.', false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmergencyContact(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email) {
      setError('Please enter your name and email');
      speak('Please enter your name and email', true);
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      speak('Please enter a valid email address', true);
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError('Please enter and confirm your password');
      speak('Please enter and confirm your password', true);
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      speak('Password must be at least 8 characters long', true);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      speak('Passwords do not match', true);
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (!useDefaultContact) {
      if (!emergencyContact.name || !emergencyContact.phone) {
        setError('Please provide emergency contact details');
        speak('Please provide emergency contact details', true);
        return false;
      }

      if (emergencyContact.phone.length < 10) {
        setError('Please enter a valid phone number');
        speak('Please enter a valid phone number', true);
        return false;
      }
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      speak('Please agree to the terms and conditions to continue', true);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (step === 1 && validateStep1()) {
      setStep(2);
      speak('Step 2. Create your password', false);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      speak('Step 3. Emergency contact. For your safety, we need an emergency contact. You can use our default Sky Transport Solutions contact.', false);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
    speak(`Back to step ${step - 1}`, false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // TODO Phase 5: Implement actual registration API
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock success
      const mockUser = {
        id: 'user-new-' + Date.now(),
        name: formData.name,
        email: formData.email,
        emergencyContact: emergencyContact,
      };

      speak(`Welcome ${formData.name}! Your account has been created successfully.`, false);
      
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

      <div className="signup-container">
        {/* Sign Up Card */}
        <div className="signup-card">
          {/* Logo */}
          <div className="signup-logo">
            <div className="logo-icon">👁️</div>
            <h1 className="logo-title">VisualAID</h1>
          </div>

          {/* Progress Indicator */}
          <div className="progress-indicator">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Account</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Security</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Safety</div>
            </div>
          </div>

          {/* Header */}
          <div className="signup-header">
            <h2>
              {step === 1 && 'Create Your Account'}
              {step === 2 && 'Secure Your Account'}
              {step === 3 && 'Emergency Contact'}
            </h2>
            <p>
              {step === 1 && 'Get started with VisualAID'}
              {step === 2 && 'Choose a strong password'}
              {step === 3 && 'For your safety and peace of mind'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-alert" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="signup-form">
            {/* Step 1: Account Info */}
            {step === 1 && (
              <div className="form-step">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="form-input"
                    autoComplete="name"
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="form-input"
                    autoComplete="email"
                    aria-required="true"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <div className="form-step">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password"
                      className="form-input"
                      autoComplete="new-password"
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <small className="form-hint">Minimum 8 characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Re-enter your password"
                      className="form-input"
                      autoComplete="new-password"
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Emergency Contact */}
            {step === 3 && (
              <div className="form-step">
                <div className="emergency-info">
                  <div className="info-icon">🚨</div>
                  <p>
                    For your safety, we require an emergency contact who can be reached
                    if needed. You can use our default 24/7 support service.
                  </p>
                </div>

                <div className="form-group">
                  <label className="checkbox-label checkbox-large">
                    <input
                      type="checkbox"
                      checked={useDefaultContact}
                      onChange={(e) => setUseDefaultContact(e.target.checked)}
                    />
                    <span>Use default emergency contact (Recommended)</span>
                  </label>
                </div>

                {useDefaultContact ? (
                  <div className="default-contact-card">
                    <h4>Default Emergency Contact</h4>
                    <div className="contact-detail">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">Sky Transport Solutions</span>
                    </div>
                    <div className="contact-detail">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">350-217-8666</span>
                    </div>
                    <div className="contact-detail">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">@skytransportsolutions.com</span>
                    </div>
                    <small className="contact-note">Available 24/7 for emergency assistance</small>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="contactName" className="form-label">
                        Contact Name
                      </label>
                      <input
                        id="contactName"
                        name="name"
                        type="text"
                        value={emergencyContact.name}
                        onChange={handleEmergencyContactChange}
                        placeholder="Enter emergency contact name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contactPhone" className="form-label">
                        Contact Phone
                      </label>
                      <input
                        id="contactPhone"
                        name="phone"
                        type="tel"
                        value={emergencyContact.phone}
                        onChange={handleEmergencyContactChange}
                        placeholder="Enter phone number"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contactEmail" className="form-label">
                        Contact Email (Optional)
                      </label>
                      <input
                        id="contactEmail"
                        name="email"
                        type="email"
                        value={emergencyContact.email}
                        onChange={handleEmergencyContactChange}
                        placeholder="Enter email address"
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="checkbox-label checkbox-large">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      aria-required="true"
                    />
                    <span>
                      I agree to the <a href="#terms" className="inline-link">Terms of Service</a> and{' '}
                      <a href="#privacy" className="inline-link">Privacy Policy</a>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="form-navigation">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="nav-button secondary-button"
                  disabled={isLoading}
                >
                  ← Previous
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="nav-button primary-button"
                  style={{ marginLeft: step === 1 ? '0' : 'auto' }}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  className="nav-button submit-button"
                  disabled={isLoading}
                  style={{ marginLeft: 'auto' }}
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
              )}
            </div>
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

          {/* Accessibility Note */}
          <div className="accessibility-note">
            <p>🔊 Voice commands supported • High contrast mode available</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer variant="simple" />
    </div>
  );
};

