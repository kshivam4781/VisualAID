/**
 * 🎤 Realtime AI Command Parser
 * 
 * Uses OpenAI Realtime API to intelligently parse and execute voice commands
 */

import { useCallback, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface CommandResult {
  success: boolean;
  action: string;
  parameters: Record<string, any>;
  message: string;
  confidence: number;
}

interface UseRealtimeCommandParserOptions {
  socket: Socket | null;
  sessionId: string | null;
  onCommandExecuted?: (result: CommandResult) => void;
}

export function useRealtimeCommandParser({
  socket,
  sessionId,
  onCommandExecuted
}: UseRealtimeCommandParserOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse voice input using OpenAI Realtime API
  const parseVoiceCommand = useCallback(async (transcript: string): Promise<CommandResult> => {
    if (!socket || !sessionId) {
      return {
        success: false,
        action: 'error',
        parameters: {},
        message: 'Not connected to server',
        confidence: 0
      };
    }

    setIsProcessing(true);
    
    try {
      console.log('🤖 [REALTIME AI] Parsing voice command:', transcript);
      
      // Send to OpenAI Realtime API for intelligent parsing
      const result = await new Promise<CommandResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Command parsing timeout'));
        }, 10000); // 10 second timeout

        // Listen for the response
        const handleResponse = (data: any) => {
          clearTimeout(timeout);
          socket.off('realtime:command_parsed', handleResponse);
          
          console.log('✅ [REALTIME AI] Command parsed:', data);
          resolve({
            success: data.success || false,
            action: data.action || 'unknown',
            parameters: data.parameters || {},
            message: data.message || 'Command processed',
            confidence: data.confidence || 0.5
          });
        };

        socket.on('realtime:command_parsed', handleResponse);

        // Send command to realtime API
        socket.emit('realtime:parse_command', {
          sessionId,
          transcript,
          timestamp: new Date().toISOString()
        });
      });

      return result;
      
    } catch (error) {
      console.error('❌ [REALTIME AI] Command parsing failed:', error);
      return {
        success: false,
        action: 'error',
        parameters: {},
        message: `Failed to parse command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      };
    } finally {
      setIsProcessing(false);
    }
  }, [socket, sessionId]);

  // Execute a parsed command
  const executeCommand = useCallback(async (result: CommandResult): Promise<boolean> => {
    if (!result.success) {
      console.warn('⚠️ [REALTIME AI] Cannot execute failed command:', result.message);
      return false;
    }

    try {
      console.log('🎯 [REALTIME AI] Executing command:', result.action, result.parameters);
      
      // Send command execution request to backend
      socket?.emit('realtime:execute_command', {
        sessionId,
        action: result.action,
        parameters: result.parameters,
        originalText: result.message,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      });

      // Notify callback
      onCommandExecuted?.(result);
      
      return true;
      
    } catch (error) {
      console.error('❌ [REALTIME AI] Command execution failed:', error);
      return false;
    }
  }, [socket, sessionId, onCommandExecuted]);

  // Process voice input end-to-end
  const processVoiceInput = useCallback(async (transcript: string): Promise<boolean> => {
    console.log('🎤 [REALTIME AI] Processing voice input:', transcript);
    
    // Parse the command using AI
    const result = await parseVoiceCommand(transcript);
    
    if (!result.success) {
      console.warn('⚠️ [REALTIME AI] Command parsing failed:', result.message);
      return false;
    }

    // Execute the command
    const executed = await executeCommand(result);
    
    if (executed) {
      console.log('✅ [REALTIME AI] Command executed successfully:', result.action);
    } else {
      console.error('❌ [REALTIME AI] Command execution failed');
    }
    
    return executed;
  }, [parseVoiceCommand, executeCommand]);

  return {
    processVoiceInput,
    parseVoiceCommand,
    executeCommand,
    isProcessing
  };
}
