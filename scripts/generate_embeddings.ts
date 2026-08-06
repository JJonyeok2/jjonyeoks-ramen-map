import { RAMEN_SHOPS } from "../app/ramen-data";
import fs from "fs";

// .env 셋업
import { config } from "dotenv";
config({ path: ".env.local" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("No OPENAI_API_KEY found in .env.local");
  process.exit(1);
}

// 매장 데이터를 하나의 문자열로 결합하는 헬퍼 함수
function generateShopText(shop: any) {
  const parts = [
    `Name: ${shop.name}`,
    `Location: ${shop.region} ${shop.district}`,
    `Tags: ${shop.tags?.join(", ") || ""}`,
    `Types: ${shop.types?.join(", ") || ""}`,
    `Broth Style: ${shop.brothStyle || ""}`,
    `Signature Menu: ${shop.signature || ""}`,
    `Price: ${shop.price || ""} KRW`,
    `Spiciness: ${shop.spiciness || 0}`,
    `Body(Richness): ${shop.body || 0}`,
    `Bases: ${shop.bases?.join(", ") || ""}`,
    `Description: ${shop.description || ""}`
  ];
  return parts.filter(p => p).join(" | ");
}

async function generateEmbeddings() {
  console.log(`Starting embedding generation for ${RAMEN_SHOPS.length} shops...`);
  
  const embeddingsData = [];
  
  // OpenAI API limit 주의: 한 번에 여러 개를 보낼 수 있음
  const BATCH_SIZE = 100; 
  for (let i = 0; i < RAMEN_SHOPS.length; i += BATCH_SIZE) {
    const batch = RAMEN_SHOPS.slice(i, i + BATCH_SIZE);
    const texts = batch.map(shop => generateShopText(shop));
    
    console.log(`Processing batch ${i / BATCH_SIZE + 1} (${texts.length} items)...`);
    
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: texts,
        model: "text-embedding-3-small"
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI API error:", err);
      process.exit(1);
    }
    
    const data = await response.json();
    
    for (let j = 0; j < batch.length; j++) {
      embeddingsData.push({
        id: batch[j].id,
        embedding: data.data[j].embedding
      });
    }
  }
  
  fs.writeFileSync("app/embeddings.json", JSON.stringify(embeddingsData));
  console.log(`Successfully saved ${embeddingsData.length} embeddings to app/embeddings.json!`);
}

generateEmbeddings().catch(console.error);
