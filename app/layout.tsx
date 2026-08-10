import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "や！- 라멘 추천 맵";
const description = "전국 라멘 지도로 숨은 맛집을 탐험하세요.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "や！- 라멘 추천 맵",
    keywords: ["라멘", "라멘 지도", "쇼유", "시오", "츠케멘", "마제소바"],
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      siteName: "や！- 라멘 추천 맵",
      images: [{ url: socialImage, width: 1730, height: 909, alt: "RAMEN MAP 전국 한 그릇 지도" }],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "や！- 라멘 추천 맵",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
