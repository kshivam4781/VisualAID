import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

/**
 * 🎤 OpenAI Realtime Audio Hook
 * 
 * Handles audio capture, streaming to OpenAI Realtime API,
 * and playback of AI voice responses.
 */

interface RealtimeAudioConfig {
  socket: Socket | null;
  sessionId: string | null;
  enabled: boolean;
}

interface RealtimeAudioState {
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  userTranscript: string;
  aiTranscript: string;
  error: string | null;
}

export const useRealtimeAudio = ({ socket, sessionId, enabled }: RealtimeAudioConfig) => {
  const [state, setState] = useState<RealtimeAudioState>({
    isConnected: false,
    isRecording: false,
    isPlaying: false,
    userTranscript: '',
    aiTranscript: '',
    error: null
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  /**
   * 🎙️ Initialize audio capture
   */
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎙️ Initializing audio for Realtime API...');

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // ✅ IMPROVED: Better audio constraints for Google-quality recognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          // ✅ CRITICAL: These three settings dramatically improve speech recognition
          echoCancellation: true,    // Remove speaker feedback
          noiseSuppression: true,    // Reduce background noise
          autoGainControl: true,     // Normalize volume levels
          
          // ✅ NEW: Additional constraints for even better quality
          googEchoCancellation: true,      // Google's echo cancellation
          googNoiseSuppression: true,      // Google's noise suppression
          googAutoGainControl: true,       // Google's automatic gain control
          googHighpassFilter: true,        // Remove low-frequency noise
          googTypingNoiseDetection: true,  // Detect keyboard/mouse clicks
          googAudioMirroring: false,       // No audio mirroring
          
          // Additional browser-specific optimizations
          latency: 0,                      // Minimum latency
        }
      });

      mediaStreamRef.current = stream;

      // Create audio source and processor
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorNodeRef.current = processor;

      // Process audio chunks
      processor.onaudioprocess = (e) => {
        if (!enabled || !sessionId || !socket) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // ✅ IMPROVED: Better audio processing with noise gate
        // Apply noise gate to reduce background noise further
        const noiseGateThreshold = 0.01; // Only process audio above this threshold
        let maxAmplitude = 0;
        for (let i = 0; i < inputData.length; i++) {
          if (Math.abs(inputData[i]) > maxAmplitude) {
            maxAmplitude = Math.abs(inputData[i]);
          }
        }
        
        // Only process if audio is above noise gate
        if (maxAmplitude < noiseGateThreshold) {
          return; // Silence detected, skip this chunk
        }
        
        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(pcm16.buffer))
        );

        // Send to backend
        socket.emit('realtime:audio', {
          sessionId,
          audio: base64Audio
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      setState(prev => ({ ...prev, isRecording: true }));
      console.log('✅ Audio capture initialized with enhanced settings');

    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please grant permission.' 
      }));
    }
  }, [socket, sessionId, enabled]);

  /**
   * 🔊 Play audio response from AI
   */
  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 to PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      
      // Add to queue
      audioQueueRef.current.push(pcm16);

      // Start playback if not already playing
      if (!isPlayingRef.current) {
        playNextChunk();
      }

    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
    }
  }, []);

  /**
   * 🎵 Play next audio chunk from queue
   */
  const playNextChunk = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    isPlayingRef.current = true;
    setState(prev => ({ ...prev, isPlaying: true }));

    const pcm16 = audioQueueRef.current.shift()!;
    
    // Convert PCM16 to Float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    // Create audio buffer
    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      float32.length,
      24000
    );
    audioBuffer.getChannelData(0).set(float32);

    // Play the buffer
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      playNextChunk();
    };

    source.start();
  };

  /**
   * 🎤 Start Realtime session
   */
  const startRealtime = useCallback(async () => {
    if (!socket || !sessionId) {
      console.warn('⚠️ Cannot start Realtime - socket or sessionId missing');
      return;
    }

    try {
      console.log('🎤 Starting OpenAI Realtime session...');
      
      // Request backend to start Realtime session
      socket.emit('realtime:start', { sessionId });

      // Initialize audio capture
      await initializeAudio();

    } catch (error) {
      console.error('❌ Failed to start Realtime:', error);
      setState(prev => ({ ...prev, error: 'Failed to start Realtime session' }));
    }
  }, [socket, sessionId, initializeAudio]);

  /**
   * 🔌 Stop Realtime session
   */
  const stopRealtime = useCallback(() => {
    // Only log and clean up if something is actually active
    const hasActiveResources = processorNodeRef.current || mediaStreamRef.current || audioContextRef.current;
    
    if (hasActiveResources) {
      console.log('🔌 Stopping OpenAI Realtime session...');
    }

    // Stop audio capture
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Notify backend
    if (socket && sessionId) {
      socket.emit('realtime:stop', { sessionId });
    }

    setState({
      isConnected: false,
      isRecording: false,
      isPlaying: false,
      userTranscript: '',
      aiTranscript: '',
      error: null
    });
  }, [socket, sessionId]);

  /**
   * 📡 Set up socket event listeners
   */
  useEffect(() => {
    if (!socket || !enabled) return;

    // Realtime connected
    socket.on('realtime:connected', (data) => {
      if (data.sessionId === sessionId) {
        console.log('✅ Realtime session connected');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      }
    });

    // Realtime disconnected
    socket.on('realtime:disconnected', (data) => {
      if (data.sessionId === sessionId) {
        console.log('🔌 Realtime session disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
      }
    });

    // User transcript (what user said)
    socket.on('realtime:user_transcript', (data) => {
      if (data.sessionId === sessionId) {
        console.log('🎤 User:', data.transcript);
        setState(prev => ({ ...prev, userTranscript: data.transcript }));
      }
    });

    // AI transcript delta (AI speaking - streaming)
    socket.on('realtime:ai_transcript_delta', (data) => {
      if (data.sessionId === sessionId) {
        setState(prev => ({ 
          ...prev, 
          aiTranscript: prev.aiTranscript + data.delta 
        }));
      }
    });

    // AI transcript complete
    socket.on('realtime:ai_transcript', (data) => {
      if (data.sessionId === sessionId) {
        console.log('🤖 AI:', data.transcript);
        setState(prev => ({ ...prev, aiTranscript: data.transcript }));
      }
    });

    // Audio delta (AI voice response)
    socket.on('realtime:audio_delta', (data) => {
      if (data.sessionId === sessionId) {
        playAudioChunk(data.audio);
      }
    });

    // Audio done
    socket.on('realtime:audio_done', (data) => {
      if (data.sessionId === sessionId) {
        console.log('✅ AI audio response complete');
      }
    });

    // Error
    socket.on('realtime:error', (data) => {
      if (data.sessionId === sessionId) {
        console.error('❌ Realtime error:', data.error);
        setState(prev => ({ ...prev, error: data.error }));
      }
    });

    return () => {
      socket.off('realtime:connected');
      socket.off('realtime:disconnected');
      socket.off('realtime:user_transcript');
      socket.off('realtime:ai_transcript_delta');
      socket.off('realtime:ai_transcript');
      socket.off('realtime:audio_delta');
      socket.off('realtime:audio_done');
      socket.off('realtime:error');
    };
  }, [socket, sessionId, enabled, playAudioChunk]);

  /**
   * 🧹 Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRealtime();
    };
  }, [stopRealtime]);

  return {
    ...state,
    startRealtime,
    stopRealtime
  };
};

