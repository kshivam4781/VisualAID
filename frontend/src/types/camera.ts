// Camera system types for video capture

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  hasPermission: boolean | null;
  error: string | null;
  stream: MediaStream | null;
  deviceId: string | null;
}

export interface CameraConfig {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export type CameraError = 
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'NOT_READABLE'
  | 'OVERCONSTRAINED'
  | 'TYPE_ERROR'
  | 'UNKNOWN_ERROR';

export interface CameraErrorDetails {
  type: CameraError;
  message: string;
  userMessage: string;
}

