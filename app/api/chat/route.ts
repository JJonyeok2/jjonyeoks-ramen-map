import { NextResponse } from "next/server";
import { RAMEN_SHOPS } from "../../ramen-data";
import { recommendShops, analyzeRecommendationIntent, distanceBetweenKm } from "../../recommendation";
import embeddingsData from "../../embeddings.json";

export const dynamic = "force-dynamic";

// Cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getEmbeddings() {
  return embeddingsData as any[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      prompt?: string;
      userLocation?: { lat: number; lng: number } | null;
      activeRegion?: string;
    };

    const prompt = body.prompt?.trim() || "";
    if (!prompt) {
      return NextResponse.json({ error: "프롬프트를 입력해 주세요." }, { status: 400 });
    }

    const userLocation = body.userLocation || null;
    const activeRegion = (body.activeRegion || "전국") as any;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        // 0. OpenAI Moderation API (욕설, 혐오 표현 등 원천 차단)
        const modRes = await fetch("https://api.openai.com/v1/moderations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ input: prompt })
        });
        if (modRes.ok) {
          const modData = await modRes.json();
          if (modData.results[0].flagged) {
            return NextResponse.json({
              source: "moderation",
              result: {
                emotion_detected: "general",
                reply_text: "죄송하지만 부적절한 단어나 표현이 감지되었어요. 😅 바르고 고운 말로 라멘에 대한 이야기를 나눠볼까요? 🍜",
                recommendations: []
              }
            });
          }
        }

        // 1. Parse Intent for Hybrid Search
        const intent = analyzeRecommendationIntent(prompt);

        // 2. Generate Embedding for Prompt
        const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: prompt,
            model: "text-embedding-3-small"
          })
        });

        if (!embedRes.ok) throw new Error("Embedding API failed");
        const embedData = await embedRes.json();
        const userVector = embedData.data[0].embedding;

        // 3. Load Embeddings
        const embeddings = getEmbeddings();
        if (!embeddings || embeddings.length === 0) throw new Error("No embeddings found");

        // 4. Calculate Scores (Hybrid Search)
        const candidates = RAMEN_SHOPS.map(shop => {
          // Hard Filters
          if (intent.vegetarian && !shop.vegetarian) return null;
          if (intent.avoidPork && shop.containsPork) return null;
          if (intent.dayOfWeek && shop.closed.includes(intent.dayOfWeek)) return null;
          
          if (intent.mentionedRegion && !shop.region.includes(intent.mentionedRegion) && !shop.district.includes(intent.mentionedRegion)) return null;
          if (activeRegion !== "전국" && !shop.region.includes(activeRegion)) return null;

          // Base Cosine Similarity
          const shopEmbedding = embeddings.find((e: any) => e.id === shop.id)?.embedding;
          let simScore = 0;
          if (shopEmbedding) simScore = cosineSimilarity(userVector, shopEmbedding);

          // Boosts
          let boost = 0;
          if (intent.wantsKarai && shop.spiciness > 0) boost += 0.2;
          if (intent.avoidSpicy && shop.spiciness > 1) boost -= 0.5;
          if (intent.preferredBases.some(base => shop.bases?.includes(base))) boost += 0.2;
          if (intent.preferredBody === "rich" && shop.body >= 4) boost += 0.2;
          if (intent.preferredBody === "light" && shop.body <= 2) boost += 0.2;
          if (intent.wantsChintan && (shop.brothStyle === "chintan" || shop.types.includes("shoyu") || shop.types.includes("shio"))) boost += 0.2;
          if (intent.wantsPaitan && (shop.brothStyle === "paitan" || shop.types.includes("tonkotsu") || shop.types.includes("miso"))) boost += 0.2;
          if (intent.wantsTsukemen && shop.types.includes("tsukemen")) boost += 0.25;
          if (intent.wantsDry && shop.types.includes("mazesoba")) boost += 0.25;
          
          let distKm = null;
          if (userLocation) {
             distKm = distanceBetweenKm(userLocation, { lat: shop.lat, lng: shop.lng });
             if (distKm < 3) boost += 0.1;
             else if (distKm < 10) boost += 0.05;
             else if (distKm > 50) boost -= 0.2; // penalty for far places

             if (intent.nearby) {
               if (distKm <= 5) boost += 1.5;
               else if (distKm <= 10) boost += 0.5;
               else boost -= 2.0; // 10km 밖은 강력한 페널티로 후보에서 제외 유도
             }
          }

          return { shop, score: simScore + boost, distKm };
        }).filter(c => c !== null) as any[];

        console.log("Parsed Intent:", JSON.stringify(intent));
        
        // 5. Sort & Get Top 15
        candidates.sort((a, b) => b.score - a.score);
        const top15 = candidates.slice(0, 15);

        // 6. Augmented Generation via GPT-4o-mini
        const contextData = top15.map(c => ({
          id: c.shop.id,
          name: c.shop.name,
          address: c.shop.address,
          signature: c.shop.signature,
          types: c.shop.types,
          tags: c.shop.tags,
          distanceKm: c.distKm ? Math.round(c.distKm * 10) / 10 : null
        }));

        const systemMessage = `당신은 '라멘 사마(Ramen-sama)'라는 이름의 일본 라멘 전문 AI 어시스턴트입니다.
당신은 사용자의 감정, 위치, 취향을 깊이 이해해 최적의 라멘집을 추천합니다.

[성격]
- 친근하지만 전문적인 어조 (~예요, ~이에요)
- 이모지를 적절히 활용 (🍜, 🔥, 💚, ✨)
- 추천 시 반드시 '이유'를 취향/감정과 연결해서 설명

[후보 매장 데이터 (RAG)]
다음은 사용자의 요청과 가장 유사도가 높은 최상위 후보 매장들입니다:
${JSON.stringify(contextData)}

[분석 규칙]
1. 위 후보 매장들 중에서 사용자의 요청(지역, 취향, 거리 등)에 가장 완벽하게 부합하는 매장을 최대 3개 골라 추천하세요. (부합하는 매장이 적다면 1~2개만 추천해도 됩니다.)
2. 매장 데이터의 'types' 배열은 해당 매장이 다루는 라멘 종류입니다. (예: shoyu/shio는 청탕, tonkotsu/miso는 백탕, tsukemen은 츠케멘, mazesoba는 마제소바를 의미합니다). 이를 적극 참고하여 사용자의 복합적인 취향(예: 청탕 츠케멘)을 매칭하세요.
3. 거리가 제공된 경우 사용자 위치에서 가까운 순서를 우선적으로 고려하세요. 사용자가 '5km 이내' 등 특정 거리 조건을 명시했다면, 반드시 그 조건에 맞는 매장만 추천해야 합니다.
4. 만약 위 후보 매장 중에 사용자의 조건에 맞는 곳이 하나도 없거나(빈 배열 반환), 사용자가 라멘과 전혀 무관한 엉뚱한 질문을 한 경우: recommendations를 빈 배열([])로 두고, reply_text에 "현재 조건으로는 찰떡같은 라멘집을 찾지 못했어요 😭 조건을 조금 넓혀서 다시 물어봐 주시겠어요?" (또는 상황에 맞는 거절 멘트) 라고 친절하게 응답하세요.
5. 추천할 매장의 shopId, reason(친근한 말투의 추천 이유)을 JSON으로 응답하세요.


[출력 JSON 형식을 정확히 지키세요]
{
  "emotion_detected": "추출된감정",
  "reply_text": "사용자에게 건넬 따뜻한 멘트",
  "recommendations": [
    { "shopId": "가장추천하는매장ID", "reason": "추천 이유 1줄 설명" },
    { "shopId": "두번째매장ID", "reason": "추천 이유 1줄 설명" },
    { "shopId": "세번째매장ID", "reason": "추천 이유 1줄 설명" }
  ]
}`;

        const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: `사용자 위치: ${userLocation ? JSON.stringify(userLocation) : "없음"}
요청 내용: ${prompt}` },
            ],
            temperature: 0.7,
          }),
        });

        if (openAiResponse.ok) {
          const data = await openAiResponse.json() as any;
          const parsed = JSON.parse(data.choices[0].message.content);
          return NextResponse.json({
            source: "rag-gpt-4o-mini",
            result: parsed,
          });
        }
      } catch (err) {
        console.warn("RAG pipeline failed, falling back to local engine", err);
      }
    }

    const fallbackResult = recommendShops(prompt, activeRegion, userLocation, RAMEN_SHOPS);
    return NextResponse.json({
      source: "local-engine",
      result: fallbackResult,
    });
  } catch (error) {
    console.error("Chat API error", error);
    return NextResponse.json({ error: "AI 추천 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
