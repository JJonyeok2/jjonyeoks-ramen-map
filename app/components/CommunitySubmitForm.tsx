"use client";

import { useState, useTransition } from "react";
import { submitRamenShop } from "../actions/submit-shop";

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

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      setLoading(true);
      try {
        const data = new FormData();
        data.append("name", formData.name);
        data.append("address", formData.address);
        data.append("signature", formData.signature);
        data.append("price", formData.price);
        data.append("description", formData.description);
        data.append("brothStyle", formData.brothStyle);
        
        const result = await submitRamenShop(data);
        
        if (result.success) {
          alert("제보해주셔서 감사합니다! 관리자 승인 후 지도에 반영됩니다.");
          onClose();
        } else {
          alert(result.error || "저장에 실패했습니다.");
        }
      } catch (err) {
        console.error(err);
        alert("오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "16px"
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px",
        padding: "24px",
        position: "relative",
        display: "flex",
        flexDirection: "column"
      }}>
        <button 
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            color: "#6b7280",
            fontSize: "24px",
            lineHeight: 1,
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
          <span>🍜</span> 맛집 직접 등록하기
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>식당 이름</span>
            <input 
              required 
              type="text" 
              style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
              placeholder="라멘집 이름"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>주소</span>
            <input 
              required 
              type="text" 
              style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
              placeholder="도로명 주소 (예: 서울 마포구 동교로)"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>추천 메뉴 및 가격</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                required 
                type="text" 
                style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", flex: 1, boxSizing: "border-box" }}
                placeholder="추천 메뉴 (예: 쇼유라멘)"
                value={formData.signature}
                onChange={e => setFormData({ ...formData, signature: e.target.value })}
              />
              <input 
                type="number" 
                style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", width: "96px", boxSizing: "border-box" }}
                placeholder="가격(원)"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>라멘 스타일</span>
            <select 
              style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box", backgroundColor: "white" }}
              value={formData.brothStyle}
              onChange={e => setFormData({ ...formData, brothStyle: e.target.value })}
            >
              <option value="chintan">맑은 국물 (청탕)</option>
              <option value="paitan">진한 국물 (백탕)</option>
              <option value="dipping">찍어먹는 면 (츠케멘)</option>
              <option value="dry">비빔/국물없음 (마제소바)</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#374151" }}>한 줄 평</span>
            <textarea 
              style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box", resize: "none", height: "80px" }}
              placeholder="이곳을 추천하는 이유는 무엇인가요?"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </label>
          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: "8px 16px", fontSize: "14px", fontWeight: "bold", color: "#4b5563", backgroundColor: "#f3f4f6", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              취소
            </button>
            <button 
              type="submit" 
              disabled={loading || isPending}
              style={{ padding: "8px 16px", fontSize: "14px", fontWeight: "bold", color: "#ffffff", backgroundColor: "#f97316", border: "none", borderRadius: "8px", cursor: "pointer", opacity: (loading || isPending) ? 0.5 : 1 }}
            >
              {(loading || isPending) ? "등록 중..." : "지도에 추가하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
