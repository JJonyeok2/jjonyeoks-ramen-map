# や！- 라멘 추천 맵 (Ya! Ramen Recommendation Map)

전국 477곳 이상의 독립 수제 라멘집을 지역, 메뉴, 스타일별로 탐색하고, **사용자 참여(제보)**를 통해 지도를 확장해 나가는 웹 애플리케이션입니다. AI 챗봇 '라멘 사마'에게 기분과 취향에 맞는 오늘의 한 그릇을 추천받을 수도 있습니다.

🔗 **[Live Demo (Vercel)](https://jjonyeoks-ramen-map.vercel.app)**

---

## 🍜 주요 기능

- **Google Maps 기반의 전국 라멘 지도**
  - 전국 477곳의 수제 라멘 전문점 위치 시각화 (프랜차이즈 제외, 검증된 독립 매장 중심)
- **강력한 필터링 및 검색 시스템**
  - 메뉴 유형: 쇼유, 시오, 미소, 돈코츠, 츠케멘, 마제소바, 지로계 등
  - 국물 스타일: 청탕, 백탕, 비빔, 츠케 등
  - 지역별 필터링 및 매장명/메뉴명 텍스트 통합 검색
- **사용자 참여형 맛집 제보 (Community Submission)**
  - 사용자가 직접 지도에 없는 라멘집을 제보 가능
  - 관리자 승인(Admin Approval) 후 지도에 실시간으로 반영
- **AI 추천봇 '라멘 사마 (Ramen-sama)'**
  - "스트레스 받아", "해장이 필요해" 등 사용자의 감정과 기분, 취향을 입력하면 OpenAI 임베딩을 기반으로 최적의 매장을 추천
- **위치 기반 서비스**
  - 내 위치 기반 가까운 순 정렬 및 추천 지원

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Vanilla CSS (커스텀 디자인 시스템 및 애니메이션)
- **Database & ORM**: [Supabase](https://supabase.com/) (PostgreSQL), [Drizzle ORM](https://orm.drizzle.team/)
- **Map & AI**: Google Maps JavaScript API, OpenAI API (gpt-4o-mini & text-embedding)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 로컬 환경 실행 방법 (Local Development)

Node.js 20.x 이상의 환경이 필요합니다.

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고 아래의 환경 변수들을 채워 넣습니다.

```dotenv
# Supabase PostgreSQL 연결 주소 (필수)
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres"

# 관리자 페이지 로그인 비밀번호 (필수)
ADMIN_PASSWORD="your_admin_password"

# Google Maps API 키 (필수)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza..."

# OpenAI API 키 (라멘 사마 챗봇용, 필수)
OPENAI_API_KEY="sk-..."
```
> **주의:** `DATABASE_URL`에 들어가는 비밀번호에 특수문자가 포함된 경우 반드시 URL 인코딩(`%2F`, `%40` 등)을 거친 문자열을 사용해야 합니다.

### 3. 데이터베이스 스키마 동기화 (선택)
스키마 변경 사항이 있다면 Drizzle을 통해 Supabase에 푸시합니다.
```bash
npx drizzle-kit push
```

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`에 접속하여 확인합니다.

---

## 👨‍💻 관리자 페이지 (Admin Dashboard)

웹사이트에 사용자가 라멘집을 제보하면, 무분별한 데이터를 방지하기 위해 관리자의 승인을 거치게 됩니다.

1. `/admin` 경로로 접속합니다. (예: `http://localhost:3000/admin`)
2. `.env.local`에 설정한 `ADMIN_PASSWORD`를 입력하여 로그인합니다.
3. 승인 대기 중(PENDING)인 매장 목록을 확인하고, **[승인]** 또는 **[거절]**을 클릭하여 데이터를 관리합니다. 승인된 매장은 즉시 메인 지도에 반영됩니다.

---

## 📜 데이터 및 라이선스 안내

- 현재 기본으로 탑재된 **477곳의 매장 데이터**(`app/ramen-data.ts`)는 자체 구축한 정적 데이터베이스이며, '미검증' 표시를 통해 아직 추가 정보가 완전히 채워지지 않았음을 알립니다.
- 사용자가 제보하여 관리자가 승인한 데이터는 Supabase DB에 저장되며 기존 정적 데이터와 병합되어 화면에 표시됩니다.
