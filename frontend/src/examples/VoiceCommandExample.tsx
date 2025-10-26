/**
 * 🎤 Voice Command Integration Example
 * 
 * This example shows how to integrate the voice command system
 * with your existing components.
 */

import React, { useEffect } from 'react';
import { useVoiceCommandHandler } from '../hooks/useVoiceCommandHandler';
import { useConversation } from '../hooks/useConversation';
import { useCameraAccess } from '../hooks/useCameraAccess';
import { useFrameCapture } from '../hooks/useFrameCapture';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useAudioQueue } from '../hooks/useAudioQueue';

export const VoiceCommandExample: React.FC = () => {
  // Initialize all required hooks
  const conversation = useConversation({
    socket: null, // Your WebSocket connection
    onVisionActivated: () => console.log('Vision activated'),
    onVisionDeactivated: () => console.log('Vision deactivated')
  });
  
  const cameraState = useCameraAccess();
  const frameCaptureState = useFrameCapture();
  const sessionState = useSessionManagement();
  const audioQueue = useAudioQueue();
  
  // Initialize voice command handler
  const { processVoiceCommand } = useVoiceCommandHandler({
    conversation,
    cameraState,
    frameCaptureState,
    sessionState,
    audioQueue,
    onCommandExecuted: (command) => {
      console.log('🎤 Command executed:', command);
    }
  });

  // Example: Process voice commands from user input
  const handleUserSpeech = async (transcript: string) => {
    console.log('🎤 User said:', transcript);
    
    // Process the voice command
    const success = await processVoiceCommand(transcript);
    
    if (success) {
      console.log('✅ Command processed successfully');
    } else {
      console.log('❌ Command processing failed');
    }
  };

  // Example usage
  useEffect(() => {
    // Simulate voice commands
    const exampleCommands = [
      'Be my eye',
      'Describe what you see',
      'Read the text',
      'Navigate me',
      'Is it safe?',
      'Look left',
      'Zoom in',
      'Help',
      'Stop be my eye'
    ];

    // Process each command after a delay
    exampleCommands.forEach((command, index) => {
      setTimeout(() => {
        console.log(`\n🎤 Processing example command ${index + 1}: "${command}"`);
        handleUserSpeech(command);
      }, index * 3000); // 3 seconds between commands
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🎤 Voice Command System Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Commands:</h3>
        <ul>
          <li><strong>"Be my eye"</strong> - Start vision mode</li>
          <li><strong>"Stop be my eye"</strong> - Stop vision mode</li>
          <li><strong>"Describe what you see"</strong> - Get scene description</li>
          <li><strong>"Read the text"</strong> - Read visible text</li>
          <li><strong>"Navigate me"</strong> - Start navigation assistance</li>
          <li><strong>"Find [object]"</strong> - Look for specific objects</li>
          <li><strong>"Is it safe?"</strong> - Check for obstacles</li>
          <li><strong>"Look left/right/up/down"</strong> - Pan camera</li>
          <li><strong>"Zoom in/out"</strong> - Adjust camera zoom</li>
          <li><strong>"Louder/Quieter"</strong> - Adjust volume</li>
          <li><strong>"Repeat"</strong> - Repeat last message</li>
          <li><strong>"Help"</strong> - Show command list</li>
          <li><strong>"Menu"</strong> - Return to main menu</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Natural Speech Examples:</h3>
        <ul>
          <li>"Can you help me navigate?" → Navigation assistance</li>
          <li>"What's in front of me?" → Scene description</li>
          <li>"Is there anything dangerous?" → Safety check</li>
          <li>"Can you read that sign?" → Text reading</li>
          <li>"I need to find my keys" → Object search</li>
          <li>"Turn the camera left" → Camera pan</li>
          <li>"Make it louder" → Volume up</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
        <h4>🔧 Integration Code:</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
{`// 1. Initialize voice command handler
const { processVoiceCommand } = useVoiceCommandHandler({
  conversation,
  cameraState,
  frameCaptureState,
  sessionState,
  audioQueue,
  onCommandExecuted: (command) => {
    console.log('Command executed:', command);
  }
});

// 2. Process voice commands
const handleUserSpeech = async (transcript: string) => {
  const success = await processVoiceCommand(transcript);
  return success;
};

// 3. Use with your voice recognition
// When user speaks, call processVoiceCommand(transcript)`}
        </pre>
      </div>

      <div style={{ marginTop: '20px', color: '#666' }}>
        <p><strong>Note:</strong> This example runs automatically. Check the console to see command processing in action.</p>
      </div>
    </div>
  );
};
