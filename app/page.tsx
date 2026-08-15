"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BROTH_STYLE_LABELS,
  RAMEN_SHOPS,
  RAMEN_TYPE_LABELS,
  REGIONS,
  type BrothStyle,
  type RamenShop,
  type RamenType,
} from "./ramen-data";
import {
  analyzeRecommendationIntent,
  distanceBetweenKm,
  formatDistance,
  formatDistanceText,
  recommendShops,
  type Coordinates,
  type RecommendationResult,
} from "./recommendation";
import {
  LocationRequestError,
  requestCurrentCoordinates,
  type LocationFailureCode,
} from "./geolocation";
import { CommunitySubmitForm } from "./components/CommunitySubmitForm";
import { IntroModal } from "./components/IntroModal";


type GoogleNamespace = {
  maps: any;
};

declare global {
  interface Window {
    google?: GoogleNamespace;
    __ramenMapGoogleLoader?: Promise<GoogleNamespace>;
  }
}

type MapStatus = "loading" | "ready" | "missing" | "error";
type LocationStatus = "idle" | "requesting" | "ready" | LocationFailureCode;
type ChatRecommendation = {
  shopId: string;
  reason: string;
  distanceKm: number | null;
};
type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
  recommendations?: ChatRecommendation[];
};

const GOOGLE_APP_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
  "";
const ALL_REGIONS = ["전국", ...REGIONS] as const;
const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 1,
    role: "bot",
    text: "안녕하세요! 저는 당신의 감정, 위치, 취향을 읽는 AI '라멘 사마(Ramen-sama)'예요 🍜\n오늘 기분이 어떠신가요? '스트레스 받아', '속이 안 좋아', '어제 과음했어' 등 마음껏 말씀해 주세요!",
  },
];

const QUICK_REPLIES = [
  { label: "스트레스 받아 😫", prompt: "스트레스 받아, 라멘 추천 좀. 매운 거, 느끼한 건 싫어" },
  { label: "속이 안 좋아 🤢", prompt: "속이 안 좋은데 깔끔하고 안 느끼한 국물 추천해줘" },
  { label: "해장이 필요해 🍺", prompt: "어제 과음했어, 시원하고 얼큰한 해장 라멘 추천해줘" },
  { label: "데이트 가는 중 💕", prompt: "데이트하기에 분위기 깔끔하고 맛있는 라멘집 추천해줘" },
  { label: "지금 당장 근처 🗺️", prompt: "내 위치에서 제일 가까운 맛집 추천해줘", useLocation: true },
  { label: "맑고 담백하게 🍃", prompt: "맑고 담백한 청탕 추천해줘" },
  { label: "매운 거 싫어 ❌🌶️", prompt: "안 매운 순한 라멘 추천해줘" },
  { label: "찍어 먹는 면 🍜", prompt: "츠케멘 추천해줘" },
  { label: "비벼 먹는 면 🥢", prompt: "마제소바 추천해줘" },
];

const MAP_LABELS = [
  { name: "수도권", left: "35%", top: "21%" },
  { name: "강원", left: "62%", top: "25%" },
  { name: "충청", left: "43%", top: "42%" },
  { name: "경상", left: "65%", top: "59%" },
  { name: "전라", left: "34%", top: "64%" },
  { name: "제주", left: "22%", top: "88%" },
];

