import {
  RAMEN_SHOPS,
  REGIONS,
  type BrothStyle,
  type RamenShop,
  type Region,
  type BrothBase,
} from "./ramen-data.ts";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type EmotionType = "stress" | "hangover" | "cleanse" | "date" | "solo" | "general";

export type RecommendationIntent = {
  stressRelief: boolean;
  hangoverCure: boolean;
  cleansePalate: boolean;
  dateSpot: boolean;
  soloFriendly: boolean;
  spicy: boolean;
  wantsKarai: boolean;
  avoidSpicy: boolean;
  avoidRich: boolean;
  preferredBrothStyle: BrothStyle | null;
  nearby: boolean;
  mentionedRegion: Region | null;
  detectedEmotion: EmotionType;
  // Newly added for RAG Hybrid Search
  preferredBases: BrothBase[];
  preferredBody: "rich" | "light" | null;
  vegetarian: boolean;
  avoidPork: boolean;
  dayOfWeek: string | null;
};

export type RecommendationStrategy = "karai" | "spicy" | "taste";

export type RankedRecommendation = {
  shop: RamenShop;
  reason: string;
  distanceKm: number | null;
  distanceText?: string;
  oneLiner?: string;
  emotionTag?: string;
};

export type RecommendationResult = {
  recommendations: RankedRecommendation[];
  intent: RecommendationIntent;
  strategy: RecommendationStrategy;
  brothMatch: BrothStyle | null;
  targetRegion: Region | "전국";
  nearbyUsed: boolean;
};

const STRESS_RELIEF_PATTERN =
  /스트레스(?:를|가)?\s*(?:받|쌓|풀|날리|해소)|화가\s*(?:나|났)|열\s*받|열받|짜증|울화|답답(?:해|해서)|분노|기분\s*전환|땀\s*(?:빼|내)/;
const HANGOVER_PATTERN = /해장|숙취|술|과음|어제\s*술|속풀이|알코올/;
const CLEANSE_PATTERN = /속이\s*안\s*좋|속\s*더러|입맛\s*없|더부룩|깔끔|소화/;
const DATE_PATTERN = /데이트|여친|남친|연인|분위기\s*좋|오붓/;
const SOLO_PATTERN = /혼밥|혼자|퇴근길/;

const EXPLICIT_SPICY_PATTERN = /카라이|매콤|매운|얼큰|화끈/;
const AVOID_SPICY_PATTERN =
  /안\s*매운|맵지\s*않|매운\s*(?:건|거|것|맛)?[\s,].{0,10}(?:싫|못|별로|부담|빼|제외|없이)|매운\s*(?:건|거|것|맛)?\s*(?:싫|못|별로|부담|빼|제외|없이)|맵찔|순한\s*(?:맛|걸|거)|매운맛\s*(?:빼|제외|없이)/;
const NEARBY_PATTERN = /근처|주변|가까운|내\s*위치|현재\s*위치|동네/;
const AVOID_PORK_PATTERN = /돼지.*(?:빼|제외|없이)|돈육.*(?:빼|제외|없이)/;
const AVOID_RICH_PATTERN =
  /느끼(?:한|함|해서)?\s*(?:건|거|것|맛)?\s*(?:싫|못|별로|부담|빼|제외)|느끼하지\s*않|안\s*느끼|기름진.*(?:싫|못|별로|부담|빼|제외)|기름기\s*(?:적|없)/;
const RICH_ALLOWED_PATTERN =
  /(?:느끼|기름진|헤비).{0,12}(?:괜찮|좋아|상관\s*없|안\s*싫|싫(?:진|지는|지)\s*않)|느끼하지\s*않아도\s*(?:돼|괜찮)/;
const CHINTAN_TERM_PATTERN = /(?:청탕|친탄|치탄|chintan)/i;
const PAITAN_TERM_PATTERN = /(?:백탕|파이탄|빠이탄|paitan)/i;
const AVOID_CHINTAN_PATTERN =
  /(?:청탕|친탄|치탄|chintan)(?:은|는|이|가|을|를|도)?\s*(?:말고|싫|별로|빼|제외|안\s*(?:먹|당기|땡기|원)|원하지\s*않|필요\s*없)/i;
