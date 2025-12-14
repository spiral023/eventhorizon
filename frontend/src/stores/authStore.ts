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
  roomRoles: Record<string, RoomRole>; // roomId -> role
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOtp: (email: string, otp: string) => Promise<boolean>;
  sendOtp: (email: string, type: "sign-in" | "email-verification" | "forget-password") => Promise<boolean>;
  register: (input: { email: string; firstName: string; lastName: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setRoomRole: (roomId: string, role: RoomRole) => void;
  getRoomRole: (roomId: string) => RoomRole;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      roomRoles: {
        "room-1": "admin",
        "room-2": "member",
        "room-3": "member",
        "room-4": "owner",
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await apiLogin(email, password);
          if (result.error) {
            set({ error: result.error.message, isLoading: false });
            return false;
          }
          set({
            user: result.data,
            isAuthenticated: true,
            isLoading: false,
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
            return false;
          }
          set({
            user: result.data,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (e) {
          set({ error: "Registrierung fehlgeschlagen", isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        await apiLogout();
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
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
              isLoading: false 
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        } catch {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
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
