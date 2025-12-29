
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAntarcticFact(playerAction: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are Pingo, a cute and friendly penguin guide for kids. A player just performed this action: "${playerAction}". Give them a fun 1-sentence Antarctic fact or a word of encouragement in a cute tone. Use emojis!`,
      config: {
        // Removed maxOutputTokens as it's optional and requires thinkingBudget when used with Gemini 3 models
      }
    });
    return response.text || "Keep going, explorer! 🐧❄️";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Antarctic wind is strong today! Stay warm! ❄️";
  }
}

export async function generateQuiz() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a simple Antarctic multiple choice question for elementary kids. Return as JSON with question, options (A, B, C), and correct answer.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return {
      question: "Which bird lives in Antarctica?",
      options: ["Parrot", "Penguin", "Eagle"],
      correctAnswer: "Penguin"
    };
  }
}
