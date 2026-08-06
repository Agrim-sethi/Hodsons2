import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface FabricAnalysis {
  title: string;
  description: string;
  uses: string;
  material: string;
  estimatedPrice: number;
}

export const analyzeFabricImage = async (base64Image: string): Promise<FabricAnalysis | null> => {
  try {
    // Using the requested nano banana / flash image model
    const model = 'gemini-2.5-flash-image';
    const prompt = `
      Analyze this fabric image for a textile marketplace listing. 
      Return a VALID JSON object with the following fields:
      - title: A creative, short title (e.g., "Indigo Organic Denim").
      - description: A concise description of the texture, weave, and look (max 2 sentences).
      - uses: A comma-separated list of 3 potential uses (e.g., "Jackets, Bags, Upholstery").
      - material: Best guess of the material composition (e.g., "100% Cotton", "Silk Blend").
      - estimatedPrice: An estimated price per meter in INR based on typical market rates for this fabric type (number only).
      
      Return ONLY the raw JSON string. Do not include markdown code blocks or formatting.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', 
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
      // Note: responseMimeType is not supported for gemini-2.5-flash-image
    });

    let text = response.text;
    if (!text) return null;

    // Robust cleanup of markdown syntax if the model includes it
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const data = JSON.parse(text);
      return {
        title: data.title || "Unknown Fabric",
        description: data.description || "No description available",
        uses: data.uses || "General use",
        material: data.material || "Mixed",
        estimatedPrice: typeof data.estimatedPrice === 'number' ? data.estimatedPrice : 0
      };
    } catch (e) {
      console.error("Failed to parse JSON response", e);
      console.log("Raw text received:", text);
      return null;
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};