
import { GameConfig, Obstacle } from "./types";

export const generateRaceTrack = async (difficulty: 'easy' | 'medium' | 'hard'): Promise<GameConfig> => {
  // AI 없이 로컬에서 즉시 생성 (사용자 경험을 위해 짧은 지연 추가)
  await new Promise(resolve => setTimeout(resolve, 500));

  const settings = {
    easy: { totalDistance: 3000, obstacleDensity: 0.05 },
    medium: { totalDistance: 5000, obstacleDensity: 0.08 },
    hard: { totalDistance: 8000, obstacleDensity: 0.12 }
  }[difficulty];

  const obstacles: Obstacle[] = [];
  const types: ('hole' | 'seal' | 'snowball')[] = ['hole', 'seal', 'snowball'];

  // 500m 지점부터 본격적인 장애물 배치
  for (let d = 400; d < settings.totalDistance - 300; d += (100 / settings.obstacleDensity) * (0.7 + Math.random() * 0.6)) {
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    
    obstacles.push({
      id: `obs-${d}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      distance: Math.floor(d),
      lane
    });
  }

  return {
    totalDistance: settings.totalDistance,
    obstacles,
    difficulty
  };
};
