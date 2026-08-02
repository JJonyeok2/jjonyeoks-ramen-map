import { NextResponse } from "next/server";
import { RAMEN_SHOPS } from "../../ramen-data";
import { recommendShops } from "../../recommendation";

export const dynamic = "force-dynamic";

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
        const systemMessage = `당신은 '라멘 사마(Ramen-sama)'라는 이름의 일본 라멘 전문 AI 어시스턴트입니다.
당신은 사용자의 감정, 위치, 취향을 깊이 이해해 최적의 라멘집을 추천합니다.

[성격]
- 친근하지만 전문적인 어조 (~예요, ~이에요)
- 이모지를 적절히 활용 (🍜, 🔥, 💚, ✨)
- 추천 시 반드시 '이유'를 감정과 연결해서 설명

[데이터베이스]
76개 수제 라멘집 데이터:
${JSON.stringify(RAMEN_SHOPS.slice(0, 40))}

[분석 규칙]
1. 사용자 메시지에서 감정을 추출하세요 (stress|hangover|cleanse|date|solo|general)
2. "매운 거 싫어" -> spiciness <= 1
3. "느끼한 거 싫어" -> jiro 및 heavy 육수 제외
4. 추천할 3개 매장의 id, name, style, reason, oneLiner를 JSON으로 응답하세요.

[출력 JSON 예시]
{
  "emotion_detected": "stress",
  "reply_text": "스트레스 받으셨군요. 속을 어루만져 줄 맑은 청탕 라멘을 추천해 드릴게요! 🍃",
  "recommendations": [
    { "shopId": "gyeonggi-anyang-001", "reason": "맑은 청탕 쇼유라멘으로 속이 편안해집니다." }
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
              { role: "user", content: `사용자 위치: ${userLocation ? JSON.stringify(userLocation) : "없음"}\n요청: ${prompt}` },
            ],
            temperature: 0.7,
          }),
        });

        if (openAiResponse.ok) {
          const data = await openAiResponse.json() as any;
          const parsed = JSON.parse(data.choices[0].message.content);
          return NextResponse.json({
            source: "openai-gpt-4o-mini",
            result: parsed,
          });
        }
      } catch (err) {
        console.warn("OpenAI API call failed, falling back to local engine", err);
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
