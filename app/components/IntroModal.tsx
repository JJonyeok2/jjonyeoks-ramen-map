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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative flex flex-col items-center text-center animate-fade-in-up">
        <div className="text-5xl mb-4">🍜</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          전국 한 그릇 지도에 오신 것을 환영합니다!
        </h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          이 지도는 단순한 프랜차이즈가 아닌, 개성 넘치고 정성 가득한 
          <strong> 독립 수제 라멘 전문점</strong>들을 모아놓은 특별한 지도입니다.
        </p>

        <div className="w-full flex flex-col gap-4 text-left bg-orange-50 rounded-xl p-5 mb-6 text-sm text-gray-800">
          <div className="flex gap-3 items-start">
            <span className="text-orange-500 text-lg">🤖</span>
            <div>
              <strong>라멘 사마 AI 활용하기</strong>
              <p className="text-gray-600 mt-1">우측 상단 챗봇에게 "스트레스 받아", "속이 안 좋아" 처럼 기분이나 취향을 말해보세요. 딱 맞는 라멘집을 찾아드립니다!</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-orange-500 text-lg">📍</span>
            <div>
              <strong>내 주변 맛집 찾기</strong>
              <p className="text-gray-600 mt-1">위치 권한을 허용하시면 현재 계신 곳에서 가장 가까운 라멘집을 즉시 확인하실 수 있습니다.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-orange-500 text-lg">🤝</span>
            <div>
              <strong>커뮤니티 맛집 제보</strong>
              <p className="text-gray-600 mt-1">아직 지도에 없는 나만의 숨겨진 맛집이 있나요? 직접 등록해서 지도를 더욱 풍성하게 만들어주세요.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleClose}
          className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-orange-500/30"
        >
          라멘 지도 탐험 시작하기
        </button>
      </div>
    </div>
  );
}
