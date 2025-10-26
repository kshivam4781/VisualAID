import { useState, useCallback, useRef, useEffect } from 'react';

interface FrameCaptureState {
  isCapturing: boolean;
  lastCaptureTime: number | null;
  captureCount: number;
  error: string | null;
}

interface FrameCaptureOptions {
  intervalMs?: number;
  quality?: number; // 0-1 for JPEG quality
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png';
  onFrameCaptured?: (frameData: string, metadata: FrameMetadata) => void;
  onError?: (error: Error) => void;
}

interface FrameMetadata {
  timestamp: number;
  captureCount: number;
  width: number;
  height: number;
  format: string;
  size: number; // Size in bytes
}

const DEFAULT_OPTIONS: Required<FrameCaptureOptions> = {
  intervalMs: 5000, // 5 seconds
  quality: 0.7, // 70% quality for balance between size and clarity
  maxWidth: 640, // Optimize for API calls
  maxHeight: 480,
  format: 'jpeg',
  onFrameCaptured: () => {},
  onError: () => {},
};

export const useFrameCapture = (options: FrameCaptureOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<FrameCaptureState>({
    isCapturing: false,
    lastCaptureTime: null,
    captureCount: 0,
    error: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const captureCountRef = useRef<number>(0);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Capture a single frame from video element
  const captureFrame = useCallback((): string | null => {
    if (!videoElementRef.current || !canvasRef.current) {
      console.warn('Video element or canvas not ready');
      return null;
    }

    const video = videoElementRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.warn('Video not ready for capture');
      return null;
    }

    try {
      // Calculate dimensions while maintaining aspect ratio
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      let width = videoWidth;
      let height = videoHeight;

      // Scale down if needed
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = opts.maxWidth;
          height = width / aspectRatio;
        } else {
          height = opts.maxHeight;
          width = height * aspectRatio;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      // Use willReadFrequently for better performance when reading image data frequently
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Check if frame is blank (all black or all white)
      // Sample a small area to avoid performance issues
      const imageData = ctx.getImageData(0, 0, Math.min(50, width), Math.min(50, height));
      const pixels = imageData.data;
      let totalBrightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        totalBrightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
      }
      const avgBrightness = totalBrightness / (pixels.length / 4) / 3;
      
      // Reduced logging - only warn about significant issues
      if (avgBrightness < 10) {
        console.warn('⚠️ Frame too dark (brightness:', avgBrightness.toFixed(1), ')');
      } else if (avgBrightness > 245) {
        console.warn('⚠️ Frame overexposed (brightness:', avgBrightness.toFixed(1), ')');
      } else if (avgBrightness < 30) {
        console.warn('⚠️ Frame very dark (brightness:', avgBrightness.toFixed(1), ')');
      }
      // Removed normal brightness logging to reduce noise

      // Convert to base64
      const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = canvas.toDataURL(mimeType, opts.quality);

      // Calculate size
      const size = Math.round((base64Data.length * 3) / 4); // Approximate size in bytes

      // Increment capture count
      captureCountRef.current += 1;

      // Create metadata
      const metadata: FrameMetadata = {
        timestamp: Date.now(),
        captureCount: captureCountRef.current,
        width: Math.round(width),
        height: Math.round(height),
        format: opts.format,
        size,
      };

      // Update state
      setState(prev => ({
        ...prev,
        lastCaptureTime: Date.now(),
        captureCount: captureCountRef.current,
        error: null,
      }));

      // Call callback
      opts.onFrameCaptured(base64Data, metadata);

      // Reduced logging - only log every 5th frame or important frames
      if (metadata.captureCount % 5 === 0 || size > 100000) {
        console.log(`Frame captured: ${metadata.captureCount}, Size: ${(size / 1024).toFixed(2)}KB`);
      }

      return base64Data;

    } catch (error) {
      const err = error as Error;
      console.error('Frame capture error:', err);
      setState(prev => ({ ...prev, error: err.message }));
      opts.onError(err);
      return null;
    }
  }, [opts]);

  // Start capturing frames at intervals
  const startCapture = useCallback((videoElement: HTMLVideoElement) => {
    if (!videoElement) {
      console.error('Video element is required to start capture');
      return false;
    }

    videoElementRef.current = videoElement;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset capture count
    captureCountRef.current = 0;

    setState(prev => ({
      ...prev,
      isCapturing: true,
      error: null,
      captureCount: 0,
    }));

    // Capture first frame after video stabilizes and gets proper exposure
    // Wait longer for first frame to ensure good lighting/focus
    setTimeout(() => {
      console.log('⏰ First frame timer - attempting capture...');
      captureFrame();
    }, 3000); // Wait 3 seconds for video to fully adjust exposure and stabilize

    // Set up interval for subsequent captures
    intervalRef.current = setInterval(() => {
      captureFrame();
    }, opts.intervalMs);

    console.log(`Frame capture started: interval ${opts.intervalMs}ms`);
    return true;
  }, [captureFrame, opts.intervalMs]);

  // Stop capturing frames
  const stopCapture = useCallback(() => {
    const wasCapturing = intervalRef.current !== null;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isCapturing: false,
    }));

    // Only log if we were actually capturing
    if (wasCapturing) {
      console.log('Frame capture stopped');
    }
  }, []);

  // Manual single frame capture
  const captureSingleFrame = useCallback(() => {
    return captureFrame();
  }, [captureFrame]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
      if (canvasRef.current) {
        canvasRef.current = null;
      }
    };
  }, [stopCapture]);

  // Handle immediate frame capture request
  const captureImmediateFrame = useCallback((socket: any, sessionId: string, reason: string) => {
    console.log(`📸 IMMEDIATE capture requested - Reason: ${reason}`);
    
    if (!videoElementRef.current || !canvasRef.current) {
      console.warn('Video element or canvas not ready for immediate capture');
      return;
    }

    const frameData = captureFrame();
    if (frameData) {
      const metadata = {
        captureCount: captureCountRef.current,
        timestamp: Date.now(),
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        format: opts.format,
        size: Math.round((frameData.length * 3) / 4),
        reason: reason,
        priority: 'high'
      };

      console.log(`📤 Sending immediate frame to backend...`);
      socket.emit('frame:capture_now', {
        sessionId,
        frameData,
        metadata,
        timestamp: Date.now(),
        reason: reason
      });
    }
  }, [captureFrame, opts.format]);

  return {
    state,
    startCapture,
    stopCapture,
    captureSingleFrame,
    captureImmediateFrame,
    clearError,
  };
};

