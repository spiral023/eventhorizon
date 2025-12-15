import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const AUTH_BASE_PATH = "/api/auth";
const defaultBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

export class AuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL ?? defaultBaseUrl,
  basePath: AUTH_BASE_PATH,
  plugins: [emailOTPClient()],
});

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AUTH_BASE_PATH}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "message" in data && (data as any).message) ||
      (typeof data === "string" ? data : "Authentifizierung fehlgeschlagen");
    throw new AuthError(message as string, response.status);
  }

  return data as T;
}

export async function signInWithEmail(email: string, password: string) {
  return authRequest("/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUpWithEmail(params: { email: string; password: string; name?: string }) {
  return authRequest("/sign-up/email", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function signOutUser() {
  return authRequest("/sign-out", { method: "POST" });
}

export async function fetchJwtToken(): Promise<string | null> {
  try {
    const result = await authRequest<{ token?: string }>("/token", { method: "GET" });
    return result?.token ?? null;
  } catch {
    return null;
  }
}

export async function fetchSession() {
  try {
    return await authRequest<Record<string, unknown>>("/get-session", { method: "GET" });
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo,
  });
}

export async function resetPassword(password: string, token: string) {
  return authClient.resetPassword({
    newPassword: password,
    token,
  });
}

export async function changePassword(currentPassword: string, newPassword: string, revokeOtherSessions: boolean = true) {
  return authClient.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions,
  });
}

export const useBetterAuthSession = authClient.useSession;
