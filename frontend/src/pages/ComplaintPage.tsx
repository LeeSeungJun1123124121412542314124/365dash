import { useState } from "react";

// 화면 5+6: 불만현황 (탭1: 막대 클러스터 / 탭2: 키워드 테이블)
export default function ComplaintPage() {
  const [tab, setTab] = useState<"overview" | "keywords">("overview");

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">불만현황</h2>

      {/* 탭 */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          className={`pb-2 px-4 ${tab === "overview" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
          onClick={() => setTab("overview")}
        >
          불만 현황
        </button>
        <button
          className={`pb-2 px-4 ${tab === "keywords" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
          onClick={() => setTab("keywords")}
        >
          키워드
        </button>
      </div>

      {tab === "overview" && (
        <div>
          {/* TODO: 필터 (기간 / 대분류 / 중분류) */}
          {/* TODO: 스코어카드 — 기준값 불만총계 / 필터값 불만총계 */}
          {/* TODO: 막대 클러스터 그래프 — 기준값 vs 필터값 */}
          {/* TODO: 기준값숨기기 버튼 */}
          <p className="text-gray-400">탭1 — 불만 현황 (구현 예정)</p>
        </div>
      )}

      {tab === "keywords" && (
        <div>
          {/* TODO: 필터 (연 / 월 / 대분류 / 중분류) */}
          {/* TODO: 8개 카테고리 컬럼 테이블 (주차/안내응대/대기/불친절/시스템/개인정보/환경/기타) */}
          <p className="text-gray-400">탭2 — 키워드 테이블 (구현 예정)</p>
        </div>
      )}
    </div>
  );
}
