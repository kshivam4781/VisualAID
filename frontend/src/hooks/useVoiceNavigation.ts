/**
 * 🗣️ Voice Navigation Hook
 * 
 * Provides intelligent voice-guided navigation with NLP backing.
 * Allows users to navigate between pages using natural speech commands.
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface NavigationCommand {
  action: 'navigate' | 'read_page' | 'describe_page' | 'help' | 'unknown';
  target?: string;
  parameters?: Record<string, any>;
  confidence: number;
  originalText: string;
  response?: string;
}

export interface PageContent {
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    content: string;
    type: 'text' | 'list' | 'quote' | 'cta';
  }>;
  keyPoints: string[];
}

export interface UseVoiceNavigationOptions {
  onNavigation?: (path: string) => void;
  onPageRead?: (content: PageContent) => void;
  speak?: (text: string, interrupt?: boolean) => void;
}

export function useVoiceNavigation({ onNavigation, onPageRead, speak }: UseVoiceNavigationOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<NavigationCommand | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Page content definitions for each route
  const pageContents: Record<string, PageContent> = {
    '/': {
      title: 'VisualAID Home',
      description: 'Welcome to VisualAID - Your AI-powered visual assistant for independence and accessibility.',
      sections: [
        {
          heading: 'Our Mission',
          content: 'Empowering Independence Through Vision AI. VisualAID transforms the way visually impaired individuals experience the world using cutting-edge artificial intelligence and computer vision.',
          type: 'text'
        },
        {
          heading: 'Key Features',
          content: 'AI-Powered Vision, Natural Voice Commands, Smart Navigation, Instant Text Reading',
          type: 'list'
        },
        {
          heading: 'Real Impact',
          content: 'Navigate Safely, Read Instantly, Stay Organized, Shop Independently',
          type: 'list'
        },
        {
          heading: 'Get Started',
          content: 'Ready to Experience Freedom? Join thousands discovering independence through VisualAID.',
          type: 'cta'
        }
      ],
      keyPoints: [
        'AI-powered vision assistance',
        'Real-time navigation help',
        'Voice-controlled interface',
        'Text recognition technology',
        '24/7 availability'
      ]
    },
    '/about': {
      title: 'About VisualAID',
      description: 'Learn about our mission, journey, and commitment to making the world more accessible.',
      sections: [
        {
          heading: 'Welcome to VisualAID',
          content: 'VisualAID is an AI-powered vision assistant designed to empower individuals with visual impairments to navigate and understand their environment with confidence and independence.',
          type: 'text'
        },
        {
          heading: 'Built with Heart',
          content: 'VisualAID isn\'t just technology—it\'s a bridge to independence, a companion on your journey, and a tool that understands your needs.',
          type: 'text'
        },
        {
          heading: 'Our Journey',
          content: 'Born at CalHacks 12.0, this project was created with a vision to make the world more accessible. We\'re continuously improving and adding features.',
          type: 'text'
        },
        {
          heading: 'Key Features',
          content: 'Computer Vision, Voice Control, Navigation, Text Recognition',
          type: 'list'
        }
      ],
      keyPoints: [
        'AI-powered visual assistance',
        'Real-time environment understanding',
        'Voice-controlled interaction',
        'Built for accessibility',
        'Continuous innovation'
      ]
    },
    '/use-case': {
      title: 'Use Cases',
      description: 'Discover how VisualAID can help you in various real-world scenarios.',
      sections: [
        {
          heading: 'Navigation Assistance',
          content: 'Navigate unfamiliar spaces with confidence using real-time guidance and obstacle detection.',
          type: 'text'
        },
        {
          heading: 'Text Reading',
          content: 'Read any text instantly - from product labels to restaurant menus, street signs to important documents.',
          type: 'text'
        },
        {
          heading: 'Object Identification',
          content: 'Identify objects and obstacles in your environment with detailed descriptions.',
          type: 'text'
        },
        {
          heading: 'Environmental Awareness',
          content: 'Get descriptions of your surroundings and stay aware of changes in your environment.',
          type: 'text'
        }
      ],
      keyPoints: [
        'Safe navigation in unfamiliar places',
        'Instant text reading capabilities',
        'Object and obstacle identification',
        'Environmental awareness',
        'Real-time assistance'
      ]
    },
    '/signin': {
      title: 'Sign In',
      description: 'Access your VisualAID account to restore your preferences and continue where you left off.',
      sections: [
        {
          heading: 'Sign In to Your Account',
          content: 'Enter your credentials to access personalized features and saved preferences.',
          type: 'text'
        },
        {
          heading: 'Account Benefits',
          content: 'Save preferences, access personalized features, continue where you left off',
          type: 'list'
        }
      ],
      keyPoints: [
        'Access your account',
        'Restore preferences',
        'Continue your journey',
        'Personalized experience'
      ]
    },
    '/signup': {
      title: 'Sign Up',
      description: 'Create a new VisualAID account to save your preferences and access personalized features.',
      sections: [
        {
          heading: 'Create Your Account',
          content: 'Join the VisualAID community and unlock personalized features and preferences.',
          type: 'text'
        },
        {
          heading: 'Account Benefits',
          content: 'Save preferences, access personalized features, join the community',
          type: 'list'
        }
      ],
      keyPoints: [
        'Create new account',
        'Save preferences',
        'Access personalized features',
        'Join the community'
      ]
    }
  };

  // Navigation command patterns with NLP understanding
  const navigationPatterns = [
    // Direct navigation commands
    {
      patterns: [
        'go to home', 'navigate to home', 'take me home', 'home page', 'main page',
        'go to the home page', 'show me the home page', 'open home page'
      ],
      action: 'navigate' as const,
      target: '/',
      confidence: 0.95,
      response: 'Navigating to the home page.'
    },
    {
      patterns: [
        'go to about', 'navigate to about', 'about us', 'about page', 'about visualaid',
        'go to the about page', 'show me about', 'tell me about visualaid', 'about section'
      ],
      action: 'navigate' as const,
      target: '/about',
      confidence: 0.95,
      response: 'Navigating to the about page.'
    },
    {
      patterns: [
        'go to use case', 'navigate to use case', 'use cases', 'use case page',
        'go to the use case page', 'show me use cases', 'examples', 'how it works',
        'what can it do', 'capabilities', 'features'
      ],
      action: 'navigate' as const,
      target: '/use-case',
      confidence: 0.95,
      response: 'Navigating to the use cases page.'
    },
    {
      patterns: [
        'go to sign in', 'navigate to sign in', 'sign in page', 'login', 'log in',
        'go to the sign in page', 'show me sign in', 'access my account'
      ],
      action: 'navigate' as const,
      target: '/signin',
      confidence: 0.95,
      response: 'Navigating to the sign in page.'
    },
    {
      patterns: [
        'go to sign up', 'navigate to sign up', 'sign up page', 'register', 'create account',
        'go to the sign up page', 'show me sign up', 'create new account', 'join'
      ],
      action: 'navigate' as const,
      target: '/signup',
      confidence: 0.95,
      response: 'Navigating to the sign up page.'
    },
    // Page reading commands
    {
      patterns: [
        'read this page', 'tell me about this page', 'what is on this page',
        'describe this page', 'what does this page say', 'read the content',
        'tell me what is written here', 'what is this page about'
      ],
      action: 'read_page' as const,
      confidence: 0.9,
      response: 'I\'ll read the content of this page for you.'
    },
    {
      patterns: [
        'describe this page', 'what is this page', 'tell me about this page',
        'what does this page contain', 'summarize this page'
      ],
      action: 'describe_page' as const,
      confidence: 0.9,
      response: 'I\'ll describe what this page contains.'
    },
    // Help commands
    {
      patterns: [
        'navigation help', 'how do I navigate', 'what pages are available',
        'show me available pages', 'what can I navigate to', 'navigation commands'
      ],
      action: 'help' as const,
      confidence: 0.9,
      response: 'I\'ll show you the available navigation commands.'
    }
  ];

  // Parse voice command for navigation
  const parseNavigationCommand = useCallback((text: string): NavigationCommand => {
    const normalized = text.toLowerCase().trim();
    
    // Check for exact pattern matches
    for (const pattern of navigationPatterns) {
      for (const patternText of pattern.patterns) {
        if (normalized.includes(patternText)) {
          return {
            action: pattern.action,
            target: pattern.target,
            parameters: pattern.parameters,
            confidence: pattern.confidence,
            originalText: text,
            response: pattern.response
          };
        }
      }
    }

    // Fallback: try to extract page name from natural language (more restrictive)
    const pageKeywords = {
      'home page': '/',
      'main page': '/',
      'about page': '/about',
      'about us': '/about',
      'use case page': '/use-case',
      'use cases page': '/use-case',
      'examples page': '/use-case',
      'sign in page': '/signin',
      'login page': '/signin',
      'sign up page': '/signup',
      'register page': '/signup',
      'create account page': '/signup'
    };

    for (const [keyword, path] of Object.entries(pageKeywords)) {
      if (normalized.includes(keyword)) {
        return {
          action: 'navigate',
          target: path,
          confidence: 0.8,
          originalText: text,
          response: `Navigating to the ${keyword}.`
        };
      }
    }

    return {
      action: 'unknown',
      confidence: 0.3,
      originalText: text,
      response: 'I didn\'t understand that navigation command. Try saying "go to about" or "read this page".'
    };
  }, []);

  // Execute navigation command
  const executeNavigationCommand = useCallback(async (command: NavigationCommand): Promise<boolean> => {
    if (command.action === 'unknown') {
      speak?.(command.response || 'I didn\'t understand that command.');
      return false;
    }

    try {
      setIsProcessing(true);
      setLastCommand(command);

      // Speak the response
      if (command.response) {
        speak?.(command.response, true);
      }

      // Execute the action
      switch (command.action) {
        case 'navigate':
          if (command.target) {
            navigate(command.target);
            onNavigation?.(command.target);
            
            // After navigation, automatically read the new page
            setTimeout(() => {
              const pageContent = pageContents[command.target];
              if (pageContent) {
                readPageContent(pageContent);
              }
            }, 1000); // Wait for navigation to complete
          }
          break;

        case 'read_page':
          const currentPageContent = pageContents[location.pathname];
          if (currentPageContent) {
            readPageContent(currentPageContent);
          } else {
            speak?.('I don\'t have content information for this page.');
          }
          break;

        case 'describe_page':
          const currentPageContent2 = pageContents[location.pathname];
          if (currentPageContent2) {
            describePageContent(currentPageContent2);
          } else {
            speak?.('I don\'t have content information for this page.');
          }
          break;

        case 'help':
          showNavigationHelp();
          break;
      }

      return true;
    } catch (error) {
      console.error('Navigation command execution failed:', error);
      speak?.('Sorry, I encountered an error while executing that command.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [navigate, location.pathname, onNavigation, speak]);

  // Read page content aloud
  const readPageContent = useCallback((content: PageContent) => {
    let fullText = `${content.title}. ${content.description}. `;
    
    content.sections.forEach(section => {
      fullText += `${section.heading}. ${section.content}. `;
    });

    if (content.keyPoints.length > 0) {
      fullText += `Key points: ${content.keyPoints.join(', ')}.`;
    }

    speak?.(fullText, false);
    onPageRead?.(content);
  }, [speak, onPageRead]);

  // Describe page content (shorter version)
  const describePageContent = useCallback((content: PageContent) => {
    const description = `This is the ${content.title}. ${content.description}. `;
    const keyPoints = content.keyPoints.slice(0, 3).join(', ');
    
    speak?.(`${description}Key highlights: ${keyPoints}.`, false);
    onPageRead?.(content);
  }, [speak, onPageRead]);

  // Show navigation help
  const showNavigationHelp = useCallback(() => {
    const helpText = `Available navigation commands: 
    Say "go to home" to navigate to the home page.
    Say "go to about" to learn about VisualAID.
    Say "go to use case" to see examples.
    Say "go to sign in" to access your account.
    Say "go to sign up" to create an account.
    Say "read this page" to hear the page content.
    Say "describe this page" for a summary.`;
    
    speak?.(helpText, false);
  }, [speak]);

  // Process voice input for navigation
  const processVoiceInput = useCallback(async (text: string): Promise<boolean> => {
    console.log('🗣️ Processing voice input for navigation:', text);
    
    const command = parseNavigationCommand(text);
    console.log('🗣️ Parsed navigation command:', command);
    
    if (command.confidence < 0.5) {
      console.log('🗣️ Low confidence command, treating as general conversation');
      return false; // Let other systems handle it
    }

    const success = await executeNavigationCommand(command);
    console.log('🗣️ Navigation command executed:', success);
    
    return success;
  }, [parseNavigationCommand, executeNavigationCommand]);

  // Get current page content
  const getCurrentPageContent = useCallback((): PageContent | null => {
    return pageContents[location.pathname] || null;
  }, [location.pathname]);

  // Get available pages
  const getAvailablePages = useCallback(() => {
    return Object.entries(pageContents).map(([path, content]) => ({
      path,
      title: content.title,
      description: content.description
    }));
  }, []);

  return {
    processVoiceInput,
    parseNavigationCommand,
    executeNavigationCommand,
    getCurrentPageContent,
    getAvailablePages,
    readPageContent,
    describePageContent,
    showNavigationHelp,
    isProcessing,
    lastCommand,
    pageContents
  };
}
