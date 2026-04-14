import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";

type UploadType = "participation" | "nps" | "praise" | "complaint";

const UPLOAD_LABELS: Record<UploadType, { label: string; desc: string; cols: string[] }> = {
  participation: {
    label: "참여율",
    desc: "연도 / 월 / 지점명 / 참여대상 / 참여자",
    cols: ["연도", "월", "지점명", "참여대상", "참여자"],
  },
  nps: {
    label: "NPS",
    desc: "연도 / 월 / 지점명 / 매우만족 / 만족 / 보통 / 불만족 / 매우불만족",
    cols: ["연도", "월", "지점명", "매우만족", "만족", "보통", "불만족", "매우불만족"],
  },
  praise: {
    label: "칭찬",
    desc: "연도 / 월 / 지점명 / 수술 / 람스 / 람스+시술",
    cols: ["연도", "월", "지점명", "수술", "람스", "람스+시술"],
  },
  complaint: {
    label: "불만",
    desc: "연도 / 월 / 지점명 / 수술 / 람스 / 람스+시술 + 8개 카테고리 컬럼",
    cols: ["연도", "월", "지점명", "수술", "람스", "람스+시술", "주차", "안내·응대부족", "대기관련", "불친절", "시스템불만", "개인정보", "환경불만", "기타"],
  },
};

export default function UploadPage() {
  const [activeType, setActiveType] = useState<UploadType>("participation");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const info = UPLOAD_LABELS[activeType];

  function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setStatus("error");
      setFileName(null);
      return;
    }
    setFileName(file.name);
    setStatus("ready");
  }

  return (
    <div className="space-y-5">
      {/* 탭 선택 */}
      <div className="card p-1 flex gap-1 w-fit">
        {(Object.keys(UPLOAD_LABELS) as UploadType[]).map((type) => (
          <button
            key={type}
            onClick={() => { setActiveType(type); setFileName(null); setStatus("idle"); }}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeType === type
                ? "bg-violet-600 text-white shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {UPLOAD_LABELS[type].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* 업로드 영역 */}
        <div className="card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">
              {info.label} 데이터 업로드
            </h3>
            <p className="text-xs text-gray-400">{info.desc}</p>
          </div>

          {/* 드래그 앤 드롭 존 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-violet-400 bg-violet-50"
                : status === "ready"
                ? "border-green-300 bg-green-50"
                : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {status === "ready" ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet size={40} className="text-green-500" />
                <p className="text-sm font-medium text-green-700">{fileName}</p>
                <p className="text-xs text-gray-400">파일 선택됨 — 아래 업로드 버튼을 클릭하세요</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={40} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  엑셀 파일을 드래그하거나 클릭해서 선택
                </p>
                <p className="text-xs text-gray-400">.xlsx, .xls 형식 지원</p>
              </div>
            )}
          </div>

          {/* 상태 메시지 */}
          {status === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3 text-sm">
              <CheckCircle size={16} />
              업로드 성공! 데이터가 반영되었습니다.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} />
              .xlsx 또는 .xls 파일만 업로드 가능합니다.
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              disabled={status !== "ready"}
              onClick={() => {
                // TODO: 실제 API 연동
                setStatus("success");
              }}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
            >
              업로드
            </button>
            {fileName && (
              <button
                onClick={() => { setFileName(null); setStatus("idle"); }}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 컬럼 명세 */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">업로드 양식 컬럼</h3>
          <div className="space-y-2">
            {info.cols.map((col, i) => (
              <div
                key={col}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50"
              >
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 font-medium">{col}</span>
                {i < 3 && (
                  <span className="ml-auto text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">
                    필수
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            * 동일 연도/월/지점 데이터 재업로드 시 최신 데이터로 덮어씁니다.
          </p>
        </div>
      </div>
    </div>
  );
}