function loadGoogleSdk(apiKey: string): Promise<GoogleNamespace> {
  if (window.google?.maps) {
    return Promise.resolve(window.google as GoogleNamespace);
  }

  if (window.__ramenMapGoogleLoader) return window.__ramenMapGoogleLoader;

  window.__ramenMapGoogleLoader = new Promise((resolve, reject) => {
    const scriptId = "google-map-sdk";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const finish = () => {
      if (!window.google?.maps) {
        reject(new Error("Google Maps SDK is unavailable."));
        return;
      }
      resolve(window.google as GoogleNamespace);
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps SDK failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Maps SDK failed to load.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return window.__ramenMapGoogleLoader;
}

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

const LIGHT_MAP_STYLES = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
];

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

function markerPosition(point: Coordinates) {
  const left = ((point.lng - 125.4) / 4.7) * 100;
  const top = ((38.8 - point.lat) / 6.2) * 100;
  return {
    left: `${Math.min(92, Math.max(8, left))}%`,
    top: `${Math.min(92, Math.max(8, top))}%`,
  };
}

function isFallbackMapCoordinate(point: Coordinates) {
  return point.lng >= 125.4 && point.lng <= 130.1 && point.lat >= 32.6 && point.lat <= 38.8;
}

function locationStatusText(status: LocationStatus) {
  if (status === "requesting") return "현재 위치를 확인하고 있어요";
  if (status === "ready") return "내 위치 사용 중 · 직선거리 기준";
  if (status === "permission-denied") return "위치 권한이 꺼져 있어요";
  if (status === "unsupported") return "이 브라우저는 위치를 지원하지 않아요";
  if (status === "timeout") return "위치 확인 시간이 초과됐어요";
  if (status === "unavailable") return "현재 위치를 확인할 수 없어요";
  return "허용하면 가까운 곳부터 추천해요";
}

function buildBotReply(result: RecommendationResult, locationUnavailable: boolean) {
  const scope = result.nearbyUsed
    ? "현재 위치에서 가까운 순으로"
    : `${result.targetRegion === "전국" ? "전국" : result.targetRegion}에서`;
  const count = result.recommendations.length;

  if (!count) {
    if (result.intent.wantsChintan) {
      return `${result.targetRegion === "전국" ? "현재 조건" : result.targetRegion}에는 깔끔한 청탕 메뉴가 없어요. 지역을 넓혀 다시 찾아보세요.`;
    }
    if (result.intent.wantsPaitan) {
      return `${result.targetRegion === "전국" ? "현재 조건" : result.targetRegion}에는 백탕 메뉴가 없어요. 지역을 넓혀 다시 찾아보세요.`;
    }
    return "조건에 맞는 매장을 찾지 못했어요. 지역이나 취향을 조금 넓혀 다시 말해 주세요.";
  }
  if (locationUnavailable) {
    return `위치를 확인하지 못해 ${scope} 조건에 가까운 ${count}곳을 골랐어요. 위치 권한을 허용하면 실제 가까운 순으로 다시 추천할게요.`;
  }
  if (result.intent.avoidSpicy) {
    return `${scope} 매운맛은 빼고 편안하게 즐길 ${count}곳을 골랐어요.`;
  }
  if (result.intent.avoidRich && result.intent.wantsChintan) {
    return `${scope} 느끼함이 적고 끝맛이 깔끔한 청탕 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.avoidRich && result.intent.wantsPaitan) {
    return `${scope} 백탕 중 국물 농도가 비교적 가벼운 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsChintan && result.intent.wantsTsukemen) {
    return `${scope} 맑고 개운한 청탕 츠케멘 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsPaitan && result.intent.wantsTsukemen) {
    return `${scope} 진하고 뽀얀 백탕 베이스의 츠케멘 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsChintan) {
    return `${scope} 맑고 개운한 청탕 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsPaitan) {
    return `${scope} 진하고 뽀얀 백탕 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsTsukemen) {
    return `${scope} 쫄깃한 매력의 츠케멘 메뉴 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsDry) {
    return `${scope} 감칠맛이 폭발하는 마제소바/비빔라멘 ${count}곳을 골랐어요.`;
  }
  if (result.strategy === "karai") {
    return `${scope} 스트레스를 날릴 카라이 메뉴가 있는 ${count}곳을 골랐어요.`;
  }
  if (result.intent.wantsKarai && result.strategy === "spicy") {
    return `${scope} 카라이 메뉴가 없어 화끈한 매운맛 메뉴 ${count}곳을 대신 골랐어요.`;
  }
  if (result.intent.wantsKarai) {
    return `${scope} 카라이·고맵기 메뉴가 없어 현재 조건에 가까운 ${count}곳을 보여드려요.`;
  }
  return `${scope} 취향에 가까운 ${count}곳을 골랐어요. 추천 이유도 함께 확인해 보세요.`;
}

export function getShopMarkerColor(shop: RamenShop): string {
  if (shop.types.includes("jiro") || shop.signature.includes("지로")) {
    return "#be123c"; // 🟤 지로계 (산더미 라멘)
  }
  if (shop.spiciness >= 2 || shop.signature.includes("카라이") || shop.signature.includes("매운")) {
    return "#dc2626"; // 🔴 카라이 (매운맛)
  }
  switch (shop.brothStyle) {
    case "chintan":
      return "#d97706"; // 🟡 청탕 (쇼유/시오)
    case "paitan":
      return "#ea580c"; // 🟠 백탕 (토리파이탄/돈코츠)
    case "dipping":
      return "#7c3aed"; // 🟣 츠케 (츠케멘)
    case "dry":
      return "#059669"; // 🟢 비빔 (마제소바)
    default:
      return "#ea580c";
  }
}

function RamenCard({
  shop,
  selected,
  distanceKm,
  onSelect,
}: {
  shop: RamenShop;
  selected: boolean;
  distanceKm: number | null;
  onSelect: (shop: RamenShop) => void;
}) {
  return (
    <button
      className={`ramen-card${selected ? " is-selected" : ""}`}
      type="button"
      onClick={() => onSelect(shop)}
      aria-pressed={selected}
      data-testid={`shop-${shop.id}`}
    >
      <span className="ramen-card-topline">
        <span className={`demo-kicker${shop.dataStatus === "verified" ? " verified-kicker" : ""}`}>
          {shop.dataStatus === "verified" ? "VERIFIED" : "UNVERIFIED"}
        </span>
        <span className="rating">
          {shop.dataStatus === "verified" ? "사용자 검증" : `★ ${shop.rating.toFixed(1)}`}
        </span>
      </span>
      <span className="ramen-card-title">{shop.name}</span>
      <span className="ramen-card-menu">
        {shop.signature}
        <strong>{formatPrice(shop.price)}</strong>
      </span>
      <span className="ramen-card-meta">
        {shop.region} {shop.district}
        <i aria-hidden="true" />
        {shop.tags.slice(0, 2).join(" · ")}
      </span>
      {distanceKm !== null ? (
        <span className="ramen-card-distance">⌖ 내 위치에서 직선 {formatDistance(distanceKm)}</span>
      ) : null}
      <span
        className="type-dots"
        aria-label={`대표 메뉴 분류: ${BROTH_STYLE_LABELS[shop.brothStyle]}; 종류: ${shop.types.map((type) => RAMEN_TYPE_LABELS[type]).join(", ")}`}
      >
        <span className={`broth-style-badge broth-${shop.brothStyle}`}>
          {BROTH_STYLE_LABELS[shop.brothStyle]}
        </span>
        {shop.types.map((type) => (
          <span className={`type-dot type-${type}`} key={type}>
            {RAMEN_TYPE_LABELS[type]}
          </span>
        ))}
      </span>
    </button>
  );
}

export default function Home() {
  const [verifiedShops, setVerifiedShops] = useState<RamenShop[]>([]);
  const [communityShops, setCommunityShops] = useState<RamenShop[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<(typeof ALL_REGIONS)[number]>("전국");
  const [selectedTypes, setSelectedTypes] = useState<RamenType[]>([]);
  const [selectedBrothStyles, setSelectedBrothStyles] = useState<BrothStyle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>(
    GOOGLE_APP_KEY ? "loading" : "missing",
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatBusy, setChatBusy] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: theme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
      });
    }
  }, [theme]);

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const googleRef = useRef<GoogleNamespace | null>(null);
  const clustererRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const userLocationOverlayRef = useRef<{ setMap: (map: unknown | null) => void } | null>(null);
  const locationRequestRef = useRef<Promise<Coordinates | null> | null>(null);
  const pendingChatRef = useRef(false);
  const messageIdRef = useRef(2);
  const baseShops = useMemo<RamenShop[]>(() => RAMEN_SHOPS.map((shop) => ({ ...shop, dataStatus: "unverified" })), []);
  const shops = useMemo(() => [...verifiedShops, ...communityShops, ...baseShops], [verifiedShops, communityShops, baseShops]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shops", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("verified shops unavailable");
        return response.json() as Promise<{ shops?: RamenShop[] }>;
      })
      .then((result) => {
        if (!cancelled) setVerifiedShops(result.shops ?? []);
      })
      .catch(() => {
        if (!cancelled) setVerifiedShops([]);
      });

    fetch("/api/community", { cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCommunityShops(data);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const filteredShops = useMemo(() => {
    const query = normalized(search);
    return shops.filter((shop) => {
      const haystack = normalized(
        [
          shop.name,
          shop.signature,
          shop.region,
          shop.district,
          shop.address,
          BROTH_STYLE_LABELS[shop.brothStyle],
          shop.tags.join(" "),
          shop.bases.join(" "),
          shop.types.map((type) => RAMEN_TYPE_LABELS[type]).join(" "),
          shop.menuList?.map((item) => `${item.name} ${item.description || ""}`).join(" ") || "",
          shop.detailedTags?.mood?.join(" ") || "",
          shop.detailedTags?.recommend_for?.join(" ") || "",
        ].join(" "),
      );
      const matchesQuery = !query || haystack.includes(query);
      const matchesRegion = region === "전국" || shop.region === region;
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some((type) => shop.types.includes(type));
      const matchesBrothStyle =
        selectedBrothStyles.length === 0 ||
        selectedBrothStyles.includes(shop.brothStyle);
      return matchesQuery && matchesRegion && matchesType && matchesBrothStyle;
    });
  }, [region, search, selectedBrothStyles, selectedTypes, shops]);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedId) ?? null,
    [selectedId, shops],
  );

  const displayedShops = useMemo(() => {
    const query = normalized(search);
    const shops = filteredShops.map((shop) => {
      let searchScore = 0;
      if (query) {
        const nameNorm = normalized(shop.name);
        const sigNorm = normalized(shop.signature);
        if (nameNorm === query) searchScore = 100;
        else if (nameNorm.startsWith(query)) searchScore = 80;
        else if (nameNorm.includes(query)) searchScore = 60;
        else if (sigNorm.includes(query)) searchScore = 40;
        else searchScore = 20;
      }
      return {
        shop,
        searchScore,
        distanceKm: userLocation
          ? distanceBetweenKm(userLocation, { lat: shop.lat, lng: shop.lng })
          : null,
      };
    });

    return shops.sort((left, right) => {
      if (query && right.searchScore !== left.searchScore) {
        return right.searchScore - left.searchScore;
      }
      if (userLocation) {
        return (left.distanceKm ?? 0) - (right.distanceKm ?? 0);
      }
      return 0;
    });
  }, [filteredShops, search, userLocation]);

  const selectedDistance = useMemo(
    () =>
      selectedShop && userLocation
        ? distanceBetweenKm(userLocation, {
            lat: selectedShop.lat,
            lng: selectedShop.lng,
          })
        : null,
    [selectedShop, userLocation],
  );

  const toggleType = (type: RamenType) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
    setSelectedId(null);
  };

  const toggleBrothStyle = (style: BrothStyle) => {
    setSelectedBrothStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style],
    );
    setSelectedId(null);
  };

  const resetFilters = () => {
    setSearch("");
    setRegion("전국");
    setSelectedTypes([]);
    setSelectedBrothStyles([]);
    setSelectedId(null);
  };

  const selectShop = useCallback((shop: RamenShop) => {
    setSelectedId(shop.id);
  }, []);

  const requestUserLocation = useCallback(async () => {
    if (userLocation) return userLocation;
    if (locationRequestRef.current) return locationRequestRef.current;

    setLocationStatus("requesting");
    const request = requestCurrentCoordinates(
      typeof navigator === "undefined" ? undefined : navigator.geolocation,
    )
      .then((coordinates) => {
        setUserLocation(coordinates);
        setLocationStatus("ready");
        return coordinates;
      })
      .catch((error: unknown) => {
        setLocationStatus(
          error instanceof LocationRequestError ? error.code : "unavailable",
        );
        return null;
      })
      .finally(() => {
        locationRequestRef.current = null;
      });

    locationRequestRef.current = request;
    return request;
  }, [userLocation]);

  const focusUserLocation = useCallback((coordinates: Coordinates) => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(14);
    mapRef.current.panTo({ lat: coordinates.lat, lng: coordinates.lng });
  }, []);

  const locateMe = useCallback(async () => {
    const coordinates = await requestUserLocation();
    if (coordinates) focusUserLocation(coordinates);
  }, [focusUserLocation, requestUserLocation]);

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_APP_KEY || !mapElementRef.current) {
      setMapStatus("missing");
      return;
    }

    setMapStatus("loading");
    loadGoogleSdk(GOOGLE_APP_KEY)
      .then((google) => {
        if (cancelled || !mapElementRef.current) return;
        googleRef.current = google;
        mapRef.current = new google.maps.Map(mapElementRef.current, {
          center: { lat: 36.25, lng: 127.75 },
          zoom: 7.8,
          minZoom: 7,
          maxZoom: 18,
          restriction: {
            latLngBounds: {
              north: 38.9,
              south: 33.0,
              west: 124.0,
              east: 132.0,
            },
            strictBounds: false,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: theme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        });
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !googleRef.current || !mapRef.current) return;

    const google = googleRef.current;
    const map = mapRef.current;

    markersRef.current.forEach((marker) => (marker as any).setMap(null));

    const bounds = new google.maps.LatLngBounds();
    const markers = filteredShops.map((shop) => {
      const position = { lat: shop.lat, lng: shop.lng };
      const isSelected = shop.id === selectedId;
      const styleColor = getShopMarkerColor(shop);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `${shop.name} (${shop.signature})`,
        zIndex: isSelected ? 999 : 10,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8.5,
          fillColor: styleColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: isSelected ? 3.5 : 2,
        },
      });

      bounds.extend(position);
      marker.addListener("click", () => selectShop(shop));
      return marker;
    });

    markersRef.current = markers;
    if (markers.length) {
      if (markers.length === 1) {
        map.panTo({ lat: filteredShops[0].lat, lng: filteredShops[0].lng });
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }
  }, [filteredShops, mapStatus, selectShop, selectedId]);

  useEffect(() => {
    if (!selectedShop || mapStatus !== "ready" || !mapRef.current) return;
    mapRef.current.panTo({ lat: selectedShop.lat, lng: selectedShop.lng });
    mapRef.current.setZoom(14);
  }, [mapStatus, selectedShop]);

  useEffect(() => {
    if (userLocationOverlayRef.current) {
      userLocationOverlayRef.current.setMap(null);
      userLocationOverlayRef.current = null;
    }
    if (!userLocation || mapStatus !== "ready" || !googleRef.current || !mapRef.current)
      return;

    const google = googleRef.current;
    const marker = new google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: mapRef.current,
      title: "내 위치",
      zIndex: 999,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    userLocationOverlayRef.current = marker;

    return () => {
      marker.setMap(null);
    };
  }, [mapStatus, userLocation]);

  const sendChat = async (prompt: string, forceLocation = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || pendingChatRef.current) return;

    pendingChatRef.current = true;
    setChatBusy(true);
    const userId = messageIdRef.current++;
    setChatMessages((current) => [
      ...current,
      { id: userId, role: "user", text: cleanPrompt },
    ]);
    setChatInput("");

    try {
      const intent = analyzeRecommendationIntent(cleanPrompt);
      let coordinates = userLocation;
      let locationUnavailable = false;
      if ((forceLocation || intent.nearby) && !coordinates) {
        coordinates = await requestUserLocation();
        locationUnavailable = !coordinates;
      }

      let result = recommendShops(cleanPrompt, region, coordinates, shops);
      let replyMessageText = buildBotReply(result, locationUnavailable);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: cleanPrompt,
            userLocation: coordinates,
            activeRegion: region,
          }),
        });
        if (response.ok) {
          const apiData = await response.json() as any;
          if (apiData.result) {
            // GPT 응답이 오면 로컬 추천 결과를 무시하고 덮어씀 (빈 배열이든, undefined든)
            if (apiData.source === "rag-gpt-4o-mini") {
              result.recommendations = apiData.result.recommendations || [];
            } else if (apiData.result.recommendations) {
              result = apiData.result;
            }
            if (apiData.result.reply_text) {
              replyMessageText = apiData.result.reply_text;
            }
          }
        }
      } catch (err) {
        console.warn("Client API call failed, using local engine output", err);
      }

      const botId = messageIdRef.current++;
      setChatMessages((current) => [
        ...current,
        {
          id: botId,
          role: "bot",
          text: replyMessageText,
          recommendations: result.recommendations.map((recommendation: any) => ({
            shopId: recommendation.shop?.id || recommendation.shopId,
            reason: recommendation.reason,
            distanceKm: recommendation.distanceKm || null,
          })),
        },
      ]);
    } finally {
      pendingChatRef.current = false;
      setChatBusy(false);
    }
  };

  const submitChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendChat(chatInput);
  };

  const showRecommendedShop = (shop: RamenShop) => {
    setSearch("");
    setRegion("전국");
    setSelectedTypes([]);
    setSelectedBrothStyles([]);
    setSelectedId(shop.id);
    setMobileListOpen(false);
  };

  const mapStatusLabel =
    mapStatus === "ready"
      ? "구글맵 연결됨"
      : mapStatus === "loading"
        ? "지도를 불러오는 중"
        : mapStatus === "error"
          ? "지도 연결 확인 필요"
          : "미검증 지도";

  return (
    <main className="app-shell">
      <IntroModal />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="라멘맵 홈" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/logo.png" alt="や! 로고" style={{ height: "40px", objectFit: "contain" }} />
          <span>
            <strong>や！- 라멘 추천 맵</strong>
            <small>전국 한 그릇 지도</small>
          </span>
        </a>
        <div className="header-center" aria-label="서비스 안내">
          <span className="live-dot" />
          검증 {verifiedShops.length + communityShops.length}곳 · 미검증 {RAMEN_SHOPS.length}곳
        </div>
        <div className="header-actions">
          <button
            className="verify-link"
            style={{
              background: theme === "dark" ? "#374151" : "#f3f4f6",
              color: theme === "dark" ? "#f9fafb" : "#1f2937",
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
            type="button"
            onClick={toggleTheme}
            aria-label="테마 전환"
          >
            {theme === "dark" ? "☀️ 라이트" : "🌙 다크"}
          </button>
          <button className="verify-link" style={{ background: '#10b981', color: 'white' }} type="button" onClick={() => setSubmitOpen(true)}>+ 맛집 등록하기</button>
          <a className="verify-link" href="/verify">실데이터 검증</a>
          <button className="recommend-header" type="button" onClick={() => setChatOpen(true)}>
            <span aria-hidden="true">🍜</span>
            라멘 사마 AI 챗봇
          </button>
        </div>
      </header>
      
      {submitOpen && (
        <CommunitySubmitForm 
          onClose={() => setSubmitOpen(false)} 
          onSubmitSuccess={(newShop) => {
            setCommunityShops((prev) => [...prev, newShop]);
            setSubmitOpen(false);
            alert("맛집이 성공적으로 등록되었습니다!");
          }}
        />
      )}

      <div className="workspace" id="top">
        <aside className={`sidebar${mobileListOpen ? " mobile-open" : ""}`} aria-label="라멘 검색과 결과">
          <button
            className="mobile-sheet-handle"
            type="button"
            aria-label={mobileListOpen ? "목록 접기" : "목록 펼치기"}
            onClick={() => setMobileListOpen((open) => !open)}
          >
            <span />
          </button>

          <div className="search-section">
            <label className="search-box">
              <span className="search-icon" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="가게, 메뉴, 취향을 검색해보세요"
                type="search"
                aria-label="라멘 가게 검색"
                data-testid="shop-search"
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="검색어 지우기">×</button>
              ) : null}
            </label>

            <div className="filter-row">
              <label className="region-select-wrap">
                <span aria-hidden="true">⌖</span>
                <select
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value as (typeof ALL_REGIONS)[number]);
                    setSelectedId(null);
                  }}
                  aria-label="지역 선택"
                  data-testid="region-filter"
                >
                  {ALL_REGIONS.map((item) => (
                    <option value={item} key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button className="reset-button" type="button" onClick={resetFilters}>
                초기화
              </button>
            </div>

            <div className="filter-groups">
              <div className="filter-group">
                <div className="filter-heading">
                  <span>메뉴로 골라보기</span>
                  <small>여러 개 선택 가능</small>
                </div>
                <div className="type-filters" aria-label="라멘 종류 필터">
                  {(Object.keys(RAMEN_TYPE_LABELS) as RamenType[]).map((type) => {
                    const active = selectedTypes.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        className={`type-filter type-${type}${active ? " active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleType(type)}
                        data-testid={`type-${type}`}
                      >
                        <span aria-hidden="true" />
                        {RAMEN_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="filter-group">
                <div className="filter-heading broth-filter-heading">
                  <span>대표 메뉴 스타일</span>
                  <small>청탕·백탕 등</small>
                </div>
                <div className="broth-filters" aria-label="대표 메뉴 국물 스타일 필터">
                  {(Object.keys(BROTH_STYLE_LABELS) as BrothStyle[]).map((style) => {
                    const active = selectedBrothStyles.includes(style);
                    return (
                      <button
                        type="button"
                        key={style}
                        className={`type-filter broth-filter broth-${style}${active ? " active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleBrothStyle(style)}
                        data-testid={`broth-${style}`}
                      >
                        <span aria-hidden="true" />
                        {BROTH_STYLE_LABELS[style]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="results-heading">
            <div>
              <strong>{region === "전국" ? "전국" : region} 라멘</strong>
              <span>{filteredShops.length}곳</span>
            </div>
            <span className="demo-badge">미검증</span>
          </div>

          <div className="results-list" data-testid="shop-list">
            {filteredShops.length ? (
              displayedShops.map(({ shop, distanceKm }) => (
                <RamenCard
                  key={shop.id}
                  shop={shop}
                  selected={shop.id === selectedId}
                  distanceKm={distanceKm}
                  onSelect={selectShop}
                />
              ))
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">∿</span>
                <strong>조건에 맞는 한 그릇이 없어요</strong>
                <p>지역이나 메뉴·국물 필터를 조금 넓혀보세요.</p>
                <button type="button" onClick={resetFilters}>전체 라멘 보기</button>
              </div>
            )}
          </div>
        </aside>

        <section className="map-panel" aria-label="전국 라멘 지도">
          <div className="map-toolbar">
            <span className={`map-status status-${mapStatus}`}>
              <i aria-hidden="true" />
              {mapStatusLabel}
            </span>
            <div className="map-toolbar-actions">
              <button
                className={`locate-button status-${locationStatus}`}
                type="button"
                onClick={() => void locateMe()}
                disabled={locationStatus === "requesting"}
                aria-label="내 위치를 사용해 가까운 라멘 찾기"
                data-testid="locate-button"
              >
                <span aria-hidden="true">◎</span>
                {locationStatus === "requesting"
                  ? "위치 확인 중"
                  : locationStatus === "ready"
                    ? "내 위치 사용 중"
                    : "내 위치"}
              </button>
              <button type="button" onClick={resetFilters}>
                <span aria-hidden="true">⌂</span>
                전국 보기
              </button>
            </div>
          </div>

          <div className="google-map" ref={mapElementRef} aria-hidden={mapStatus !== "ready"} style={{ width: "100%", height: "100%" }} />

          {mapStatus !== "ready" ? (
            <div className="fallback-map" data-testid="fallback-map">
              <div className="map-grid" />
              <div className="land-shape land-main" />
              <div className="land-shape land-south" />
              <div className="land-shape land-jeju" />
              {MAP_LABELS.map((label) => (
                <span className="fallback-label" style={{ left: label.left, top: label.top }} key={label.name}>
                  {label.name}
                </span>
              ))}
              {filteredShops.map((shop) => (
                <button
                  type="button"
                  className={`fallback-marker${selectedId === shop.id ? " selected" : ""}`}
                  style={{ ...markerPosition(shop), backgroundColor: getShopMarkerColor(shop) }}
                  aria-label={`${shop.name}, ${shop.signature}`}
                  onClick={() => selectShop(shop)}
                  key={shop.id}
                >
                  <span>{RAMEN_TYPE_LABELS[shop.types[0]].slice(0, 1)}</span>
                </button>
              ))}
              {userLocation && isFallbackMapCoordinate(userLocation) ? (
                <div
                  className="fallback-user-marker"
                  style={markerPosition(userLocation)}
                  role="img"
                  aria-label="내 현재 위치"
                  data-testid="fallback-user-marker"
                >
                  <span />
                  <b>내 위치</b>
                </div>
              ) : null}
              <div className="map-credit">GOOGLE MAPS READY · API KEY INTEGRATED</div>
            </div>
          ) : null}

          <div className="map-style-legend" style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 8,
            background: "rgba(18, 20, 24, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "30px",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxWidth: "92%",
            overflowX: "auto"
          }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>마커 스타일</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#f3f4f6", whiteSpace: "nowrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#d97706", display: "inline-block", boxShadow: "0 0 6px rgba(217,119,6,0.6)" }} /> 맑은 청탕
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ea580c", display: "inline-block", boxShadow: "0 0 6px rgba(234,88,12,0.6)" }} /> 진한 백탕
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#7c3aed", display: "inline-block", boxShadow: "0 0 6px rgba(124,58,237,0.6)" }} /> 농후 츠케멘
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#059669", display: "inline-block", boxShadow: "0 0 6px rgba(5,150,105,0.6)" }} /> 비빔 소바
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#be123c", display: "inline-block", boxShadow: "0 0 6px rgba(190,18,60,0.6)" }} /> 지로계(산더미)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#dc2626", display: "inline-block", boxShadow: "0 0 6px rgba(220,38,38,0.6)" }} /> 🌶️ 카라이
              </span>
            </div>
          </div>

          {mapStatus !== "ready" ? (
            <div className="map-notice" role="status">
              <span className="notice-icon" aria-hidden="true">G</span>
              <div>
                <strong>{mapStatus === "error" ? "구글 맵 연결을 확인해 주세요" : "지금은 미검증 지도로 보고 있어요"}</strong>
                <p>Google Maps JavaScript API 키로 전국의 73개 수제 라멘집 위치를 시각화합니다.</p>
              </div>
              <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">
                키 설정 ↗
              </a>
            </div>
          ) : null}

          {selectedShop ? (
            <article className="selected-shop-panel" aria-live="polite">
              <button className="panel-close" type="button" onClick={() => setSelectedId(null)} aria-label="매장 상세 닫기">×</button>
              <div className="selected-shop-head">
                <span className="shop-number">#{String(shops.indexOf(selectedShop) + 1).padStart(2, "0")}</span>
                <div>
                  <small>
                    {selectedShop.region} · {selectedShop.district} · {selectedShop.dataStatus === "verified" ? "검증 실데이터" : "DEMO"}
                    {selectedDistance !== null
                      ? ` · 직선 ${formatDistance(selectedDistance)}`
                      : ""}
                  </small>
                  <h2>{selectedShop.name}</h2>
                </div>
              </div>
              <div className="signature-box">
                <span>대표 한 그릇 · {BROTH_STYLE_LABELS[selectedShop.brothStyle]}</span>
                <strong>{selectedShop.signature}</strong>
                <b>{formatPrice(selectedShop.price)}</b>
              </div>

              {selectedShop.menuList && selectedShop.menuList.length > 0 ? (
                <div className="full-menu-section" style={{ marginTop: "14px", borderTop: "1px solid #e5e7eb", paddingTop: "14px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🍜 매장 전체 메뉴판</span>
                    <small style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>({selectedShop.menuList.length}개 메뉴)</small>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedShop.menuList.map((item, idx) => (
                      <div key={idx} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ paddingRight: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "14px", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>{item.name}</strong>
                            {item.isSignature ? <span style={{ background: "#e54820", color: "#ffffff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 800 }}>대표</span> : null}
                            {item.spiciness && item.spiciness > 0 ? <span style={{ background: "#dc2626", color: "#ffffff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>🌶️ 매콤</span> : null}
                          </div>
                          {item.description ? <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.4, marginTop: "4px", margin: "4px 0 0 0", fontWeight: 500 }}>{item.description}</p> : null}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#d97706", whiteSpace: "nowrap" }}>{formatPrice(item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="taste-meter" aria-label={`국물 농도 ${selectedShop.body}점, 매운맛 ${selectedShop.spiciness}점`}>
                <div>
                  <span>국물 농도</span>
                  <i>{Array.from({ length: 5 }).map((_, index) => <em className={index < selectedShop.body ? "filled" : ""} key={index} />)}</i>
                </div>
                <div>
                  <span>매운맛</span>
                  <i>{Array.from({ length: 5 }).map((_, index) => <em className={index < selectedShop.spiciness ? "filled spicy" : ""} key={index} />)}</i>
                </div>
              </div>
              <p className="shop-address">{selectedShop.address}</p>
              {selectedShop.dataStatus === "verified" && selectedShop.sourceUrl ? (
                <a className="verified-source-link" href={selectedShop.sourceUrl} target="_blank" rel="noreferrer">
                  검증 출처 확인 ↗
                </a>
              ) : null}
              <div className="shop-actions">
                <span>{selectedShop.hours} · {selectedShop.closed}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedShop.name)}+${selectedShop.lat},${selectedShop.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  구글 맵에서 보기 ↗
                </a>
              </div>
            </article>
          ) : null}

          <button
            className="mobile-list-toggle"
            type="button"
            onClick={() => setMobileListOpen(true)}
          >
            라멘 목록 {filteredShops.length}곳
          </button>
        </section>
      </div>

      {chatOpen ? (
        <section className="chat-panel" aria-label="라멘 사마 AI 챗봇" data-testid="chat-panel">
          <header>
            <div className="bot-avatar" aria-hidden="true">🍜</div>
            <div>
              <strong>라멘 사마 (Ramen-sama)</strong>
              <span><i /> {chatBusy ? "감정 & 취향 분석 중..." : "감정 · 위치 · 취향 맞춤 AI"}</span>
            </div>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="추천봇 닫기">×</button>
          </header>
          <div className="chat-body" aria-live="polite">
            {chatMessages.map((message) => (
              <div className={`chat-message ${message.role}`} key={message.id}>
                <p style={{ whiteSpace: "pre-line" }}>{message.text}</p>
                {message.recommendations?.map((recommendation) => {
                  const shop = shops.find((item) => item.id === recommendation.shopId);
                  if (!shop) return null;
                  return (
                    <button
                      className="chat-recommendation"
                      type="button"
                      key={shop.id}
                      onClick={() => showRecommendedShop(shop)}
                      data-testid={`chat-recommendation-${shop.id}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "6px",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontSize: "11px", color: "var(--red)", fontWeight: 800 }}>
                          {shop.region} · {BROTH_STYLE_LABELS[shop.brothStyle]} · {RAMEN_TYPE_LABELS[shop.types[0]]}
                        </span>
                        {recommendation.distanceKm !== null ? (
                          <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700, background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                            ⌖ {formatDistanceText(recommendation.distanceKm)}
                          </span>
                        ) : null}
                      </div>
                      <strong style={{ fontSize: "14px", fontWeight: 900, color: "#111827" }}>{shop.name}</strong>
                      <em style={{ fontSize: "12px", color: "#4b5563", fontStyle: "normal", fontWeight: 600 }}>{recommendation.reason}</em>
                      <div style={{ marginTop: "4px", width: "100%", display: "flex", justifyContent: "flex-end" }}>
                        <b style={{ fontSize: "12px", color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: "6px" }}>📍 지도에서 이동 & 마커 보기 ↗</b>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={`chat-location status-${locationStatus}`} role="status">
            <button
              type="button"
              onClick={() => void requestUserLocation()}
              disabled={locationStatus === "requesting"}
              aria-label="내 위치 기반 주변 추천 사용"
            >
              <span aria-hidden="true">◎</span>
              <b>내 위치 기반 추천</b>
            </button>
            <span>{locationStatusText(locationStatus)}</span>
          </div>
          <div className="quick-replies" aria-label="빠른 취향 선택">
            {QUICK_REPLIES.map((reply) => (
              <button
                type="button"
                key={reply.label}
                onClick={() => void sendChat(reply.prompt, reply.useLocation)}
                disabled={chatBusy}
              >
                {reply.label}
              </button>
            ))}
          </div>
          <form className="chat-form" onSubmit={submitChat}>
            <label>
              <span className="sr-only">원하는 라멘 취향 입력</span>
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="예: 오늘 화가 나서 스트레스를 풀고 싶어"
                data-testid="chat-input"
                disabled={chatBusy}
              />
            </label>
            <button type="submit" aria-label="추천 요청 보내기" disabled={chatBusy}>↑</button>
          </form>
          <p className="chat-disclaimer">미검증 매장 기준 · 위치는 저장하지 않으며 거리는 직선거리예요.</p>
        </section>
      ) : (
        <div className="chat-launch-wrap">
          <span className="chat-nudge">오늘 뭐 먹을지 고민이라면?</span>
          <button className="chat-launch" type="button" onClick={() => setChatOpen(true)} aria-label="라멘 취향 추천봇 열기">
            <span aria-hidden="true">✦</span>
            <b>취향 추천</b>
          </button>
        </div>
      )}
    </main>
  );
}
