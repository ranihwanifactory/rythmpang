
export interface Player {
  uid: string;
  name: string;
  photoURL?: string;
  score: number;
  isReady: boolean;
  lastReactionTime?: number;
}

export interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'results';
  startTime?: number;
  currentRound: number;
  totalRounds: number;
  targetTime?: number; // When the target appears
  winnerUid?: string;
}

export interface Room {
  id: string;
  hostId: string;
  roomName: string;
  players: Record<string, Player>;
  game: GameState;
  createdAt: number;
}

export enum GamePhase {
  IDLE = 'IDLE',
  WAITING_FOR_GREEN = 'WAITING_FOR_GREEN',
  CLICK_NOW = 'CLICK_NOW',
  FINISHED = 'FINISHED'
}
