import { useQuery } from "@tanstack/react-query";
import apiClient from "./client";

// ── 타입 ────────────────────────────────────────────────────────

export interface ChartPoint {
  label: string;
  value?: number | null;
  baseline?: number | null;
}

export interface ScoreCardData {
  label: string;
  value?: number | null;
  unit: string;
  change?: number | null;
}

export interface BranchGroup {
  id: number;
  name: string;
  code: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  group_id: number;
  group_name: string;
}

// ── 공통 파라미터 ────────────────────────────────────────────────

interface FilterParams {
  months?: number;
  year?: number | null;
  month?: number | null;
  group_id?: number | null;
  branch_id?: number | null;
}

// ── 지점 목록 ────────────────────────────────────────────────────

export function useGroups() {
  return useQuery<BranchGroup[]>({
    queryKey: ["groups"],
    queryFn: () => apiClient.get("/branches/groups").then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useBranches(group_id?: number | null) {
  return useQuery<Branch[]>({
    queryKey: ["branches", group_id],
    queryFn: () =>
      apiClient
        .get("/branches", { params: group_id ? { group_id } : {} })
        .then((r) => r.data),
    staleTime: Infinity,
  });
}

// ── 메인 대시보드 ─────────────────────────────────────────────────

export function useDashboardMain(months = 6) {
  return useQuery({
    queryKey: ["dashboard", "main", months],
    queryFn: () =>
      apiClient.get("/dashboard/main", { params: { months } }).then((r) => r.data),
  });
}

// ── 참여율 ────────────────────────────────────────────────────────

export function useParticipationSummary(params: FilterParams) {
  return useQuery({
    queryKey: ["participation", "summary", params],
    queryFn: () =>
      apiClient
        .get("/participation/summary", { params: cleanParams(params) })
        .then((r) => r.data),
  });
}

// ── NPS ─────────────────────────────────────────────────────────

export function useNpsSummary(params: FilterParams & { nps_level?: string }) {
  return useQuery({
    queryKey: ["nps", "summary", params],
    queryFn: () =>
      apiClient
        .get("/nps/summary", { params: cleanParams(params) })
        .then((r) => r.data),
  });
}

// ── 칭찬 ────────────────────────────────────────────────────────

export function usePraiseSummary(params: FilterParams) {
  return useQuery({
    queryKey: ["praise", "summary", params],
    queryFn: () =>
      apiClient
        .get("/praise/summary", { params: cleanParams(params) })
        .then((r) => r.data),
  });
}

// ── 불만 ────────────────────────────────────────────────────────

export function useComplaintSummary(params: FilterParams) {
  return useQuery({
    queryKey: ["complaint", "summary", params],
    queryFn: () =>
      apiClient
        .get("/complaint/summary", { params: cleanParams(params) })
        .then((r) => r.data),
  });
}

export function useComplaintKeywords(params: {
  year?: number | null;
  month?: number | null;
  group_id?: number | null;
  branch_id?: number | null;
}) {
  return useQuery({
    queryKey: ["complaint", "keywords", params],
    queryFn: () =>
      apiClient
        .get("/complaint/keywords", { params: cleanParams(params) })
        .then((r) => r.data),
  });
}

// ── 유틸 ─────────────────────────────────────────────────────────

function cleanParams(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null)
  );
}
