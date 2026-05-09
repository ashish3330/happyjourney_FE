import axios, { AxiosError, AxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  // Required so the HttpOnly refreshToken cookie set by the BE is sent on
  // /api/auth/refresh — and so the access cookie ride-alongs work too.
  withCredentials: true,
});

// ─────────────────────────────────────────────────────────────────────
// Request interceptor — attach Bearer access token from localStorage.
// ─────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────
// Refresh-token flow
// ─────────────────────────────────────────────────────────────────────
//
// On any 401:
//   1. If we're already refreshing, queue this request behind the same promise
//      (deduplicates concurrent refreshes when N requests fire at once).
//   2. Hit POST /auth/refresh — the HttpOnly refreshToken cookie is sent
//      automatically by the browser.
//   3. On success: persist the new access token, retry the original request
//      once with the new Authorization header.
//   4. On failure (refresh expired / revoked): clear localStorage and redirect
//      to /login. Let the original error bubble up so callers can handle it.
//
// Endpoints we DO NOT auto-refresh on:
//   - /auth/login, /auth/refresh, /auth/logout — failure here is expected
//     (login wrong-password, refresh expired) and should not loop.
// ─────────────────────────────────────────────────────────────────────

const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/register",
  "/auth/verify-otp",
];

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      // Use a bare axios call (NOT the `api` instance) so this request itself
      // is never intercepted/retried by us. withCredentials carries the cookie.
      const resp = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true, timeout: 10000 }
      );
      const newAccess = resp.data?.accessToken as string | undefined;
      if (newAccess) {
        localStorage.setItem("accessToken", newAccess);
        return newAccess;
      }
      return null;
    } catch {
      return null;
    } finally {
      // Allow another refresh attempt next time around (after this one settles).
      // Using a microtask delay so concurrent callers awaiting refreshPromise
      // see the same resolved value before it's nulled.
      queueMicrotask(() => {
        refreshPromise = null;
      });
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH_PATHS.some((p) => (original.url || "").includes(p))
    ) {
      original._retried = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newAccess}`,
        };
        return api.request(original);
      }
      // Refresh failed — clear state and bounce to login.
      localStorage.removeItem("accessToken");
      // Avoid loops if we're already on /login.
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
