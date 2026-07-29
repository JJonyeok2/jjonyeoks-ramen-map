import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRecommendationIntent,
  distanceBetweenKm,
  hasKaraiMenu,
  recommendShops,
} from "../app/recommendation.ts";
import { BROTH_STYLE_LABELS, RAMEN_SHOPS } from "../app/ramen-data.ts";

test("maps anger and stress language to exact karai menu recommendations", () => {
  const result = recommendShops(
    "오늘 화가 나는데 스트레스 풀고 싶어",
    "전국",
  );

  assert.equal(result.intent.stressRelief, true);
  assert.equal(result.intent.wantsKarai, true);
  assert.equal(result.strategy, "karai");
  assert.ok(result.recommendations.length > 0);
  assert.ok(result.recommendations.every(({ shop }) => hasKaraiMenu(shop)));
  assert.match(result.recommendations[0].reason, /카라이/);
});

test("spicy negation wins over the inferred stress intent", () => {
  const result = recommendShops(
    "스트레스 받았지만 매운 건 싫어. 안 매운 걸로 부탁해",
    "전국",
  );

  assert.equal(result.intent.stressRelief, true);
  assert.equal(result.intent.avoidSpicy, true);
  assert.equal(result.intent.spicy, false);
  assert.equal(result.strategy, "taste");
  assert.ok(result.recommendations.every(({ shop }) => shop.spiciness <= 1));
});

test("does not infer anger from a negated statement", () => {
  const intent = analyzeRecommendationIntent("오늘은 화가 안 났어. 담백한 걸로");
  assert.equal(intent.stressRelief, false);
  assert.equal(intent.wantsKarai, false);
});

test("nearby intent ignores a stale region filter and ranks by distance", () => {
  const location = { lat: 37.5618, lng: 126.9237 };
  assert.equal(RAMEN_SHOPS.length, 76);
  const result = recommendShops(
    "내 위치에서 가까운 라멘 추천해줘",
    "부산",
    location,
  );

  assert.equal(result.targetRegion, "전국");
  assert.equal(result.nearbyUsed, true);
  assert.deepEqual(
    result.recommendations.map(({ shop }) => shop.id).slice(0, 3),
    [
      "seoul-mapo-013",
      "seoul-mapo-010",
      "seoul-mapo-009",
    ],
  );
});

test("location-aware stress recommendations choose the nearest karai menus", () => {
  const result = recommendShops(
    "오늘 화가 나는데 스트레스 풀고 싶어",
    "전국",
    { lat: 37.5618, lng: 126.9237 },
  );

  assert.equal(result.recommendations[0].shop.id, "seoul-mapo-013");
  assert.ok(result.recommendations.every(({ shop }) => hasKaraiMenu(shop)));
  assert.ok(
    result.recommendations.every(
      (item, index, all) => index === 0 || (all[index - 1].distanceKm ?? 0) <= (item.distanceKm ?? 0),
    ),
  );
});

test("keeps a mentioned region and labels the absence of karai as a fallback", () => {
  const result = recommendShops("부산에서 스트레스 풀고 싶어", "전국");

  assert.equal(result.targetRegion, "부산");
  assert.equal(result.strategy, "taste");
  assert.ok(result.recommendations.every(({ shop }) => shop.region === "부산"));
  assert.ok(result.recommendations.every(({ shop }) => !hasKaraiMenu(shop)));
});

test("calculates haversine distance deterministically", () => {
  const distance = distanceBetweenKm(
    { lat: 37.5618, lng: 126.9237 },
    { lat: 37.5446, lng: 127.0561 },
  );
  assert.ok(Math.abs(distance - 11.827) < 0.02);
});

test("classifies every representative menu with a supported broth style", () => {
  assert.equal(RAMEN_SHOPS.length, 76);
  assert.ok(
    RAMEN_SHOPS.every((shop) => shop.brothStyle in BROTH_STYLE_LABELS),
  );
  assert.deepEqual(
    RAMEN_SHOPS.reduce<Record<string, number>>((counts, shop) => {
      counts[shop.brothStyle] = (counts[shop.brothStyle] ?? 0) + 1;
      return counts;
    }, {}),
    { paitan: 39, chintan: 14, dipping: 8, dry: 15 },
  );
});

test("infers chintan from greasy-food rejection", () => {
  const result = recommendShops("느끼한 건 싫어", "전국");

  assert.equal(result.intent.avoidRich, true);
  assert.equal(result.intent.preferredBrothStyle, "chintan");
  assert.equal(result.brothMatch, "chintan");
  assert.ok(
    result.recommendations.every(({ shop }) => shop.brothStyle === "chintan"),
  );
  assert.match(result.recommendations[0].reason, /느끼함.*청탕/);
});

test("honors explicit chintan and paitan requests", () => {
  const chintan = recommendShops("청탕 추천해줘", "전국");
  const paitan = recommendShops("백탕 추천해줘", "전국");

  assert.equal(chintan.intent.preferredBrothStyle, "chintan");
  assert.ok(
    chintan.recommendations.every(({ shop }) => shop.brothStyle === "chintan"),
  );
  assert.equal(paitan.intent.preferredBrothStyle, "paitan");
  assert.deepEqual(
    paitan.recommendations.map(({ shop }) => shop.id).slice(0, 3),
    [
      "gyeonggi-suwon-001",
      "gyeonggi-uiwang-001",
      "seoul-gangnam-003",
    ],
  );
});

test("style negation selects the other explicitly requested broth", () => {
  assert.equal(
    analyzeRecommendationIntent("백탕 말고 청탕").preferredBrothStyle,
    "chintan",
  );
  assert.equal(
    analyzeRecommendationIntent("청탕 말고 백탕").preferredBrothStyle,
    "paitan",
  );
});

test("neutral broth wording does not choose one arbitrarily", () => {
  assert.equal(
    analyzeRecommendationIntent("청탕이든 백탕이든 상관없어")
      .preferredBrothStyle,
    null,
  );
});

test("double negation does not infer chintan", () => {
  for (const prompt of [
    "느끼한 건 안 싫어",
    "느끼해도 괜찮아",
    "느끼하지 않아도 돼",
  ]) {
    const intent = analyzeRecommendationIntent(prompt);
    assert.equal(intent.avoidRich, false);
    assert.equal(intent.preferredBrothStyle, null);
  }
});

test("explicit paitan wins over inferred anti-rich style", () => {
  const result = recommendShops("느끼하지 않은 백탕", "전국");

  assert.equal(result.intent.avoidRich, true);
  assert.equal(result.intent.preferredBrothStyle, "paitan");
  assert.ok(
    result.recommendations.every(({ shop }) => shop.brothStyle === "paitan"),
  );
  assert.deepEqual(
    result.recommendations.map(({ shop }) => shop.id).slice(0, 3),
    [
      "seoul-mapo-006",
      "gyeonggi-uiwang-001",
      "seoul-gangnam-003",
    ],
  );
  assert.match(result.recommendations[0].reason, /백탕 중 비교적 가벼운 편/);
});

test("dry and dipping requests suppress descriptive broth inference", () => {
  const dry = analyzeRecommendationIntent("마제소바 추천해줘");
  const dipping = analyzeRecommendationIntent("츠케멘 추천해줘");

  assert.equal(dry.preferredBrothStyle, null);
  assert.equal(dipping.preferredBrothStyle, null);
});
