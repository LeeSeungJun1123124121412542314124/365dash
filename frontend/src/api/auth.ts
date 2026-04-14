import apiClient from "./client";

export interface LoginResult {
  access_token: string;
  token_type: string;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  // OAuth2PasswordRequestForm은 multipart/form-data
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);

  const { data } = await apiClient.post<LoginResult>("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export function saveToken(token: string, role: string) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user_role", role);
}

export function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
}

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function getRole(): string | null {
  return localStorage.getItem("user_role");
}
