const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey : "AIzaSyDngfQNgpo6rYpMAegGChYObI2s05H7sA0" });

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "give me foods and cusines in south india",
  });
  console.log(response.text);
}

main();