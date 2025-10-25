import { useState, useCallback, useRef, useMemo } from 'react';

export interface AudioQueueItem {
  id: string;
  audioData: string; // base64 or blob URL
  type: 'base64' | 'url' | 'tts';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  text?: string; // For TTS requests
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface AudioQueueState {
  isPlaying: boolean;
  currentItem: AudioQueueItem | null;
  queueLength: number;
  error: string | null;
}

/**
 * 🔊 Centralized Audio Queue Manager
 * 
 * Manages ALL audio playback in the app:
 * - Frame descriptions from backend
 * - TTS responses 
 * - User question answers
 * 
 * Features:
 * - Priority-based queue (urgent > high > normal > low)
 * - Interrupt support for urgent messages
 * - Single audio element to prevent overlaps
 * - Always listening for new commands
 */
export const useAudioQueue = () => {
  const [state, setState] = useState<AudioQueueState>({
    isPlaying: false,
    currentItem: null,
    queueLength: 0,
    error: null
  });

  const queueRef = useRef<AudioQueueItem[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);

  /**
   * 🛑 Stop current audio immediately
   */
  const stopCurrent = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  /**
   * 🗑️ Clear queue by priority
   */
  const clearQueue = useCallback((minPriority: 'urgent' | 'high' | 'normal' | 'low' = 'low') => {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const minLevel = priorityOrder[minPriority];
    
    queueRef.current = queueRef.current.filter(item => {
      const itemLevel = priorityOrder[item.priority];
      return itemLevel >= minLevel;
    });
    
    setState(prev => ({ ...prev, queueLength: queueRef.current.length }));
  }, []);

  /**
   * ➕ Add audio to queue
   */
  const enqueue = useCallback(async (item: AudioQueueItem) => {
    console.log(`🎵 Enqueuing audio: ${item.id} (priority: ${item.priority})`);

    // If urgent, stop current and clear non-urgent queue
    if (item.priority === 'urgent') {
      console.log('🚨 URGENT audio - stopping current and clearing queue');
      stopCurrent();
      clearQueue('high'); // Keep only urgent and high priority items
      isProcessingRef.current = false;
    }

    // Add to queue based on priority
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const insertIndex = queueRef.current.findIndex(
      queueItem => priorityOrder[queueItem.priority] < priorityOrder[item.priority]
    );

    if (insertIndex === -1) {
      queueRef.current.push(item);
    } else {
      queueRef.current.splice(insertIndex, 0, item);
    }

    setState(prev => ({ ...prev, queueLength: queueRef.current.length }));

    // Start processing if not already
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [stopCurrent, clearQueue]);

  /**
   * 🎵 Process queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('⏸️ Already processing queue');
      return;
    }

    if (queueRef.current.length === 0) {
      console.log('✅ Queue empty');
      setState(prev => ({ ...prev, isPlaying: false, currentItem: null, queueLength: 0 }));
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;
    const item = queueRef.current.shift()!;
    
    console.log(`▶️  Playing audio: ${item.id} (${queueRef.current.length} remaining)`);
    
    setState(prev => ({ 
      ...prev, 
      isPlaying: true, 
      currentItem: item,
      queueLength: queueRef.current.length 
    }));

    try {
      item.onStart?.();

      let audioUrl: string;
      let shouldRevoke = false;

      // Handle different audio types
      if (item.type === 'base64') {
        // Convert base64 to blob URL
        const audioData = atob(item.audioData);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
        shouldRevoke = true;
      } else if (item.type === 'tts') {
        // Make TTS API call
        const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${serverUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: item.text, speed: 1.0 })
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        shouldRevoke = true;
      } else {
        // Already a URL
        audioUrl = item.audioData;
      }

      // Play audio
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          if (shouldRevoke) URL.revokeObjectURL(audioUrl);
          console.log(`✅ Finished playing: ${item.id}`);
          item.onEnd?.();
          resolve();
        };

        audio.onerror = (err) => {
          if (shouldRevoke) URL.revokeObjectURL(audioUrl);
          console.error(`❌ Audio error: ${item.id}`, err);
          item.onError?.(err);
          reject(err);
        };

        audio.play().catch(reject);
      });

    } catch (error: any) {
      console.error(`❌ Error playing audio: ${item.id}`, error);
      setState(prev => ({ ...prev, error: error.message }));
      item.onError?.(error);
    }

    // Continue processing
    currentAudioRef.current = null;
    isProcessingRef.current = false;
    
    // Process next item
    processQueue();
  }, []);

  /**
   * 🔊 Convenience method: Speak text via TTS
   */
  const speak = useCallback((text: string, priority: AudioQueueItem['priority'] = 'normal') => {
    return enqueue({
      id: `tts-${Date.now()}`,
      audioData: '',
      type: 'tts',
      priority,
      text
    });
  }, [enqueue]);

  /**
   * 🎵 Convenience method: Play base64 audio
   */
  const playBase64 = useCallback((
    base64Audio: string, 
    id: string, 
    priority: AudioQueueItem['priority'] = 'normal'
  ) => {
    return enqueue({
      id,
      audioData: base64Audio,
      type: 'base64',
      priority
    });
  }, [enqueue]);

  /**
   * 🛑 Stop all audio and clear queue
   */
  const stopAll = useCallback(() => {
    const hadQueue = queueRef.current.length > 0 || isProcessingRef.current;
    
    // Only log if there was actually audio playing or queued
    if (hadQueue) {
      console.log('🛑 Stopping all audio');
    }
    
    stopCurrent();
    queueRef.current = [];
    isProcessingRef.current = false;
    setState({
      isPlaying: false,
      currentItem: null,
      queueLength: 0,
      error: null
    });
  }, [stopCurrent]);

  // Memoize return object to prevent re-renders
  return useMemo(() => ({
    state,
    enqueue,
    speak,
    playBase64,
    stopCurrent,
    stopAll,
    clearQueue
  }), [state, enqueue, speak, playBase64, stopCurrent, stopAll, clearQueue]);
};

