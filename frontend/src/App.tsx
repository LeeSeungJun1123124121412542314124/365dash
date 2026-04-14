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
import { getToken } from "./api/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
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
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
