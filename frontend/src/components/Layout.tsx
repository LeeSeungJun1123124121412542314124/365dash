import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Star, ThumbsDown,
  UploadCloud, Users, LogOut, Bell, Search, ChevronDown,
} from "lucide-react";
import { clearToken, getRole } from "../api/auth";

const NAV_ITEMS = [
  { path: "/",             label: "메인 대시보드",   icon: LayoutDashboard },
  { path: "/participation",label: "참여율",          icon: TrendingUp },
  { path: "/nps",          label: "NPS",             icon: Star },
  { path: "/praise",       label: "칭찬현황",        icon: Star },
  { path: "/complaint",    label: "불만현황",        icon: ThumbsDown },
  { path: "/upload",       label: "데이터 업로드",   icon: UploadCloud },
  { path: "/users",        label: "사용자 관리",     icon: Users, adminOnly: true },
];

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/":              { title: "메인 대시보드",       sub: "전체 지표 요약" },
  "/participation": { title: "모바일만족도 참여율", sub: "지점별 참여 현황" },
  "/nps":           { title: "NPS",                 sub: "순추천지수 분석" },
  "/praise":        { title: "칭찬현황",            sub: "칭찬 데이터 비교" },
  "/complaint":     { title: "불만현황",            sub: "불만 데이터 비교" },
  "/upload":        { title: "데이터 업로드",       sub: "엑셀 파일 업로드" },
  "/users":         { title: "사용자 관리",         sub: "계정 목록 및 권한 관리" },
};

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  general_manager: "총괄",
  branch_manager: "지점담당자",
  staff: "직원",
};

function getInitial(name: string) {
  return name ? name.charAt(0) : "?";
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: "HA 대시보드", sub: "" };

  const displayName = localStorage.getItem("display_name") ?? "사용자";
  const role = getRole() ?? "";
  const isAdmin = role === "admin";

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[#f0f2f9]">
      {/* ── 사이드바 ── */}
      <aside className="w-[220px] min-h-screen bg-[#1e2139] text-white flex flex-col flex-shrink-0">
        {/* 로고 */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center text-white font-bold text-sm">
            HA
          </div>
          <span className="font-bold text-[15px] tracking-tight">HA 대시보드</span>
        </div>

        <div className="mx-4 border-t border-white/10 mb-3" />

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 하단 — 로그아웃 */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.08] w-full transition-all"
          >
            <LogOut size={17} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 오른쪽 영역 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="h-16 bg-white/70 backdrop-blur border-b border-gray-200/60 flex items-center px-6 gap-4 sticky top-0 z-10">
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-800 leading-none">{pageInfo.title}</h1>
            {pageInfo.sub && (
              <p className="text-xs text-gray-400 mt-0.5">{pageInfo.sub}</p>
            )}
          </div>

          {/* 검색 */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5 w-44">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="검색"
              className="bg-transparent text-sm outline-none text-gray-600 placeholder-gray-400 w-full"
            />
          </div>

          {/* 알림 */}
          <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
          </button>

          {/* 사용자 */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitial(displayName)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700 leading-none">{displayName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[role] ?? role}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
