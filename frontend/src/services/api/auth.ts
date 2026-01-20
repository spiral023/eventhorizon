import type { ApiResult } from "@/types/api";
import type { User } from "@/types/domain";
import { AuthError, signInWithEmail, signOutUser, signUpWithEmail } from "@/lib/authClient";
import { getMockAdapter, setCachedToken, USE_MOCKS } from "./core";
import { getCurrentUser } from "./users";

export async function login(email: string, password: string): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    const result = await mock.login(email, password);
    if (result.data) {
      setCachedToken("mock-token");
    }
    return result;
  }

  try {
    await signInWithEmail(email, password);
    setCachedToken(null);
    const profile = await getCurrentUser();
    if (profile.data) {
      return { data: profile.data };
    }
    return {
      data: undefined,
      error: profile.error ?? { code: "AUTH_ERROR", message: "Login fehlgeschlagen" },
    };
  } catch (e) {
    if (e instanceof AuthError) {
      const requiresVerification = e.status === 403;
      const message = requiresVerification
        ? "Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben."
        : e.message || "Login fehlgeschlagen";
      return {
        data: undefined,
        error: { code: requiresVerification ? "EMAIL_NOT_VERIFIED" : "AUTH_ERROR", message },
      };
    }
    return {
      data: undefined,
      error: { code: "AUTH_ERROR", message: e instanceof Error ? e.message : "Login fehlgeschlagen" },
    };
  }
}

export async function register(user: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<ApiResult<{ email: string }>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    const result = await mock.register(user);
    if (result.data) {
      setCachedToken("mock-token");
    }
    return result;
  }

  try {
    await signUpWithEmail({
      email: user.email,
      password: user.password,
      name: `${user.firstName} ${user.lastName}`.trim(),
    });
    setCachedToken(null);
    return { data: { email: user.email } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Netzwerkfehler";
    return { data: undefined, error: { code: "NETWORK_ERROR", message } };
  }
}

export async function logout(): Promise<void> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    await mock.logout();
    setCachedToken(null);
    return;
  }

  try {
    await signOutUser();
  } catch (e) {
    console.warn("Better Auth sign out failed", e);
  }
  setCachedToken(null);
}
