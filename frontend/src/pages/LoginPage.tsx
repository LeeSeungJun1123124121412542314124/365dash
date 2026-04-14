import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen bg-[#f0f2f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-200 mb-3">
            HA
          </div>
          <h1 className="text-xl font-bold text-gray-800">HA 대시보드</h1>
          <p className="text-sm text-gray-400 mt-1">병원 만족도 통합 관리 시스템</p>
        </div>

        {/* 카드 */}
        <div className="card p-7 space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">아이디</label>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-violet-200">
            <LogIn size={16} />
            로그인
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          계정 문의: 시스템 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}
