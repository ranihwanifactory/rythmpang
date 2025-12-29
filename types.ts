
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface Player extends UserProfile {
  score: number;
  position: number;
  isReady: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Record<string, Player>;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  currentTurn?: string;
}

export interface GameMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}
