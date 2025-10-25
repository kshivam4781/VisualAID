import React, { useState, useEffect, useCallback } from 'react';
import { Agent } from './components/Agent';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { speak } from './services/geminiService';
import { MicrophoneIcon } from './components/icons/MicrophoneIcon';
import { StatusIndicator } from './components/StatusIndicator';

const App: React.FC = () => {
  const [agentMessage, setAgentMessage] = useState('...');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  const handleCommand = useCallback((command: string) => {
    console.log('Received command:', command);
    // Future logic to handle commands will go here.
    // For now, we just log it.
  }, []);

  const {
    transcript,
    isListening,
    error,
    startListening,
  } = useVoiceCommands(handleCommand);
  
  const initialGreeting = "Hello! I am your visual assistance agent. How can I help you today?";

  useEffect(() => {
    const greetUser = async () => {
      try {
        setIsAgentSpeaking(true);
        setAgentMessage(initialGreeting);
        await speak(initialGreeting);
      } catch (err) {
        console.error("Error during greeting:", err);
        setAgentMessage("I'm having trouble speaking right now.");
      } finally {
        setIsAgentSpeaking(false);
        // Start listening for commands after the greeting is complete
        startListening();
      }
    };
    
    greetUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white flex flex-col items-center justify-center p-4 font-sans">
      {/* Static High-Contrast Background */}
      <div 
        className="absolute inset-0 z-0" 
        style={{ background: 'radial-gradient(circle, #1a202c 0%, #000000 100%)' }}
      />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-cyan-500/[0.07]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <Agent message={agentMessage} isSpeaking={isAgentSpeaking} />

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-black bg-opacity-50 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <MicrophoneIcon className={`h-10 w-10 text-white ${isListening ? 'text-cyan-400 animate-pulse' : 'opacity-40'}`} />
              <StatusIndicator isListening={isListening} error={error} />
            </div>
            <p className="text-center text-2xl text-slate-200 min-h-[36px]">
              {transcript || <span className="italic opacity-50">Say something...</span>}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;