import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface FabricAnalysis {
  title: string;
  description: string;
  uses: string;
  material: string;
  estimatedPrice: number;
}

export const analyzeFabricImage = async (base64Image: string): Promise<FabricAnalysis | null> => {
  try {
    console.log("Starting fabric image analysis...");
    
    // Check if API key is present
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.error("VITE_GEMINI_API_KEY is not set");
      return null;
    }

    // Using Gemini model for image analysis
    const model = 'gemini-2.5-flash';
    const prompt = `
      Analyze this fabric/textile image for a marketplace listing. 
      Return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
      {
        "title": "A creative, short title for the fabric (e.g., 'Indigo Organic Denim')",
        "description": "A concise description of texture, weave, and appearance (max 2 sentences)",
        "uses": "3 potential uses separated by commas (e.g., 'Jackets, Bags, Upholstery')",
        "material": "Best guess of material composition (e.g., '100% Cotton', 'Silk Blend')",
        "estimatedPrice": 500
      }
      
      The estimatedPrice should be a number (price per meter in INR) based on typical market rates.
      Return ONLY the JSON object, nothing else.
    `;

    console.log("Calling Gemini API with model:", model);

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
    });

    console.log("Received response from Gemini API");

    let text = response.text;
    if (!text) {
      console.error("No text in response");
      return null;
    }

    console.log("Raw response text:", text);

    // Clean up markdown formatting if present
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Remove any leading/trailing whitespace or newlines
    text = text.replace(/^\s+|\s+$/g, '');

    console.log("Cleaned text:", text);

    try {
      const data = JSON.parse(text);
      console.log("Parsed JSON successfully:", data);
      
      return {
        title: data.title || "Unknown Fabric",
        description: data.description || "No description available",
        uses: data.uses || "General use",
        material: data.material || "Mixed",
        estimatedPrice: typeof data.estimatedPrice === 'number' ? data.estimatedPrice : 500
      };
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Text that failed to parse:", text);
      
      // Return a fallback response
      return {
        title: "Analyzed Fabric",
        description: "Unable to parse detailed analysis. Please review the fabric manually.",
        uses: "General textile applications",
        material: "Mixed materials",
        estimatedPrice: 500
      };
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    console.error("Error details:", error.message);
    if (error.response) {
      console.error("Response data:", error.response);
    }
    return null;
  }
};