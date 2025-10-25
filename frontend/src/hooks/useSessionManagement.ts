import { useState, useCallback, useRef, useEffect } from 'react';
import { websocketService } from '../services/websocket';

interface SessionState {
  sessionId: string | null;
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  frameCount: number;
  error: string | null;
}

interface UseSessionManagementOptions {
  isConnected?: boolean;
}

interface UseSessionManagementReturn {
  sessionState: SessionState;
  startSession: (userId?: string, metadata?: any) => Promise<boolean>;
  endSession: () => Promise<{ success: boolean; frameCount: number }>;
  clearError: () => void;
  getSessionDuration: () => number; // in seconds
}

export const useSessionManagement = (options: UseSessionManagementOptions = {}): UseSessionManagementReturn => {
  const { isConnected = true } = options;
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    isActive: false,
    startTime: null,
    endTime: null,
    frameCount: 0,
    error: null,
  });

  const startTimeRef = useRef<number | null>(null);

  // Start a new vision session
  const startSession = useCallback(async (userId?: string, metadata?: any): Promise<boolean> => {
    try {
      setSessionState(prev => ({ ...prev, error: null }));

      const result = await websocketService.startVisionSession(userId, metadata);
      
      if (result.success) {
        const now = Date.now();
        startTimeRef.current = now;
        
        setSessionState({
          sessionId: result.sessionId,
          isActive: true,
          startTime: now,
          endTime: null,
          frameCount: 0,
          error: null,
        });

        console.log('✅ Session started successfully:', result.sessionId);
        return true;
      } else {
        throw new Error('Failed to start session');
      }
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error starting session:', err);
      setSessionState(prev => ({
        ...prev,
        error: err.message,
        isActive: false,
      }));
      return false;
    }
  }, []);

  // End the current vision session
  const endSession = useCallback(async (): Promise<{ success: boolean; frameCount: number }> => {
    try {
      const result = await websocketService.endVisionSession();
      
      if (result.success) {
        const now = Date.now();
        
        setSessionState(prev => ({
          ...prev,
          isActive: false,
          endTime: now,
          frameCount: result.frameCount,
        }));

        console.log(`✅ Session ended successfully: ${result.frameCount} frames captured`);
        return { success: true, frameCount: result.frameCount };
      } else {
        throw new Error('Failed to end session');
      }
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error ending session:', err);
      setSessionState(prev => ({
        ...prev,
        error: err.message,
        isActive: false,
      }));
      return { success: false, frameCount: 0 };
    }
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    setSessionState(prev => ({ ...prev, error: null }));
  }, []);

  // Get session duration in seconds
  const getSessionDuration = useCallback((): number => {
    if (!startTimeRef.current) return 0;
    
    const endTime = sessionState.endTime || Date.now();
    const duration = endTime - startTimeRef.current;
    return Math.floor(duration / 1000);
  }, [sessionState.endTime]);

  // Update frame count from WebSocket events
  useEffect(() => {
    // Only set up listener when WebSocket is connected
    if (!isConnected) {
      return;
    }

    const handleFrameCaptured = (data: any) => {
      if (data.captureCount !== undefined) {
        setSessionState(prev => ({
          ...prev,
          frameCount: data.captureCount,
        }));
      }
    };

    websocketService.on('frame:captured', handleFrameCaptured);

    return () => {
      websocketService.off('frame:captured', handleFrameCaptured);
    };
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // If session is still active on unmount, end it
      if (sessionState.isActive) {
        websocketService.endVisionSession().catch(error => {
          console.error('Error ending session on unmount:', error);
        });
      }
    };
  }, [sessionState.isActive]);

  return {
    sessionState,
    startSession,
    endSession,
    clearError,
    getSessionDuration,
  };
};

