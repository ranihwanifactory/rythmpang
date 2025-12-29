
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  score?: number;
}

export interface GameNote {
  id: string;
  lane: number;
  timestamp: number;
}

export interface GameConfig {
  bpm: number;
  songTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pattern: GameNote[];
}

export interface PlayerState {
  uid: string;
  name: string;
  score: number;
  combo: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
}

export interface RoomData {
  id: string;
  hostId: string;
  hostName: string;
  status: 'lobby' | 'playing';
  players: Record<string, PlayerState>;
  config: GameConfig | null;
  createdAt: number;
}
