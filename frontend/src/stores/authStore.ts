import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, RoomRole } from "@/types/domain";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from "@/services/apiClient";
import { authClient } from "@/lib/authClient";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingVerificationEmail: string | null;
  roomRoles: Record<string, RoomRole>; // room identifier (UUID or invite code) -> role
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOtp: (email: string, otp: string) => Promise<boolean>;
  sendOtp: (email: string, type: "sign-in" | "email-verification" | "forget-password") => Promise<boolean>;
  register: (input: { email: string; firstName: string; lastName: string; password: string }) => Promise<{
    success: boolean;
    email?: string;
    error?: string;
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setRoomRole: (roomId: string, role: RoomRole) => void;
  getRoomRole: (roomId: string) => RoomRole;
  clearError: () => void;
  clearPendingVerification: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      pendingVerificationEmail: null,
      roomRoles: {
        "room-1": "admin",
        "room-2": "member",
        "room-3": "member",
        "room-4": "owner",
        "A2B-3C4-D5E": "admin",
        "F6G-7H8-J9K": "member",
        "L2M-3N4-P5Q": "member",
        "R6S-7T8-U9V": "owner",
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await apiLogin(email, password);
          if (result.error) {
            const needsVerification = result.error.code === "EMAIL_NOT_VERIFIED";
            set({
              error: result.error.message,
              isLoading: false,
              pendingVerificationEmail: needsVerification ? email : null,
              user: null,
              isAuthenticated: false,
            });
            return false;
          }
          set({
            user: result.data,
            isAuthenticated: true,
            isLoading: false,
            pendingVerificationEmail: null,
          });
          return true;
        } catch (e) {
          set({ error: "Login fehlgeschlagen", isLoading: false });
          return false;
        }
      },

      loginWithOtp: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          await authClient.signIn.emailOtp({ email, otp });
          const result = await getCurrentUser();
          if (result.data) {
            set({
              user: result.data,
              isAuthenticated: true,
              isLoading: false,
              pendingVerificationEmail: null,
            });
            return true;
          }
          set({ error: "Login fehlgeschlagen", isLoading: false });
          return false;
        } catch (e) {
          set({ error: "Login fehlgeschlagen", isLoading: false });
          return false;
        }
      },

      sendOtp: async (email, type) => {
        try {
          await authClient.emailOtp.sendVerificationOtp({ email, type });
          return true;
        } catch (e) {
          set({ error: "OTP konnte nicht gesendet werden" });
          return false;
        }
      },

      register: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const result = await apiRegister(input);
          if (result.error) {
            set({ error: result.error.message, isLoading: false });
            return { success: false, error: result.error.message };
          }
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            pendingVerificationEmail: result.data?.email ?? input.email,
          });
          return { success: true, email: result.data?.email ?? input.email };
        } catch (e) {
          set({ error: "Registrierung fehlgeschlagen", isLoading: false });
          return { success: false, error: "Registrierung fehlgeschlagen" };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        await apiLogout();
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          pendingVerificationEmail: null,
        });
      },

      refresh: async () => {
        set({ isLoading: true });
        try {
          const result = await getCurrentUser();
          if (result.data) {
            set({ 
              user: result.data, 
              isAuthenticated: true, 
              isLoading: false,
              pendingVerificationEmail: null,
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
            });
          }
        } catch {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
          });
        }
      },

      setRoomRole: (roomId: string, role: RoomRole) => {
        set((state) => ({
          roomRoles: { ...state.roomRoles, [roomId]: role },
        }));
      },

      getRoomRole: (roomId: string) => {
        return get().roomRoles[roomId] || "member";
      },

      clearError: () => set({ error: null }),
      clearPendingVerification: () => set({ pendingVerificationEmail: null }),
    }),
    {
      name: "eventhorizon-auth",
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        roomRoles: state.roomRoles,
      }),
    }
  )
);
