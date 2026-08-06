"use client";

import { useEffect, useState } from "react";

export function IntroModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 최초 방문 여부 확인
    const hasSeenIntro = localStorage.getItem("ramenMapIntroSeen");
    if (!hasSeenIntro) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("ramenMapIntroSeen", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        width: "100%",
        maxWidth: "500px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍜</div>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "8px", margin: 0 }}>
          전국 한 그릇 지도에 오신 것을 환영합니다!
        </h2>
        <p style={{ color: "#4b5563", marginBottom: "24px", fontSize: "14px", lineHeight: "1.5" }}>
          이 지도는 단순한 프랜차이즈가 아닌, 개성 넘치고 정성 가득한 
          <strong> 독립 수제 라멘 전문점</strong>들을 모아놓은 특별한 지도입니다.
        </p>

        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          textAlign: "left",
          backgroundColor: "#fff7ed",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
          fontSize: "14px",
          color: "#1f2937"
        }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ color: "#f97316", fontSize: "20px" }}>🤖</span>
            <div>
              <strong style={{ display: "block" }}>라멘 사마 AI 활용하기</strong>
              <p style={{ color: "#4b5563", marginTop: "4px", margin: 0 }}>우측 상단 챗봇에게 "스트레스 받아", "속이 안 좋아" 처럼 기분이나 취향을 말해보세요. 딱 맞는 라멘집을 찾아드립니다!</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ color: "#f97316", fontSize: "20px" }}>📍</span>
            <div>
              <strong style={{ display: "block" }}>내 주변 맛집 찾기</strong>
              <p style={{ color: "#4b5563", marginTop: "4px", margin: 0 }}>위치 권한을 허용하시면 현재 계신 곳에서 가장 가까운 라멘집을 즉시 확인하실 수 있습니다.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ color: "#f97316", fontSize: "20px" }}>🤝</span>
            <div>
              <strong style={{ display: "block" }}>커뮤니티 맛집 제보</strong>
              <p style={{ color: "#4b5563", marginTop: "4px", margin: 0 }}>아직 지도에 없는 나만의 숨겨진 맛집이 있나요? 직접 등록해서 지도를 더욱 풍성하게 만들어주세요.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleClose}
          style={{
            width: "100%",
            padding: "12px 24px",
            backgroundColor: "#f97316",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "16px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(249, 115, 22, 0.3)"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
        >
          라멘 지도 탐험 시작하기
        </button>
      </div>
    </div>
  );
}
