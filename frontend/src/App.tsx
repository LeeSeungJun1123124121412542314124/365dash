import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import MainDashboardPage from "./pages/MainDashboardPage";
import ParticipationPage from "./pages/ParticipationPage";
import NpsPage from "./pages/NpsPage";
import PraisePage from "./pages/PraisePage";
import ComplaintPage from "./pages/ComplaintPage";
import UploadPage from "./pages/UploadPage";
import UsersPage from "./pages/UsersPage";
import { getToken } from "./api/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,  // 30분간 신선 데이터로 취급
      gcTime: 60 * 60 * 1000,    // 1시간 캐시 유지
      refetchOnWindowFocus: false, // 탭 전환 시 재요청 방지
      retry: 1,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<MainDashboardPage />} />
            <Route path="/participation" element={<ParticipationPage />} />
            <Route path="/nps" element={<NpsPage />} />
            <Route path="/praise" element={<PraisePage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