const AVOID_PAITAN_PATTERN =
  /(?:백탕|파이탄|빠이탄|paitan)(?:은|는|이|가|을|를|도)?\s*(?:말고|싫|별로|빼|제외|안\s*(?:먹|당기|땡기|원)|원하지\s*않|필요\s*없)|(?:백탕|파이탄|빠이탄|paitan).{0,10}느끼.{0,8}(?:싫|부담|못|별로|빼|제외)/i;
const BROTH_NEUTRAL_PATTERN =
  /(?=.*(?:청탕|친탄|치탄|chintan))(?=.*(?:백탕|파이탄|빠이탄|paitan)).*(?:상관\s*없|아무거나|둘\s*다|어느\s*쪽이든)/i;
const CLEAN_BROTH_PATTERN =
  /(?:맑(?:은|게)?|담백(?:한|하게)?|깔끔(?:한|하게)?|개운(?:한|하게)?|산뜻(?:한|하게)?)(?:\s*(?:국물|육수|라멘|걸|것))?|가벼운\s*(?:국물|육수)|클리어\s*(?:국물|육수)|시원(?:한|하게)?\s*(?:국물|육수|라멘)/;
const RICH_BROTH_PATTERN =
  /(?:뽀얀|크리미(?:한|하게)?|농후(?:한|하게)?|진하고\s*뽀얀)\s*(?:국물|육수|라멘)/;
const DRY_OR_DIPPING_PATTERN = /마제|비벼|비빔|츠케|찍어/;

// Newly added for RAG Hybrid Search
const SEAFOOD_PATTERN = /해산물|멸치|니보시|어패류|조개/;
const CHICKEN_PATTERN = /닭|토리|치킨/;
const PORK_PATTERN = /돼지|돈코츠|사골/;
const RICH_BODY_PATTERN = /진한|꾸덕|묵직|찐한|진득/;
const LIGHT_BODY_PATTERN = /깔끔|맑은|가벼운|개운|라이트/;
const VEGETARIAN_PATTERN = /채식|비건|고기\s*없(?:는|이)|야채만/;
const DAY_OF_WEEK_PATTERN = /(월|화|수|목|금|토|일)(?:요일)?(?:\s*(?:에|도))?(?:\s*(?:문\s*여는|여는|영업|가(?:능|려고|려|고)))/;
const TODAY_TOMORROW_PATTERN = /(오늘|내일)(?:\s*(?:문\s*여는|여는|영업|가(?:능|려고|려|고)))/;

export function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

