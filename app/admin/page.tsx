"use client";

import { useState, useEffect } from "react";
import { getPendingShops, approveShop, rejectShop } from "../actions/admin-shops";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await getPendingShops(password);
    setLoading(false);
    if (res.success) {
      setIsAuthenticated(true);
      setShops(res.data || []);
    } else {
      setError("비밀번호가 틀렸거나 권한이 없습니다.");
    }
  };

  const handleApprove = async (id: string) => {
    const res = await approveShop(id, password);
    if (res.success) {
      setShops((prev) => prev.filter((s) => s.id !== id));
      alert("승인되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
  };

  const handleReject = async (id: string) => {
    const res = await rejectShop(id, password);
    if (res.success) {
      setShops((prev) => prev.filter((s) => s.id !== id));
      alert("거절(반려) 처리되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="password"
            placeholder="관리자 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px", border: "1px solid #ccc", borderRadius: "8px" }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: "12px", backgroundColor: "#e11d48", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>🍜 제보 대기열 (승인 대기)</h1>
        <button onClick={() => setIsAuthenticated(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "8px", background: "none", cursor: "pointer" }}>
          로그아웃
        </button>
      </div>

      {shops.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>대기 중인 식당 제보가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {shops.map((shop) => (
            <div key={shop.id} style={{ border: "1px solid #e5e7eb", padding: "20px", borderRadius: "12px", backgroundColor: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>{shop.name}</h2>
                <p style={{ color: "#4b5563", fontSize: "14px", marginBottom: "4px" }}>📍 {shop.address}</p>
                <p style={{ color: "#4b5563", fontSize: "14px", marginBottom: "4px" }}>🍜 {shop.menu_type} | {shop.broth_style}</p>
                <p style={{ color: "#4b5563", fontSize: "14px" }}>💰 {shop.price ? `${shop.price.toLocaleString()}원` : "가격 미정"}</p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={() => handleApprove(shop.id)}
                  style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                >
                  승인
                </button>
                <button 
                  onClick={() => handleReject(shop.id)}
                  style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
