import { useState } from "react";

type UploadType = "participation" | "nps" | "praise" | "complaint";

const UPLOAD_LABELS: Record<UploadType, string> = {
  participation: "참여율",
  nps: "NPS",
  praise: "칭찬",
  complaint: "불만",
};

// 화면 7-10: 업로드 게시판 (탭으로 4종 전환)
export default function UploadPage() {
  const [activeType, setActiveType] = useState<UploadType>("participation");

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">데이터 업로드</h2>

      {/* 탭 */}
      <div className="flex gap-2 mb-4 border-b">
        {(Object.keys(UPLOAD_LABELS) as UploadType[]).map((type) => (
          <button
            key={type}
            className={`pb-2 px-4 ${activeType === type ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
            onClick={() => setActiveType(type)}
          >
            {UPLOAD_LABELS[type]}
          </button>
        ))}
      </div>

      <div>
        {/* TODO: 엑셀 파일 선택 + SheetJS 미리보기 */}
        {/* TODO: 컬럼 매핑 검증 결과 표시 */}
        {/* TODO: 업로드 버튼 → POST /api/upload/{type} */}
        {/* TODO: 업로드 이력 테이블 */}
        <p className="text-gray-400">
          {UPLOAD_LABELS[activeType]} 업로드 (구현 예정)
        </p>
      </div>
    </div>
  );
}