export function analyzeRecommendationIntent(prompt: string): RecommendationIntent {
  const input = normalizeText(prompt);
  const avoidSpicy = AVOID_SPICY_PATTERN.test(input);
  const avoidRich =
    AVOID_RICH_PATTERN.test(input) && !RICH_ALLOWED_PATTERN.test(input);
  const stressRelief = STRESS_RELIEF_PATTERN.test(input);
  const hangoverCure = HANGOVER_PATTERN.test(input);
  const cleansePalate = CLEANSE_PATTERN.test(input) || (avoidRich && !stressRelief);
  const dateSpot = DATE_PATTERN.test(input);
  const soloFriendly = SOLO_PATTERN.test(input);

  let detectedEmotion: EmotionType = "general";
  if (stressRelief) detectedEmotion = "stress";
  else if (hangoverCure) detectedEmotion = "hangover";
  else if (cleansePalate) detectedEmotion = "cleanse";
  else if (dateSpot) detectedEmotion = "date";
  else if (soloFriendly) detectedEmotion = "solo";

  const explicitKarai = input.includes("카라이");
  const spicy = !avoidSpicy && (stressRelief || EXPLICIT_SPICY_PATTERN.test(input));
  const explicitChintan = CHINTAN_TERM_PATTERN.test(input);
  const explicitPaitan = PAITAN_TERM_PATTERN.test(input);
  const avoidChintan = AVOID_CHINTAN_PATTERN.test(input);
  const avoidPaitan = AVOID_PAITAN_PATTERN.test(input);
  const brothNeutral = BROTH_NEUTRAL_PATTERN.test(input);
  const positiveChintan = explicitChintan && !avoidChintan;
  const positivePaitan = explicitPaitan && !avoidPaitan;
  let preferredBrothStyle: BrothStyle | null = null;

  if (!brothNeutral) {
    if (positiveChintan && !positivePaitan) {
      preferredBrothStyle = "chintan";
    } else if (positivePaitan && !positiveChintan) {
      preferredBrothStyle = "paitan";
    } else if (
      !positiveChintan &&
      !positivePaitan &&
      !DRY_OR_DIPPING_PATTERN.test(input)
    ) {
      if (avoidRich || CLEAN_BROTH_PATTERN.test(input)) {
        preferredBrothStyle = "chintan";
      } else if (RICH_BROTH_PATTERN.test(input)) {
        preferredBrothStyle = "paitan";
      }
    }
  }

  const preferredBases: BrothBase[] = [];
  if (SEAFOOD_PATTERN.test(input)) preferredBases.push("해산물");
  if (CHICKEN_PATTERN.test(input)) preferredBases.push("닭");
  if (PORK_PATTERN.test(input)) preferredBases.push("돼지");

  let preferredBody: "rich" | "light" | null = null;
  if (RICH_BODY_PATTERN.test(input)) preferredBody = "rich";
  else if (LIGHT_BODY_PATTERN.test(input)) preferredBody = "light";

  const vegetarian = VEGETARIAN_PATTERN.test(input);
  const avoidPork = AVOID_PORK_PATTERN.test(input) || vegetarian;
  
  let dayOfWeek: string | null = null;
  const dayMatch = input.match(DAY_OF_WEEK_PATTERN);
  if (dayMatch && dayMatch[1]) {
    dayOfWeek = dayMatch[1] + "요일";
  } else if (TODAY_TOMORROW_PATTERN.test(input)) {
    const today = new Date();
    if (input.includes("내일")) {
      today.setDate(today.getDate() + 1);
    }
    const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    dayOfWeek = days[today.getDay()];
  }

  return {
    stressRelief,
    hangoverCure,
    cleansePalate,
    dateSpot,
    soloFriendly,
    spicy,
    wantsKarai: spicy && (stressRelief || explicitKarai),
    avoidSpicy,
    avoidRich,
    preferredBrothStyle,
    nearby: NEARBY_PATTERN.test(input),
    mentionedRegion:
      REGIONS.find((region) => input.includes(normalizeText(region))) ?? null,
    detectedEmotion,
    preferredBases,
    preferredBody,
    vegetarian,
    avoidPork,
    dayOfWeek,
  };
}

export function hasKaraiMenu(shop: RamenShop) {
  return normalizeText([shop.signature, ...shop.tags].join(" ")).includes("카라이");
}

