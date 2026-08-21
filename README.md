# や! - 라멘 추천 맵 (Ya! Ramen Map)

전국 **440곳 이상의 장인 수제 라멘집**을 지역, 메뉴, 육수 스타일별로 탐색하고, **Redis 기반 실시간 인기 랭킹**과 **AI 맞춤 추천**, **사용자 참여 제보**로 만들어 나가는 라멘 지도 서비스입니다.

🔗 **[Live Service 바로가기 (Vercel)](https://ya-ramen-map.vercel.app)**

---

## 🌟 주요 기능 (Key Features)

- **🔴 Redis 기반 실시간 인기 라멘집 (Popular Leaderboard)**
  - [Upstash Redis](https://upstash.com/)의 **Sorted Set**을 활용하여 탐색 및 클릭 수가 가장 많은 라멘집 TOP 5를 실시간으로 집계
  - 인기 랭킹 매장에 **`🔥 TOP 1` ~ `🔥 TOP 5` 뱃지** 자동 부여 및 사이드바 `LIVE` 랭킹 칩 제공
- **🗺️ Google Maps 대한민국 범위 한정 지능형 지도**
  - 한국 영역(`33.0°N~38.9°N`, `124.0°E~132.0°E`) 경계 제한 및 줌 제한 적용으로 쾌적한 탐색 환경 제공
  - 체인점 5개 이하의 독립 수제 라멘 전문점 중심 정제 데이터 (대형 기성 프랜차이즈 제외)
- **☀️ 라이트 모드 & 🌙 다크 모드 (Dynamic Theme Toggle)**
  - 테마 변경 시 Google Maps 베터 스타일도 어두운 다크 벡터 지도 스타일로 실시간 자동 전환
- **🎯 초정밀 필터링 및 검색 시스템**
  - 라멘 종류: 쇼유, 시오, 미소, 돈코츠, 츠케멘, 마제소바, 지로계 등
  - 국물 스타일: 맑은 청탕, 진한 백탕, 비빔, 츠케 등
  - 검색어 연관도(Relevance Score) 알고리즘으로 매장명/메뉴명 우대 검색
- **🤖 AI 추천봇 (AI Assistant)**
  - 기분, 상황, 해장, 혼밥 여부에 맞춘 스마트 라멘집 추천 (OpenAI 토큰 안전장치 포함)
- **👥 커뮤니티 제보 & 자동 지오코딩 (Auto Geocoding)**
  - 유저가 지도에 없는 신규 라멘집 주소를 제보하면 **자동으로 위도·경도 좌표로 변환(Geocoding)**하여 저장
  - 관리자 Dashboard(`/admin`) 승인 후 메인 지도 및 인기 랭킹에 즉시 반영

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Styling** | Vanilla CSS (CSS Variables Theme System) |
| **Database & ORM** | [Supabase](https://supabase.com/) (PostgreSQL), [Drizzle ORM](https://orm.drizzle.team/) |
| **Caching & Ranking** | [Upstash Redis](https://upstash.com/) (`@upstash/redis` - Serverless REST Redis) |
| **Maps & Geocoding** | Google Maps JavaScript API & Google Geocoding API |
| **AI Assistant** | OpenAI API (`gpt-4o-mini`) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 로컬 환경 실행 방법 (Local Setup)

Node.js `v20.x` 이상 환경이 필요합니다.

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정 (`.env.local`)
`.env.local` 파일에 아래 환경 변수들을 설정합니다.

```dotenv
# Supabase DB 커넥션 (필수)
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres"

# 관리자 로그인 비밀번호 (서버 환경 변수로 설정, 필수)
ADMIN_PASSWORD="your_admin_password"

# Google Maps API 키 (필수)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# Upstash Redis REST credentials (실시간 인기 랭킹용, 필수)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"

# OpenAI API 키 (AI 추천봇용, 선택)
OPENAI_API_KEY="your_openai_api_key"
```

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`에 접속하여 확인합니다.

---

## 👨‍💻 관리자 기능 (Admin Dashboard)

유저가 맛집을 직접 등록하면 데이터의 신뢰성을 지키기 위해 관리자 승인 절차를 거칩니다.

1. `/admin` 경로로 접속합니다. (`http://localhost:3000/admin`)
2. 설정된 관리자 비밀번호를 입력하여 로그인합니다.
3. 승인 대기 중(PENDING)인 매장 제보를 확인하고 **[승인]** 또는 **[거절]**을 처리합니다.
4. 승인된 매장은 즉시 메인 지도와 카테고리, 검색 목록에 통합 표시됩니다.

---

## 📜 데이터 가이드라인

- **독립 수제 매장 검증 원칙**: 체인점 5개 초과 기성 대형 프랜차이즈는 데이터베이스에서 상시 정제하여 제외합니다.
- 사용자가 제보하여 승인된 매장은 Supabase DB에 실시간 저장되며 정적 데이터베이스와 유기적으로 병합됩니다.
