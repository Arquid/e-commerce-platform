import type { CookieOptions, Response } from "express";
import ms from "ms";

export const AUTH_COOKIE_NAME = "token";

// httpOnly keeps the JWT out of reach of any client-side JS (and therefore
// any XSS payload) — unlike storing it in localStorage, where a single
// injected <script> could read it directly.
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ms((process.env.JWT_EXPIRES_IN || "7d") as ms.StringValue),
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
}

export function clearAuthCookie(res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
}
