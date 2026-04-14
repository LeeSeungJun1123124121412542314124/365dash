import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import apiClient from "../api/client";

type UploadType = "participation" | "nps" | "praise" | "complaint";

const UPLOAD_LABELS: Record<UploadType, { label: string; desc: string; cols: string[] }> = {
  participation: {
    label: "참여율",
    desc: "연도 / 월 / 지점명 / 참여대상 / 참여자 수",
    cols: ["연도", "월", "지점명", "참여대상", "참여자 수"],
  },
  nps: {
    label: "NPS",
    desc: "연도 / 월 / 일 / 지점명 / 매우만족(개수) / 만족(개수) / 보통(개수) / 불만족(개수) / 매우불만족(개수)",
    cols: ["연도", "월", "일", "지점명", "매우만족(개수)", "만족(개수)", "보통(개수)", "불만족(개수)", "매우불만족(개수)"],
  },
  praise: {
    label: "칭찬",
    desc: "No. / 유입경로 / 지점명 / 연도 / 월 / 일 / 칭찬내용 / 칭찬대상자 (행 단위)",
    cols: ["No.", "유입경로", "지점명", "연도", "월", "일", "칭찬내용", "칭찬대상자"],
  },
  complaint: {
    label: "불만",
    desc: "No. / 연도 / 월 / 일 / 지점명 / 유입경로 / 불만내용 / 불만카테고리선택 (행 단위)",
    cols: ["No.", "연도", "월", "일", "지점명", "유입경로", "불만내용", "불만카테고리선택"],
  },
};

interface UploadResult {
  success: boolean;
  uploaded_count: number;
  errors: Array<{ row: number; column: string; message: string; value?: any }>;
}

// SheetJS로 엑셀 파싱 → 헤더 + 행 배열 반환
function parseExcel(file: File): Promise<{ headers: string[]; rows: any[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });
        const headers = (raw[0] ?? []).map(String);
        const rows = raw.slice(1).filter((r) => r.some((c) => c !== ""));
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const PREVIEW_ROWS = 5; // 미리보기 최대 행 수

export default function UploadPage() {
  const [activeType, setActiveType] = useState<UploadType>("participation");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "uploading" | "success" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const info = UPLOAD_LABELS[activeType];

  async function handleFile(f: File) {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setStatus("error");
      setErrorMsg(".xlsx 또는 .xls 파일만 업로드 가능합니다.");
      setFileName(null);
      setFile(null);
      setPreview(null);
      return;
    }
    setFileName(f.name);
    setFile(f);
    setResult(null);
    setErrorMsg(null);

    // SheetJS 클라이언트 미리보기 파싱
    try {
      const parsed = await parseExcel(f);
      setPreview(parsed);
      // 필수 컬럼 누락 검사
      const missing = info.cols.filter((c) => !parsed.headers.includes(c));
      setMissingCols(missing);
      setStatus(missing.length === 0 ? "ready" : "error");
      if (missing.length > 0) {
        setErrorMsg(`필수 컬럼 누락: ${missing.join(", ")}`);
      }
    } catch {
      setPreview(null);
      setMissingCols([]);
      setStatus("ready"); // 파싱 실패해도 서버로 전송은 허용
    }
  }

  function reset() {
    setFileName(null);
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
    setPreview(null);
    setMissingCols([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await apiClient.post<UploadResult>(
        `/upload/${activeType}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(data);
      setStatus(data.success ? "success" : "error");
      if (!data.success && data.errors.length > 0) {
        setErrorMsg(`${data.errors.length}개 행에 오류가 있습니다.`);
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.detail ?? "업로드 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="space-y-5">
      {/* 탭 선택 */}
      <div className="card p-1 flex gap-1 w-fit">
        {(Object.keys(UPLOAD_LABELS) as UploadType[]).map((type) => (
          <button
            key={type}
            onClick={() => { setActiveType(type); reset(); }}
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
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-violet-400 bg-violet-50"
                : status === "ready"
                ? "border-green-300 bg-green-50"
                : status === "error" && fileName
                ? "border-red-300 bg-red-50"
                : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {fileName ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet size={40} className={missingCols.length > 0 ? "text-red-400" : "text-green-500"} />
                <p className="text-sm font-medium text-gray-700">{fileName}</p>
                <p className="text-xs text-gray-400">
                  {preview ? `${preview.rows.length}행 감지됨` : "파일 선택됨"}
                  {" — 아래 업로드 버튼을 클릭하세요"}
                </p>
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

          {/* 결과 메시지 */}
          {status === "success" && result && (
            <div className="flex items-start gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3 text-sm">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>업로드 성공! {result.uploaded_count}건 처리 완료</span>
            </div>
          )}
          {(status === "error" || missingCols.length > 0) && errorMsg && (
            <div className="flex items-start gap-2 text-red-500 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 서버 행별 에러 목록 */}
          {result?.errors && result.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl px-4 py-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-500">
                  {e.row}행 [{e.column}]: {e.message}
                  {e.value != null && <span className="text-gray-400"> (값: {String(e.value)})</span>}
                </p>
              ))}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              disabled={status !== "ready"}
              onClick={handleUpload}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
            >
              {status === "uploading" ? "업로드 중..." : "업로드"}
            </button>
            {fileName && (
              <button
                onClick={reset}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 오른쪽: 미리보기 or 컬럼 명세 */}
        <div className="card p-6">
          {preview ? (
            <>
              <h3 className="text-sm font-bold text-gray-700 mb-4">
                미리보기
                <span className="ml-2 text-xs font-normal text-gray-400">
                  (상위 {Math.min(PREVIEW_ROWS, preview.rows.length)}행 / 전체 {preview.rows.length}행)
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th
                          key={i}
                          className={`px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-gray-200 ${
                            missingCols.includes(h)
                              ? "bg-red-50 text-red-500"
                              : info.cols.includes(h)
                              ? "bg-violet-50 text-violet-700"
                              : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50">
                        {preview.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {String(row[ci] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {missingCols.length > 0 && (
                <p className="text-xs text-red-500 mt-3">
                  누락된 필수 컬럼: <span className="font-semibold">{missingCols.join(", ")}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-700 mb-4">업로드 양식 컬럼</h3>
              <div className="space-y-2">
                {info.cols.map((col, i) => (
                  <div key={col} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
