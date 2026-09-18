import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserInfo { id: string; name: string; email: string; role: string; }
export interface AuthState { user: UserInfo | null; }

// The auth token itself now lives only in an httpOnly cookie set by the
// server — nothing here is persisted to localStorage, so there's nothing for
// an XSS payload to steal from this app's own client-side state. `user` is
// just a cache of who's logged in, rehydrated from the server on app load
// (see the bootstrap query in App.tsx) since it can't be read synchronously
// from the cookie.
const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: UserInfo }>) {
      state.user = action.payload.user;
    },
    logOut(state) {
      state.user = null;
    }
  }
});

export const { setCredentials, logOut } = authSlice.actions;
export default authSlice.reducer;
