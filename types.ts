
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface Player extends UserProfile {
  score: number;
  position: number; // 진행 거리 (0~1000)
  isReady: boolean;
  status: 'playing' | 'finished' | 'failed';
  finishTime?: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Record<string, Player>;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}
