import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { useGetUsersQuery, useUpdateUserRoleMutation } from "../features/admin/usersApiSlice";
import type { UserRole } from "../features/admin/usersApiSlice";
import Pagination from "../components/Pagination";

const roleOptions: UserRole[] = ["customer", "admin"];

const roleStyles: Record<UserRole, string> = {
  customer: "bg-slate-100 text-slate-700",
  admin: "bg-blue-50 text-blue-700",
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetUsersQuery({ page, limit: 10 });
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [failedUserId, setFailedUserId] = useState<string | null>(null);
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setFailedUserId(null);
    try {
      await updateUserRole({ id: userId, role }).unwrap();
    } catch {
      setFailedUserId(userId);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Manage users</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading users...</p>}

      {!isLoading && data?.users.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          No users yet.
        </p>
      )}

      {!isLoading && data && data.users.length > 0 && (
        <>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {data.users.map((u) => {
              const isSelf = u._id === currentUserId;
              return (
                <div key={u._id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium text-slate-900">
                      {u.name} {isSelf && <span className="text-xs font-normal text-slate-400">(you)</span>}
                    </p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      title={isSelf ? "You cannot change your own role" : undefined}
                      onChange={(e) => handleRoleChange(u._id, e.target.value as UserRole)}
                      className={`rounded-full border-0 px-3 py-1 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${roleStyles[u.role]}`}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {failedUserId === u._id && (
                      <span className="text-xs text-red-600">Update failed — try again</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
