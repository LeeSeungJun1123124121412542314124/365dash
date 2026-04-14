import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import MainDashboardPage from "./pages/MainDashboardPage";
import ParticipationPage from "./pages/ParticipationPage";
import NpsPage from "./pages/NpsPage";
import PraisePage from "./pages/PraisePage";
import ComplaintPage from "./pages/ComplaintPage";
import UploadPage from "./pages/UploadPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
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
