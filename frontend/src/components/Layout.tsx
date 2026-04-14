import { Link, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "메인 대시보드" },
  { path: "/participation", label: "참여율" },
  { path: "/nps", label: "NPS" },
  { path: "/praise", label: "칭찬현황" },
  { path: "/complaint", label: "불만현황" },
  { path: "/upload", label: "데이터 업로드" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-gray-700">HA 대시보드</div>
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded text-sm mb-1 ${
                location.pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {/* TODO: 접속자명/지점명 표시 영역 */}
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
