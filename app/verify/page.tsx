"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BROTH_STYLE_LABELS,
  RAMEN_TYPE_LABELS,
  REGIONS,
  type BrothBase,
  type RamenType,
} from "../ramen-data";
import type { VerificationCandidate } from "../verification-types";
import type { CandidateStatus } from "../../db/schema";
import "./verify.css";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: "검증 대기",
  verified: "검증 완료",
  hold: "보류",
  rejected: "제외",
};
const BASES: BrothBase[] = ["닭", "돼지", "소", "해산물", "채소"];
const EMPTY_CANDIDATE: VerificationCandidate = {
  id: "",
  name: "",
  area: "안양",
  region: "경기",
  district: "안양시",
  address: "",
  lat: null,
  lng: null,
  phone: "",
  representativeMenu: "",
  price: 0,
  ramenTypes: [],
  brothStyle: "unknown",
  body: 3,
  spiciness: 0,
  bases: [],
  tags: [],
  hours: "",
  closed: "",
  sourceName: "직접 확인",
  sourceUrl: "",
  secondarySourceUrl: "",
  evidenceNote: "",
  status: "pending",
  reviewerNote: "",
  verifiedBy: "",
  verifiedAt: null,
  createdAt: "",
  updatedAt: "",
};

function updateArray<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function CandidateCard({
  candidate,
  onSaved,
}: {
  candidate: VerificationCandidate;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(candidate);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const set = <K extends keyof VerificationCandidate>(key: K, value: VerificationCandidate[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async (status = draft.status) => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "저장하지 못했습니다.");
      setMessage(status === "verified" ? "검증 완료 · 지도와 챗봇에 반영됩니다." : "저장했습니다.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`verify-card status-${draft.status}`}>
      <div className="verify-card-head">
        <div>
          <span className="area-chip">{draft.area}</span>
          <span className={`status-chip status-${draft.status}`}>{STATUS_LABELS[draft.status]}</span>
          <h2>{draft.name}</h2>
        </div>
        <span className="updated-at">
          {draft.updatedAt ? `수정 ${new Date(draft.updatedAt).toLocaleDateString("ko-KR")}` : "새 후보"}
        </span>
      </div>

      <div className="verify-grid">
        <label className="span-2">매장명<input value={draft.name} onChange={(event) => set("name", event.target.value)} /></label>
        <label>검증 지역<input value={draft.area} onChange={(event) => set("area", event.target.value)} placeholder="안양, 망원 등" /></label>
        <label>시·도<select value={draft.region} onChange={(event) => set("region", event.target.value as VerificationCandidate["region"])}>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select></label>
        <label>구·시<input value={draft.district} onChange={(event) => set("district", event.target.value)} /></label>
        <label className="span-2">주소<input value={draft.address} onChange={(event) => set("address", event.target.value)} /></label>
        <label>위도<input type="number" step="any" value={draft.lat ?? ""} onChange={(event) => set("lat", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>경도<input type="number" step="any" value={draft.lng ?? ""} onChange={(event) => set("lng", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>전화<input value={draft.phone} onChange={(event) => set("phone", event.target.value)} /></label>
        <label>대표 메뉴<input value={draft.representativeMenu} onChange={(event) => set("representativeMenu", event.target.value)} /></label>
        <label>가격<input type="number" step="500" min="0" value={draft.price} onChange={(event) => set("price", Number(event.target.value))} /></label>
        <label>국물 스타일<select value={draft.brothStyle} onChange={(event) => set("brothStyle", event.target.value as VerificationCandidate["brothStyle"])}><option value="unknown">미확인</option>{Object.entries(BROTH_STYLE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>국물 농도 (1–5)<input type="number" min="1" max="5" value={draft.body} onChange={(event) => set("body", Number(event.target.value))} /></label>
        <label>매운맛 (0–5)<input type="number" min="0" max="5" value={draft.spiciness} onChange={(event) => set("spiciness", Number(event.target.value))} /></label>
        <fieldset className="span-2">
          <legend>메뉴 분류</legend>
          <div className="check-row">{(Object.keys(RAMEN_TYPE_LABELS) as RamenType[]).map((type) => <label className="check-chip" key={type}><input type="checkbox" checked={draft.ramenTypes.includes(type)} onChange={() => set("ramenTypes", updateArray(draft.ramenTypes, type))} />{RAMEN_TYPE_LABELS[type]}</label>)}</div>
        </fieldset>
        <fieldset className="span-2">
          <legend>육수 베이스</legend>
          <div className="check-row">{BASES.map((base) => <label className="check-chip" key={base}><input type="checkbox" checked={draft.bases.includes(base)} onChange={() => set("bases", updateArray(draft.bases, base))} />{base}</label>)}</div>
        </fieldset>
        <label className="span-2">태그 (쉼표 구분)<input value={draft.tags.join(", ")} onChange={(event) => set("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} /></label>
        <label>영업시간<input value={draft.hours} onChange={(event) => set("hours", event.target.value)} /></label>
        <label>휴무<input value={draft.closed} onChange={(event) => set("closed", event.target.value)} /></label>
        <label>출처 이름<input value={draft.sourceName} onChange={(event) => set("sourceName", event.target.value)} /></label>
        <label className="span-2">출처 URL<input type="url" value={draft.sourceUrl} onChange={(event) => set("sourceUrl", event.target.value)} /></label>
        <label className="span-2">보조 출처 URL<input type="url" value={draft.secondarySourceUrl} onChange={(event) => set("secondarySourceUrl", event.target.value)} /></label>
        <label className="span-2">수집 메모<textarea value={draft.evidenceNote} onChange={(event) => set("evidenceNote", event.target.value)} /></label>
        <label className="span-2">내 검증 메모<textarea value={draft.reviewerNote} onChange={(event) => set("reviewerNote", event.target.value)} placeholder="방문일, 실제 메뉴, 이전 여부 등을 기록하세요" /></label>
      </div>

      <div className="source-links">
        {draft.sourceUrl ? <a href={draft.sourceUrl} target="_blank" rel="noreferrer">1차 출처 열기 ↗</a> : null}
        {draft.secondarySourceUrl ? <a href={draft.secondarySourceUrl} target="_blank" rel="noreferrer">보조 출처 열기 ↗</a> : null}
      </div>
      <div className="verify-actions">
        <button className="save-button" disabled={saving} onClick={() => void save()}>{saving ? "저장 중…" : "수정 저장"}</button>
        <button className="verify-button" disabled={saving} onClick={() => void save("verified")}>검증 완료</button>
        <button disabled={saving} onClick={() => void save("hold")}>보류</button>
        <button disabled={saving} onClick={() => void save("rejected")}>제외</button>
      </div>
      {message ? <p className="save-message" role="status">{message}</p> : null}
    </article>
  );
}

async function fetchCandidates() {
  const response = await fetch("/api/verification", { cache: "no-store" });
  const result = (await response.json()) as { candidates?: VerificationCandidate[]; error?: string };
  if (!response.ok) throw new Error(result.error || "DB를 불러오지 못했습니다.");
  return result.candidates ?? [];
}

export default function VerificationPage() {
  const [candidates, setCandidates] = useState<VerificationCandidate[]>([]);
  const [status, setStatus] = useState<CandidateStatus | "all">("pending");
  const [area, setArea] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    try {
      setCandidates(await fetchCandidates());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "DB를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchCandidates()
      .then((result) => {
        if (!cancelled) {
          setCandidates(result);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "DB를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const areas = useMemo(() => ["전체", ...new Set(candidates.map((candidate) => candidate.area))], [candidates]);
  const shown = candidates.filter((candidate) =>
    (status === "all" || candidate.status === status) && (area === "전체" || candidate.area === area),
  );
  const counts = useMemo(() => Object.fromEntries(
    (["pending", "verified", "hold", "rejected"] as CandidateStatus[]).map((item) => [item, candidates.filter((candidate) => candidate.status === item).length]),
  ) as Record<CandidateStatus, number>, [candidates]);

  return (
    <main className="verify-page">
      <header className="verify-hero">
        <Link href="/" className="back-link">← や！- 라멘 추천 맵</Link>
        <div>
          <span className="eyebrow">REAL DATA WORKBENCH</span>
          <h1>실데이터 검증실</h1>
          <p>후보 정보를 직접 확인하고 수정하세요. <strong>검증 완료</strong>한 매장만 지도 검색과 챗봇 추천에 공개됩니다.</p>
        </div>
        <button className="new-button" onClick={() => setShowNew((open) => !open)}>+ 아는 매장 추가</button>
      </header>

      <section className="verify-summary" aria-label="검증 현황">
        {(["pending", "verified", "hold", "rejected"] as CandidateStatus[]).map((item) => (
          <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>
            <strong>{counts[item] ?? 0}</strong><span>{STATUS_LABELS[item]}</span>
          </button>
        ))}
      </section>

      {showNew ? <CandidateCard candidate={{ ...EMPTY_CANDIDATE }} onSaved={async () => { await load(); setShowNew(false); }} /> : null}

      <div className="verify-toolbar">
        <div className="status-tabs">
          <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>전체</button>
          <button className={status === "pending" ? "active" : ""} onClick={() => setStatus("pending")}>검증 대기</button>
          <button className={status === "verified" ? "active" : ""} onClick={() => setStatus("verified")}>검증 완료</button>
          <button className={status === "hold" ? "active" : ""} onClick={() => setStatus("hold")}>보류</button>
          <button className={status === "rejected" ? "active" : ""} onClick={() => setStatus("rejected")}>제외</button>
        </div>
        <label>지역<select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>

      {loading ? <p className="verify-state">검증 DB를 불러오는 중…</p> : null}
      {error ? <p className="verify-state error">{error}</p> : null}
      {!loading && !error && !shown.length ? <p className="verify-state">이 조건에 해당하는 후보가 없습니다.</p> : null}
      <section className="verify-list">{shown.map((candidate) => <CandidateCard candidate={candidate} onSaved={load} key={`${candidate.id}-${candidate.updatedAt}`} />)}</section>
    </main>
  );
}
