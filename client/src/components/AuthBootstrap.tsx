import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useDispatch } from "react-redux";
import { useGetMeQuery } from "../features/auth/authApiSlice";
import { setCredentials } from "../features/auth/authSlice";

// The auth token lives in an httpOnly cookie, so the client can't read it to
// know synchronously whether a returning visitor is logged in — it has to
// ask the server once on load. Route guards (PrivateRoute, AdminRoute) read
// `auth.user` from Redux, which this only populates from inside a useEffect
// (dispatching during render is unsafe) — so gating on the query's own
// `isLoading` isn't enough: the render where `isLoading` first turns false
// still has the *old* (empty) `auth.user`, since the effect that dispatches
// the fetched user hasn't run yet. A guarded route would see no user on that
// render and redirect to /login before ever finding out it was wrong. Gating
// on this separate `hydrated` flag — set true only once the dispatch has
// actually happened — closes that one-render gap.
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const { data, isLoading } = useGetMeQuery();
  const dispatch = useDispatch();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (data) dispatch(setCredentials({ user: data }));
    // `hydrated` must flip one tick *after* the dispatch above, not in the
    // same render as `isLoading` turning false, or children would render
    // (and a route guard would redirect) with the old, pre-dispatch user.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate
    setHydrated(true);
  }, [isLoading, data, dispatch]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
