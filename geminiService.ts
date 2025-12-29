
import { GameConfig, GameNote } from "./types";

const SONG_TITLES = [
  "Neon Starlight",
  "Cyber Jump",
  "Pixel Party",
  "Galaxy Bounce",
  "Synthwave Dreams",
  "Electric Pulse",
  "Retro Runner",
  "Digital Disco"
];

export const generateRhythmPattern = async (difficulty: 'easy' | 'medium' | 'hard'): Promise<GameConfig> => {
  // Simulate a short loading delay for "generation" feel
  await new Promise(resolve => setTimeout(resolve, 800));

  const songTitle = SONG_TITLES[Math.floor(Math.random() * SONG_TITLES.length)];
  
  const settings = {
    easy: { bpm: 80, interval: 600, noteCount: 40, multiChance: 0 },
    medium: { bpm: 120, interval: 400, noteCount: 60, multiChance: 0.15 },
    hard: { bpm: 160, interval: 250, noteCount: 100, multiChance: 0.3 }
  }[difficulty];

  const pattern: GameNote[] = [];
  let currentTimestamp = 1500; // Start delay

  for (let i = 0; i < settings.noteCount; i++) {
    // Generate primary note
    const lane = Math.floor(Math.random() * 4);
    pattern.push({
      id: `note-${i}-${Date.now()}`,
      lane,
      timestamp: currentTimestamp
    });

    // Chance for double notes on harder difficulties
    if (Math.random() < settings.multiChance) {
      let secondLane = Math.floor(Math.random() * 4);
      if (secondLane === lane) secondLane = (lane + 1) % 4;
      pattern.push({
        id: `note-${i}-multi-${Date.now()}`,
        lane: secondLane,
        timestamp: currentTimestamp
      });
    }

    // Advance time - add slight randomness to spacing
    const variance = (Math.random() - 0.5) * (settings.interval * 0.2);
    currentTimestamp += settings.interval + variance;
  }

  return {
    bpm: settings.bpm,
    songTitle,
    difficulty,
    pattern
  };
};
