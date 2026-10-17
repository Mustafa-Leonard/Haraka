// Socket.IO event types for real-time communication

export interface LocationUpdateEvent {
  riderId: string;
  jobId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

export interface JobStatusUpdateEvent {
  jobId: string;
  status: string;
  riderId?: string | null;
  updatedAt: string;
}

export interface RiderArrivingEvent {
  jobId: string;
  riderId: string;
  estimatedMinutes?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastSeen: string | null;
}
