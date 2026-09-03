import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserInfo { id: string; name: string; email: string; role: string; }
interface AuthState { user: UserInfo | null; token: string | null; }

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token")
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: UserInfo; token: string; }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("token", action.payload.token);
    },
    logOut(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }
});

export const { setCredentials, logOut } = authSlice.actions;
export default authSlice.reducer;