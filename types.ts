
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface Obstacle {
  id: string;
  type: 'hole' | 'seal' | 'snowball';
  distance: number; // Distance from start (meters)
  lane: number; // 0, 1, 2
}

export interface GameConfig {
  totalDistance: number;
  obstacles: Obstacle[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PlayerState {
  uid: string;
  name: string;
  distance: number; // Current distance covered
  lane: number; // Current lane (0, 1, 2)
  speed: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  finishTime?: number;
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
