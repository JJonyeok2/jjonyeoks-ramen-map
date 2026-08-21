# や! - 라멘 추천 맵 (Ya! Ramen Map)

> **"전국의 숨은 오리지널 수제 라멘 맛집을 한눈에"**
> 
> 라멘을 사랑하는 개발자가 취미 겸 포트폴리오로 구축한 웹 애플리케이션입니다.  
> 대형 기성 프랜차이즈 대신, **체인점 5개 이하의 진짜 수제 라멘 전문점**만을 모아 탐색하고, 커뮤니티 제보와 AI 추천, 실시간 인기 랭킹을 통해 집단지성으로 지도를 완성해 나가는 서비스입니다.

🔗 **[Live Service 바로가기 (Vercel)](https://ya-ramen-map.vercel.app)**

---

## 🎯 서비스 목적 (Service Purpose)

1. **오리지널 수제 라멘 문화의 가치 보존**  
   어디서나 접할 수 있는 대형 체인점 라멘 대신, 각 매장의 독창적인 육수와 면발을 고집하는 장인들의 수제 라멘집을 우선적으로 조명합니다.
2. **지속 가능한 커뮤니티 집단지성 지도**  
   라멘 마니아 사용자들이 직접 신규 맛집을 제보하고 관리자 검증을 거쳐 실시간으로 반영함으로써 항상 최신의 라멘 맛집 정보망을 유지합니다.
3. **취향 기반 맞춤 라멘 탐색 경험 제공**  
   육수의 농도(청탕/백탕), 메뉴 분류(쇼유, 시오, 돈코츠, 츠케멘, 마제소바 등), 현재 기분이나 상태(AI 추천)에 맞춰 나만의 한 그릇을 빠르고 정확하게 찾아줍니다.

---

## 🌟 주요 기능 (Key Features)

- **🔴 Redis 기반 실시간 인기 랭킹 (Popular Leaderboard)**
  - [Upstash Redis](https://upstash.com/) **Sorted Set** 알고리즘을 적용하여 사용자의 탐색 및 클릭 수를 실시간으로 집계
  - 실시간 TOP 5 인기 매장 자동 선정 (`🔥 TOP 1` ~ `🔥 TOP 5` 뱃지 및 사이드바 `LIVE` 칩 제공)
- **🗺️ Google Maps 대한민국 수제 라멘 지도**
  - 대한민국 경계 좌표 제한 및 줌 조절을 통해 한국 내 수제 라멘 매장 시각화
- **☀️ 라이트 모드 & 🌙 다크 모드 (Dynamic Theme Toggle)**
  - 사용자 선호 테마 변경 시 웹 인터페이스와 Google Maps 벡터 스타일이 어두운 야간 테마로 실시간 연동
- **🎯 초정밀 필터링 및 검색 시스템**
  - 메뉴 유형 (쇼유, 시오, 미소, 돈코츠, 츠케멘, 마제소바, 지로계 등)
  - 국물 스타일 (맑은 청탕, 진한 백탕, 비빔, 츠케 등)
  - 매장명과 메뉴명 가중치 중심의 검색어 연관도(Relevance Score) 정렬
- **🤖 AI 추천봇 (AI Assistant)**
  - "해장하고 싶어", "깔끔한 시오라멘 추천해줘" 등 자연어 질의에 맞춰 최적의 매장을 추천하는 AI 비서
- **👥 커뮤니티 제보 & 자동 지오코딩 (Auto Geocoding)**
  - 사용자가 도로명 주소로 신규 라멘집을 제보하면, 백엔드에서 정밀 위도·경도 좌표로 자동 변환하여 저장 및 승인 처리

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 | 상세 설명 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Full-stack React 프레임워크 (Server Actions & API Routes) |
| **Styling** | **Vanilla CSS** | 테마 반응형 CSS Variables 및 커스텀 UI 디자인 시스템 |
| **Database & ORM** | **Supabase (PostgreSQL) / Drizzle ORM** | 사용자 제보 데이터 지속성 보장 및 무중단 스키마 관리 |
| **Caching & Ranking** | **Upstash Redis (`@upstash/redis`)** | Serverless REST Redis 기반 실시간 인기 랭킹 Sorted Set |
| **Map & Geocoding** | **Google Maps API & Geocoding API** | 동적 맵 시각화 및 도로명 주소 좌표 자동 변환 |
| **AI Integration** | **OpenAI API (`gpt-4o-mini`)** | 자연어 분석 기반 맞춤 매장 추천 인텔리전스 |
| **Deployment** | **Vercel** | Edge Network 기반의 글로벌 자동 CI/CD 배포 |

---

## 📜 데이터 가이드라인 (Data Principles)

- **체인점 5개 이하 독립 매장 원칙**: 가맹점이 5개를 초과하는 대형 기성 프랜차이즈 브랜드는 자동/수동 정제하여 오리지널 수제 맛집 데이터의 가치를 보장합니다.
- **데이터 검증 및 병합**: 정적 정제 데이터와 유저 제보 승인 DB 데이터가 실시간으로 안전하게 통합 렌더링됩니다.
