/**
 * 🎤 Voice Command Handler
 * 
 * Integrates voice navigation with the existing conversation system.
 * Handles voice commands for navigation and page reading.
 */

import { useCallback, useRef, useState } from 'react';
import { useVoiceNavigation } from './useVoiceNavigation';
import { useConversation } from './useConversation';

export interface VoiceCommandHandlerOptions {
  conversation: ReturnType<typeof useConversation>;
  speak?: (text: string, interrupt?: boolean) => void;
  onNavigation?: (path: string) => void;
  onPageRead?: (content: any) => void;
}

export function useVoiceCommandHandler({
  conversation,
  speak,
  onNavigation,
  onPageRead
}: VoiceCommandHandlerOptions) {
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [lastProcessedCommand, setLastProcessedCommand] = useState<string | null>(null);
  const commandProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize voice navigation
  const voiceNavigation = useVoiceNavigation({
    onNavigation,
    onPageRead,
    speak
  });

  // Enhanced command patterns that work with the conversation system
  const enhancedCommandPatterns = [
    // Navigation commands
    {
      patterns: [
        'navigate to', 'go to', 'take me to', 'show me', 'open',
        'switch to', 'visit', 'bring me to'
      ],
      type: 'navigation',
      priority: 'high'
    },
    // Page reading commands
    {
      patterns: [
        'read this page', 'tell me about this page', 'what is on this page',
        'describe this page', 'what does this page say', 'read the content',
        'tell me what is written here', 'what is this page about',
        'summarize this page', 'give me an overview'
      ],
      type: 'page_reading',
      priority: 'high'
    },
    // Help commands
    {
      patterns: [
        'navigation help', 'how do I navigate', 'what pages are available',
        'show me available pages', 'what can I navigate to', 'navigation commands',
        'help with navigation', 'navigation options'
      ],
      type: 'navigation_help',
      priority: 'medium'
    },
    // Page-specific commands
    {
      patterns: [
        'tell me about visualaid', 'what is visualaid', 'about the company',
        'mission statement', 'our mission', 'company information'
      ],
      type: 'about_page',
      priority: 'medium'
    },
    {
      patterns: [
        'use cases', 'examples', 'how it works', 'what can it do',
        'capabilities', 'features', 'applications'
      ],
      type: 'use_case_page',
      priority: 'medium'
    },
    {
      patterns: [
        'sign in', 'login', 'log in', 'access account', 'my account'
      ],
      type: 'signin_page',
      priority: 'medium'
    },
    {
      patterns: [
        'sign up', 'register', 'create account', 'join', 'new account'
      ],
      type: 'signup_page',
      priority: 'medium'
    }
  ];

  // Check if input contains a voice command
  const isVoiceCommand = useCallback((text: string): boolean => {
    const normalized = text.toLowerCase().trim();
    
    for (const pattern of enhancedCommandPatterns) {
      for (const patternText of pattern.patterns) {
        if (normalized.includes(patternText)) {
          return true;
        }
      }
    }
    
    return false;
  }, []);

  // Process voice input and determine if it's a navigation command
  const processVoiceInput = useCallback(async (text: string): Promise<boolean> => {
    console.log('🎤 Processing voice input for commands:', text);
    
    // Prevent processing the same command twice
    if (text === lastProcessedCommand) {
      console.log('🎤 Skipping duplicate command');
      return false;
    }
    
    setLastProcessedCommand(text);
    
    // Clear any existing timeout
    if (commandProcessingTimeoutRef.current) {
      clearTimeout(commandProcessingTimeoutRef.current);
    }
    
    // Set processing timeout - shorter timeout to prevent blocking
    commandProcessingTimeoutRef.current = setTimeout(() => {
      setLastProcessedCommand(null);
    }, 2000); // Reset after 2 seconds
    
    try {
      setIsProcessingCommand(true);
      
      // Try to process as navigation command first
      const navigationSuccess = await voiceNavigation.processVoiceInput(text);
      
      if (navigationSuccess) {
        console.log('🎤 Successfully processed as navigation command');
        return true;
      }
      
      // If not a navigation command, let the conversation system handle it
      console.log('🎤 Not a navigation command, letting conversation system handle it');
      return false;
      
    } catch (error) {
      console.error('🎤 Error processing voice command:', error);
      return false;
    } finally {
      setIsProcessingCommand(false);
    }
  }, [voiceNavigation, lastProcessedCommand]);

  // Enhanced command processing with context awareness
  const processCommandWithContext = useCallback(async (text: string, context?: any): Promise<boolean> => {
    console.log('🎤 Processing command with context:', { text, context });
    
    // Add context-aware processing
    if (context?.isVisionMode && text.toLowerCase().includes('read')) {
      // In vision mode, "read" might mean read what's in the camera
      console.log('🎤 In vision mode - "read" command might be for camera content');
      return false; // Let vision system handle it
    }
    
    // Process normally
    return await processVoiceInput(text);
  }, [processVoiceInput]);

  // Get available commands for help
  const getAvailableCommands = useCallback(() => {
    return [
      'Navigation Commands:',
      '• "Go to home" - Navigate to the home page',
      '• "Go to about" - Learn about VisualAID',
      '• "Go to use case" - See examples and use cases',
      '• "Go to sign in" - Access your account',
      '• "Go to sign up" - Create a new account',
      '',
      'Page Reading Commands:',
      '• "Read this page" - Hear the full page content',
      '• "Describe this page" - Get a page summary',
      '• "What is this page about" - Page overview',
      '',
      'Help Commands:',
      '• "Navigation help" - Show available commands',
      '• "What pages are available" - List all pages',
      '',
      'You can also ask questions naturally about any page content!'
    ];
  }, []);

  // Show comprehensive help
  const showHelp = useCallback(() => {
    const helpText = getAvailableCommands().join('\n');
    speak?.(helpText, false);
  }, [getAvailableCommands, speak]);

  // Handle special cases
  const handleSpecialCases = useCallback((text: string): boolean => {
    const normalized = text.toLowerCase().trim();
    
    // Handle "what page am I on" type questions
    if (normalized.includes('what page') && normalized.includes('on')) {
      const currentPage = voiceNavigation.getCurrentPageContent();
      if (currentPage) {
        speak?.(`You are currently on the ${currentPage.title}. ${currentPage.description}`, false);
        return true;
      }
    }
    
    // Handle "where am I" type questions
    if (normalized.includes('where am i') || normalized.includes('what page am i on')) {
      const currentPage = voiceNavigation.getCurrentPageContent();
      if (currentPage) {
        speak?.(`You are on the ${currentPage.title} page.`, false);
        return true;
      }
    }
    
    // Handle "what pages are available" type questions
    if (normalized.includes('what pages') && normalized.includes('available')) {
      const pages = voiceNavigation.getAvailablePages();
      const pageList = pages.map(page => page.title).join(', ');
      speak?.(`Available pages: ${pageList}. You can navigate to any of these by saying "go to" followed by the page name.`, false);
      return true;
    }
    
    return false;
  }, [voiceNavigation, speak]);

  // Main command processing function
  const processCommand = useCallback(async (text: string, context?: any): Promise<boolean> => {
    console.log('🎤 Main command processing:', text);
    
    // Handle special cases first
    if (handleSpecialCases(text)) {
      return true;
    }
    
    // Process with context
    return await processCommandWithContext(text, context);
  }, [handleSpecialCases, processCommandWithContext]);

  return {
    processCommand,
    processVoiceInput,
    isVoiceCommand,
    isProcessingCommand,
    lastProcessedCommand,
    showHelp,
    getAvailableCommands,
    voiceNavigation,
    // Expose voice navigation methods
    readPageContent: voiceNavigation.readPageContent,
    describePageContent: voiceNavigation.describePageContent,
    getCurrentPageContent: voiceNavigation.getCurrentPageContent,
    getAvailablePages: voiceNavigation.getAvailablePages
  };
}