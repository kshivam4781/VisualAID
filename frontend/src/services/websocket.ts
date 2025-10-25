import { io, Socket } from 'socket.io-client';

interface FrameData {
  sessionId: string;
  userId?: string;
  frameData: string; // base64 encoded image
  timestamp: number;
  metadata: {
    captureCount: number;
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

interface FrameResponse {
  success: boolean;
  frameId?: string;
  captureCount?: number;
  filePath?: string;
  sessionId?: string;
  message?: string;
  analysis?: any; // Future: Gemini analysis
  immediateAck?: string; // ⚡ NEW: Instant acknowledgement text
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private sessionId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Generate unique session ID (UUID v4 format)
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Connect to WebSocket server
  connect(serverUrl: string = 'http://localhost:3000'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket && this.isConnected) {
          console.log('WebSocket already connected');
          resolve(true);
          return;
        }

        console.log(`Connecting to WebSocket server: ${serverUrl}`);

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
        });

        // Connection success
        this.socket.on('connect', () => {
          console.log('✅ WebSocket connected:', this.socket?.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error.message);
          this.isConnected = false;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Max reconnection attempts reached'));
          } else {
            this.reconnectAttempts++;
          }
        });

        // Disconnection
        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnected = false;
        });

        // Reconnection attempt
        this.socket.on('reconnect_attempt', (attempt) => {
          console.log(`Reconnection attempt ${attempt}...`);
        });

        // Reconnection success
        this.socket.on('reconnect', (attempt) => {
          console.log(`Reconnected after ${attempt} attempts`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
        });

        // Reconnection failed
        this.socket.on('reconnect_failed', () => {
          console.error('Failed to reconnect to WebSocket server');
          reject(new Error('Reconnection failed'));
        });

      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Send frame to backend
  sendFrame(frameData: string, metadata: any): Promise<FrameResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const payload: FrameData = {
        sessionId: this.sessionId!,
        frameData,
        timestamp: Date.now(),
        metadata,
      };

      // Emit frame capture event
      this.socket.emit('frame:capture', payload, (response: FrameResponse) => {
        if (response.success) {
          console.log(`Frame sent successfully: #${response.captureCount || response.frameId || 'unknown'} - Saved to ${response.filePath || 'server'}`);
          resolve(response);
        } else {
          console.error('Frame send failed:', response.message);
          reject(new Error(response.message || 'Failed to send frame'));
        }
      });
    });
  }

  // Send voice command
  sendVoiceCommand(command: string, confidence: number): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send voice command: WebSocket not connected');
      return;
    }

    this.socket.emit('voice:command', {
      sessionId: this.sessionId,
      command,
      confidence,
      timestamp: Date.now(),
    });
  }

  // ⚡ Send instant acknowledgement text for immediate TTS playback
  sendInstantAck(text: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send instant ack: WebSocket not connected');
      return;
    }

    this.socket.emit('realtime:instant_ack', {
      sessionId: this.sessionId,
      text,
      timestamp: Date.now(),
    });
  }

  // Start vision session
  startVisionSession(userId?: string, metadata?: any): Promise<{ sessionId: string; success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        console.warn('Cannot start session: WebSocket not connected');
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Generate new session ID for each session
      this.sessionId = this.generateSessionId();

      const sessionData = {
        sessionId: this.sessionId,
        userId,
        timestamp: Date.now(),
        metadata: metadata || {
          userAgent: navigator.userAgent,
          startedFrom: 'voice_command'
        }
      };

      this.socket.emit('session:start', sessionData);

      // Listen for confirmation
      this.socket.once('session:started', (response) => {
        if (response.success) {
          console.log('✅ Vision session started:', this.sessionId);
          resolve({ sessionId: this.sessionId!, success: true });
        } else {
          reject(new Error('Failed to start session'));
        }
      });

      console.log('🚀 Starting vision session:', this.sessionId);
    });
  }

  // End vision session
  endVisionSession(): Promise<{ sessionId: string; success: boolean; frameCount: number }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        console.warn('Cannot end session: WebSocket not connected');
        reject(new Error('WebSocket not connected'));
        return;
      }

      if (!this.sessionId) {
        console.warn('No active session to end');
        reject(new Error('No active session'));
        return;
      }

      const sessionData = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
      };

      this.socket.emit('session:end', sessionData);

      // Listen for confirmation
      this.socket.once('session:ended', (response) => {
        if (response.success) {
          const frameCount = response.frameCount || 0;
          console.log(`🛑 Vision session ended: ${this.sessionId?.substring(0, 8)}... (${frameCount} frame${frameCount !== 1 ? 's' : ''} captured)`);
          resolve({ 
            sessionId: response.sessionId, 
            success: true,
            frameCount: frameCount
          });
        } else {
          reject(new Error('Failed to end session'));
        }
      });

      console.log('🛑 Ending vision session:', this.sessionId);
    });
  }

  // Listen to server events
  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      console.warn('Cannot listen to events: WebSocket not initialized');
      return;
    }

    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event: string, callback?: (data: any) => void): void {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Reset session ID (for new sessions)
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    console.log('🔄 Session reset:', this.sessionId);
  }

  // Get active session info
  getActiveSession(): { sessionId: string | null; isActive: boolean } {
    return {
      sessionId: this.sessionId,
      isActive: this.isConnected && this.sessionId !== null
    };
  }

  // Get socket instance (for advanced usage like Realtime API)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export type { FrameData, FrameResponse };

