
import { GoogleGenAI, Type } from "@google/genai";
import { GameConfig, Obstacle } from "./types";

export const generateRaceTrack = async (difficulty: 'easy' | 'medium' | 'hard'): Promise<GameConfig> => {
  // Use Gemini to generate the track configuration
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Generate a level layout for a penguin racing game on a snow track. 
  Difficulty: ${difficulty}. 
  The track length should be around ${difficulty === 'easy' ? 3000 : difficulty === 'medium' ? 5000 : 8000} meters.
  Return a list of obstacles with their distance (meters from start), lane (0, 1, or 2), and type ('hole', 'seal', 'snowball').
  Ensure obstacles are spaced out fairly but become more frequent as the race progresses.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalDistance: { type: Type.INTEGER },
            obstacles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "one of 'hole', 'seal', 'snowball'" },
                  distance: { type: Type.INTEGER },
                  lane: { type: Type.INTEGER, description: "0, 1, or 2" }
                },
                required: ["type", "distance", "lane"]
              }
            }
          },
          required: ["totalDistance", "obstacles"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Add IDs to obstacles as required by the Obstacle interface
    const obstacles: Obstacle[] = (result.obstacles || []).map((obs: any, index: number) => ({
      ...obs,
      id: `obs-${index}-${Math.random().toString(36).substr(2, 9)}`
    }));

    return {
      totalDistance: result.totalDistance || (difficulty === 'easy' ? 3000 : difficulty === 'medium' ? 5000 : 8000),
      obstacles,
      difficulty
    };
  } catch (error) {
    console.error("Gemini track generation failed, falling back to local generation:", error);
    
    // Fallback logic
    const settings = {
      easy: { totalDistance: 3000, obstacleDensity: 0.05 },
      medium: { totalDistance: 5000, obstacleDensity: 0.08 },
      hard: { totalDistance: 8000, obstacleDensity: 0.12 }
    }[difficulty];

    const obstacles: Obstacle[] = [];
    const types: ('hole' | 'seal' | 'snowball')[] = ['hole', 'seal', 'snowball'];

    for (let d = 500; d < settings.totalDistance - 200; d += (100 / settings.obstacleDensity) * (0.8 + Math.random() * 0.4)) {
      const type = types[Math.floor(Math.random() * types.length)];
      const lane = Math.floor(Math.random() * 3);
      
      obstacles.push({
        id: `obs-${d}-${Math.random()}`,
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
  }
};
