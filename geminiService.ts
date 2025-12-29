
import { GoogleGenAI, Type } from "@google/genai";
import { GameConfig, GameNote } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRhythmPattern = async (difficulty: 'easy' | 'medium' | 'hard'): Promise<GameConfig> => {
  const difficultyPrompt = {
    easy: "Simple patterns, 60-80 BPM, mostly on-beat notes.",
    medium: "Syncopated patterns, 100-120 BPM, occasional off-beats.",
    hard: "Fast-paced, 140-160 BPM, dense patterns and triplets."
  }[difficulty];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a fun rhythm game pattern JSON for a child. Difficulty: ${difficultyPrompt}. Output exactly 50 notes. Each note has a 'lane' (0, 1, 2, or 3) and a 'timestamp' (ms from start, increasing order).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bpm: { type: Type.NUMBER },
          songTitle: { type: Type.STRING },
          pattern: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                lane: { type: Type.NUMBER },
                timestamp: { type: Type.NUMBER }
              },
              required: ["lane", "timestamp"]
            }
          }
        },
        required: ["bpm", "songTitle", "pattern"]
      }
    }
  });

  const raw = JSON.parse(response.text || "{}");
  
  // Ensure IDs exist
  const pattern = (raw.pattern || []).map((n: any, idx: number) => ({
    ...n,
    id: `note-${idx}-${Date.now()}`
  })) as GameNote[];

  return {
    bpm: raw.bpm || 120,
    songTitle: raw.songTitle || "AI Melodies",
    difficulty,
    pattern
  };
};
