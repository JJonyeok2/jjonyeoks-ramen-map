"use client";

import { useState } from "react";

export function CommunitySubmitForm({ onClose, onSubmitSuccess }: { onClose: () => void, onSubmitSuccess: (shop: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    signature: "",
    price: "",
    description: "",
    brothStyle: "chintan",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const types = formData.brothStyle === "chintan" ? ["shoyu"] : formData.brothStyle === "paitan" ? ["tonkotsu"] : ["tsukemen"];
      
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, types }),
      });
      
      if (response.ok) {
        const data = await response.json();
        onSubmitSuccess(data.shop);
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative flex flex-col">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl leading-none" 
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🍜</span> 맛집 직접 등록하기
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">식당 이름</span>
            <input 
              required 
              type="text" 
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="라멘집 이름"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">주소</span>
            <input 
              required 
              type="text" 
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="도로명 주소 (예: 서울 마포구 동교로)"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">추천 메뉴 및 가격</span>
            <div className="flex gap-2">
              <input 
                required 
                type="text" 
                className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1"
                placeholder="추천 메뉴 (예: 쇼유라멘)"
                value={formData.signature}
                onChange={e => setFormData({ ...formData, signature: e.target.value })}
              />
              <input 
                type="number" 
                className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-24"
                placeholder="가격(원)"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">라멘 스타일</span>
            <select 
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={formData.brothStyle}
              onChange={e => setFormData({ ...formData, brothStyle: e.target.value })}
            >
              <option value="chintan">맑은 국물 (청탕)</option>
              <option value="paitan">진한 국물 (백탕)</option>
              <option value="dipping">찍어먹는 면 (츠케멘)</option>
              <option value="dry">비빔/국물없음 (마제소바)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">한 줄 평</span>
            <textarea 
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
              placeholder="이곳을 추천하는 이유는 무엇인가요?"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "등록 중..." : "지도에 추가하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
