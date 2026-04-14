import axios from "axios";

const apiClient = axios.create({
  // Vite proxy (/api → localhost:8001) 사용 — 개발/운영 모두 상대 경로
  baseURL: "/api",
  timeout: 30000,
});

// JWT 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → 로그인 페이지 리다이렉트
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
