import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import apiClient from "../api/client";

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  branch_id: number | null;
  group_id: number | null;
  is_active: boolean;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  group_id: number;
}

interface UserFormData {
  username: string;
  password: string;
  display_name: string;
  role: string;
  branch_id: string;
  group_id: string;
}

const ROLES = [
  { value: "admin", label: "관리자" },
  { value: "general_manager", label: "총괄" },
  { value: "branch_manager", label: "지점장" },
  { value: "staff", label: "직원" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  general_manager: "총괄",
  branch_manager: "지점장",
  staff: "직원",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700",
  general_manager: "bg-blue-100 text-blue-700",
  branch_manager: "bg-green-100 text-green-700",
  staff: "bg-gray-100 text-gray-600",
};

const EMPTY_FORM: UserFormData = {
  username: "",
  password: "",
  display_name: "",
  role: "staff",
  branch_id: "",
  group_id: "",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 데이터 조회
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get("/users")).data,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => (await apiClient.get("/branches/groups")).data,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => (await apiClient.get("/branches")).data,
  });

  // 생성
  const createMutation = useMutation({
    mutationFn: async (data: object) => (await apiClient.post("/users", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail ?? "생성 중 오류가 발생했습니다.");
    },
  });

  // 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) =>
      (await apiClient.patch(`/users/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail ?? "수정 중 오류가 발생했습니다.");
    },
  });

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteConfirm(null);
    },
  });

  // 비활성 토글
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) =>
      (await apiClient.patch(`/users/${id}`, { is_active })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      display_name: user.display_name,
      role: user.role,
      branch_id: user.branch_id ? String(user.branch_id) : "",
      group_id: user.group_id ? String(user.group_id) : "",
    });
    setFormError(null);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleSubmit() {
    if (!form.display_name.trim()) {
      setFormError("이름을 입력하세요.");
      return;
    }
    if (modalMode === "create") {
      if (!form.username.trim()) { setFormError("아이디를 입력하세요."); return; }
      if (!form.password.trim()) { setFormError("비밀번호를 입력하세요."); return; }
      createMutation.mutate({
        username: form.username,
        password: form.password,
        display_name: form.display_name,
        role: form.role,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        group_id: form.group_id ? Number(form.group_id) : null,
      });
    } else if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          display_name: form.display_name,
          role: form.role,
          branch_id: form.branch_id ? Number(form.branch_id) : null,
          group_id: form.group_id ? Number(form.group_id) : null,
          ...(form.password ? { password: form.password } : {}),
        },
      });
    }
  }

  const filteredBranches = form.group_id
    ? branches.filter((b) => b.group_id === Number(form.group_id))
    : branches;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">사용자 관리</h2>
          <p className="text-xs text-gray-400 mt-0.5">총 {users.length}명</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <UserPlus size={15} />
          사용자 추가
        </button>
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        {usersLoading ? (
          <div className="p-10 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">아이디</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">이름</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">역할</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">그룹</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">지점</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">상태</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const groupName = groups.find((g) => g.id === user.group_id)?.name ?? "-";
                  const branchName = branches.find((b) => b.id === user.branch_id)?.name ?? "-";
                  return (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{user.id}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{user.username}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{user.display_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{groupName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{branchName}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            user.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-500 hover:bg-red-200"
                          }`}
                        >
                          {user.is_active ? "활성" : "비활성"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteMutation.mutate(user.id)}
                                className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                      사용자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 생성/수정 모달 */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">
                {modalMode === "create" ? "사용자 추가" : "사용자 수정"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="px-6 py-5 space-y-4">
              {/* 아이디 (생성 시만) */}
              {modalMode === "create" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">아이디 *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="로그인 아이디"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              )}

              {/* 이름 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">이름 *</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="표시 이름"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  비밀번호 {modalMode === "edit" && <span className="text-gray-400 font-normal">(변경 시에만 입력)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={modalMode === "create" ? "비밀번호" : "변경할 비밀번호"}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* 역할 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">역할 *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* 그룹 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">그룹</label>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: e.target.value, branch_id: "" })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  <option value="">전체 (미지정)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 지점 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">지점</label>
                <select
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  <option value="">미지정</option>
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* 에러 메시지 */}
              {formError && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-xl px-3 py-2 text-xs">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "처리 중..."
                  : modalMode === "create" ? "추가" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