export function distanceBetweenKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371.0088;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    const meters = Math.max(0, Math.round((distanceKm * 1000) / 10) * 10);
    return `${meters.toLocaleString("ko-KR")}m`;
  }
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm).toLocaleString("ko-KR")}km`;
}

export function formatDistanceText(distanceKm: number): string {
  if (distanceKm < 1.5) {
    const walkMinutes = Math.max(1, Math.round((distanceKm * 1000) / 80));
    return `도보 ${walkMinutes}분 (${formatDistance(distanceKm)})`;
  }
  const transitMinutes = Math.max(5, Math.round(distanceKm * 3));
  return `대중교통 ${transitMinutes}분 (${formatDistance(distanceKm)})`;
}

function preferenceScore(
  shop: RamenShop,
  input: string,
  intent: RecommendationIntent,
) {
  let score = shop.rating * 10;
  if (shop.aiProfile) {
    if (intent.stressRelief) score += shop.aiProfile.stress_relief * 25;
    if (intent.hangoverCure) score += shop.aiProfile.hangover_cure * 25;
    if (intent.cleansePalate) score += shop.aiProfile.cleanse_palate * 25;
    if (intent.dateSpot) score += shop.aiProfile.date_spot * 20;
    if (intent.soloFriendly) score += shop.aiProfile.solo_friendly * 15;
  }

  if (intent.avoidRich) score += (6 - shop.body) * 8;
  if (/맑|담백|깔끔|시오|소금/.test(input)) {
    if (shop.body <= 3) score += 8;
    if (shop.types.some((type) => type === "shio" || type === "shoyu")) score += 8;
  }
  if (/진|묵직|꾸덕|농후|돈코츠/.test(input)) {
    if (shop.body >= 4) score += 9;
    if (shop.types.some((type) => type === "tonkotsu" || type === "miso")) score += 7;
  }
  if (/츠케|찍어/.test(input) && shop.types.includes("tsukemen")) score += 18;
  if (/마제|비벼/.test(input) && shop.types.includes("mazesoba")) score += 18;
  if (/쇼유|간장/.test(input) && shop.types.includes("shoyu")) score += 15;
  if (/미소|된장/.test(input) && shop.types.includes("miso")) score += 15;
  if (shop.tags.some((tag) => input.includes(normalizeText(tag)))) score += 8;
  return score;
}

export function getRecommendationReason(
  shop: RamenShop,
  prompt: string,
  strategy: RecommendationStrategy = "taste",
) {
  const input = normalizeText(prompt);
  const intent = analyzeRecommendationIntent(prompt);
  const reasons: string[] = [];

  if (
    intent.avoidRich &&
    intent.preferredBrothStyle === "paitan" &&
    shop.brothStyle === "paitan"
  ) {
    reasons.push("백탕 중 비교적 가벼운 편");
  } else if (intent.avoidRich && shop.brothStyle === "chintan") {
    reasons.push("느끼함 적은 맑은 청탕");
  } else if (intent.preferredBrothStyle === "chintan" && shop.brothStyle === "chintan") {
    reasons.push("맑고 깔끔한 청탕");
  } else if (intent.preferredBrothStyle === "paitan" && shop.brothStyle === "paitan") {
    reasons.push("진하고 뽀얀 백탕");
  }
  if (strategy === "karai" && hasKaraiMenu(shop)) {
    reasons.push(intent.stressRelief ? "스트레스를 날릴 카라이 메뉴" : "카라이 메뉴");
  } else if (strategy === "spicy" && shop.spiciness >= 3) {
    reasons.push("화끈한 매운맛");
  }
  if (intent.avoidSpicy && shop.spiciness <= 1) reasons.push("순한 매운맛");
  if (/맑|담백|깔끔|시오|소금/.test(input) && shop.body <= 3)
    reasons.push("가벼운 국물");
  if (/진|묵직|꾸덕|농후|돈코츠/.test(input) && shop.body >= 4)
    reasons.push("농도 높은 육수");
  if (/츠케|찍어/.test(input) && shop.types.includes("tsukemen"))
    reasons.push("쫄깃한 츠케멘");
  if (/마제|비벼/.test(input) && shop.types.includes("mazesoba"))
    reasons.push("감칠맛 나는 비빔면");
  if (/채식|비건/.test(input) && shop.vegetarian) reasons.push("채식 옵션");
  if (AVOID_PORK_PATTERN.test(input) && !shop.containsPork)
    reasons.push("돈육 없이 즐기는 메뉴");

  return reasons.length
    ? reasons.slice(0, 2).join(" · ")
    : shop.tags.slice(0, 2).join(" · ");
}

export function generateOneLiner(intent: RecommendationIntent, shop: RamenShop): string {
  if (intent.stressRelief) {
    if (intent.avoidSpicy || shop.brothStyle === "chintan") {
      return "스트레스 받으셨군요. 차분하고 맑은 국물로 속과 마음을 어루만져 보세요 🍃";
    }
    return "오늘의 스트레스! 얼큰하고 화끈한 라멘 한 그릇으로 싹 날려버리세요 🔥";
  }
  if (intent.hangoverCure) {
    return "어제 과음하셨나요? 개운하고 속 시원한 국물이 속풀이에 으뜸이에요 🥣";
  }
  if (intent.cleansePalate) {
    return "느끼함 전혀 없는 깔끔한 국물로 입안을 시원하게 리셋해보세요 💚";
  }
  if (intent.dateSpot) {
    return "소중한 사람과 함께하기 좋은 정갈하고 우아한 정통 라멘 공간이에요 ✨";
  }
  return "오늘 기분에 딱 맞는 정성 가득 수제 라멘 맛집이에요 🍜";
}

export function recommendShops(
  prompt: string,
  activeRegion: Region | "전국",
  userLocation: Coordinates | null = null,
  shops: RamenShop[] = RAMEN_SHOPS,
): RecommendationResult {
  const input = normalizeText(prompt);
  const intent = analyzeRecommendationIntent(prompt);
  const targetRegion =
    intent.mentionedRegion ??
    (intent.nearby && userLocation ? "전국" : activeRegion);

  let candidates = shops.filter(
    (shop) => targetRegion === "전국" || shop.region === targetRegion,
  );

  if (intent.avoidSpicy) {
    candidates = candidates.filter((shop) => shop.spiciness <= 1);
  }
  if (intent.avoidRich) {
    candidates = candidates.filter((shop) => !shop.types.includes("jiro") && shop.body <= 4);
  }
  if (/채식|비건/.test(input)) {
    candidates = candidates.filter((shop) => shop.vegetarian);
  }
  if (AVOID_PORK_PATTERN.test(input)) {
    candidates = candidates.filter((shop) => !shop.containsPork);
  }

  let brothMatch: BrothStyle | null = null;
  if (intent.preferredBrothStyle) {
    const matched = candidates.filter((shop) => shop.brothStyle === intent.preferredBrothStyle);
    if (matched.length > 0) {
      candidates = matched;
      brothMatch = intent.preferredBrothStyle;
    }
  }

  let strategy: RecommendationStrategy = "taste";
  if (intent.wantsKarai) {
    const karaiMatches = candidates.filter(hasKaraiMenu);
    const spicyFallbacks = candidates.filter((shop) => shop.spiciness >= 3);
    if (karaiMatches.length) {
      candidates = karaiMatches;
      strategy = "karai";
    } else if (spicyFallbacks.length) {
      candidates = spicyFallbacks;
      strategy = "spicy";
    }
  } else if (intent.spicy) {
    const spicyMatches = candidates.filter((shop) => shop.spiciness >= 3);
    if (spicyMatches.length) {
      candidates = spicyMatches;
      strategy = "spicy";
    }
  }

  const ranked = candidates
    .map((shop) => {
      const distanceKm = userLocation
        ? distanceBetweenKm(userLocation, { lat: shop.lat, lng: shop.lng })
        : null;
      return {
        shop,
        score: preferenceScore(shop, input, intent),
        distanceKm,
      };
    })
    .sort((left, right) => {
      if (left.distanceKm !== null && right.distanceKm !== null) {
        const distanceDifference = left.distanceKm - right.distanceKm;
        if (Math.abs(distanceDifference) > 0.01) return distanceDifference;
      }
      if (right.score !== left.score) return right.score - left.score;
      if (right.shop.rating !== left.shop.rating)
        return right.shop.rating - left.shop.rating;
      return left.shop.id.localeCompare(right.shop.id);
    })
    .slice(0, 3)
    .map(({ shop, distanceKm }) => ({
      shop,
      distanceKm,
      distanceText: distanceKm !== null ? formatDistanceText(distanceKm) : undefined,
      reason: getRecommendationReason(shop, prompt, strategy),
      oneLiner: generateOneLiner(intent, shop),
      emotionTag: intent.detectedEmotion !== "general" ? intent.detectedEmotion : undefined,
    }));

  return {
    recommendations: ranked,
    intent,
    strategy,
    brothMatch,
    targetRegion,
    nearbyUsed: Boolean(userLocation),
  };
}
