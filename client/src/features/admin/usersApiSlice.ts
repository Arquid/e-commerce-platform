import { api } from "../api/apiSlice";

export type UserRole = "customer" | "admin";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<UsersResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/users", params: params ?? undefined }),
      providesTags: ["User"],
    }),
    updateUserRole: builder.mutation<AdminUser, { id: string; role: UserRole }>({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: "PATCH", body: { role } }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useGetUsersQuery, useUpdateUserRoleMutation } = usersApi;
