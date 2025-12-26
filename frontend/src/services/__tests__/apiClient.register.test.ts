import { describe, it, expect, vi } from "vitest";
import { register } from "@/services/apiClient";
import { signUpWithEmail } from "@/lib/authClient";

vi.mock("@/lib/authClient", () => ({
  AuthError: class AuthError extends Error {},
  fetchJwtToken: vi.fn().mockResolvedValue(null),
  signInWithEmail: vi.fn(),
  signOutUser: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

describe("apiClient.register", () => {
  it("registers a random user", async () => {
    const randomEmail = `test-${Math.random().toString(36).slice(2)}@example.com`;
    const input = {
      email: randomEmail,
      firstName: "Test",
      lastName: "User",
      password: "Password123!",
    };

    const signUpMock = vi.mocked(signUpWithEmail);
    signUpMock.mockResolvedValueOnce({} as unknown as Record<string, unknown>);

    const result = await register(input);

    expect(signUpMock).toHaveBeenCalledWith({
      email: randomEmail,
      password: input.password,
      name: "Test User",
    });
    expect(result.data).toEqual({ email: randomEmail });
    expect(result.error).toBeUndefined();
  });
});
