import { useState, useCallback, useRef, useEffect } from 'react';
import type { CameraState, CameraConfig, CameraErrorDetails } from '../types/camera';

interface UseCameraAccessProps {
  config?: CameraConfig;
  onError?: (error: CameraErrorDetails) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const DEFAULT_CONFIG: CameraConfig = {
  width: 1280,
  height: 720,
  facingMode: 'environment', // Use back camera by default for vision assistance
  frameRate: 30,
};

const getCameraError = (error: Error): CameraErrorDetails => {
  const name = error.name as string;
  
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      type: 'PERMISSION_DENIED',
      message: error.message,
      userMessage: 'Camera permission was denied. Please allow camera access to use vision mode.',
    };
  }
  
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      type: 'NOT_FOUND',
      message: error.message,
      userMessage: 'No camera found on your device. Please connect a camera to use vision mode.',
    };
  }
  
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      type: 'NOT_READABLE',
      message: error.message,
      userMessage: 'Camera is already in use by another application. Please close other apps using the camera.',
    };
  }
  
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      type: 'OVERCONSTRAINED',
      message: error.message,
      userMessage: 'Camera settings are not compatible with your device. Using default settings.',
    };
  }
  
  if (name === 'TypeError') {
    return {
      type: 'TYPE_ERROR',
      message: error.message,
      userMessage: 'Invalid camera configuration. Please try again.',
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: error.message,
    userMessage: 'An unknown error occurred while accessing the camera. Please try again.',
  };
};

export const useCameraAccess = ({
  config = DEFAULT_CONFIG,
  onError,
  onPermissionGranted,
  onPermissionDenied,
}: UseCameraAccessProps = {}) => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isLoading: false,
    hasPermission: null,
    error: null,
    stream: null,
    deviceId: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Request camera permission and start stream
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      setCameraState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      // Create constraints
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
          facingMode: config.facingMode,
          frameRate: { ideal: config.frameRate },
        },
        audio: false, // No audio needed for vision assistance
      };

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Get device ID from stream
      const videoTrack = stream.getVideoTracks()[0];
      const deviceId = videoTrack.getSettings().deviceId || null;

      setCameraState({
        isActive: true,
        isLoading: false,
        hasPermission: true,
        error: null,
        stream,
        deviceId,
      });

      onPermissionGranted?.();
      return true;

    } catch (error) {
      const cameraError = getCameraError(error as Error);
      
      setCameraState(prev => ({
        ...prev,
        isActive: false,
        isLoading: false,
        hasPermission: cameraError.type === 'PERMISSION_DENIED' ? false : prev.hasPermission,
        error: cameraError.userMessage,
        stream: null,
        deviceId: null,
      }));

      onError?.(cameraError);
      
      if (cameraError.type === 'PERMISSION_DENIED') {
        onPermissionDenied?.();
      }

      console.error('Camera access error:', cameraError);
      return false;
    }
  }, [config, onError, onPermissionGranted, onPermissionDenied]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState(prev => ({
      ...prev,
      isActive: false,
      stream: null,
    }));
  }, []);

  // Toggle camera on/off
  const toggleCamera = useCallback(async (): Promise<boolean> => {
    if (cameraState.isActive) {
      stopCamera();
      return false;
    } else {
      return await startCamera();
    }
  }, [cameraState.isActive, startCamera, stopCamera]);

  // Attach stream to video element
  const attachToVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;

    videoRef.current = videoElement;

    if (streamRef.current && cameraState.isActive) {
      videoElement.srcObject = streamRef.current;
      videoElement.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [cameraState.isActive]);

  // Clear error
  const clearError = useCallback(() => {
    setCameraState(prev => ({ ...prev, error: null }));
  }, []);

  // Check camera permission status (Permissions API)
  const checkPermission = useCallback(async (): Promise<boolean | null> => {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        return null; // Permissions API not supported
      }

      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      const hasPermission = result.state === 'granted';
      setCameraState(prev => ({ ...prev, hasPermission }));
      
      return hasPermission;
    } catch (error) {
      console.warn('Could not check camera permission:', error);
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    cameraState,
    startCamera,
    stopCamera,
    toggleCamera,
    attachToVideo,
    clearError,
    checkPermission,
  };
};

