import { useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { RoomRole } from "@/types/domain";

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: RoomRole[];
  fallback?: React.ReactNode;
}

export function RequireRole({ children, allowedRoles, fallback }: RequireRoleProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const { getRoomRole } = useAuthStore();

  if (!roomId) {
    return <>{children}</>;
  }

  const userRole = getRoomRole(roomId);
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Hook for checking role access
export function useHasRole(allowedRoles: RoomRole[]): boolean {
  const { roomId } = useParams<{ roomId: string }>();
  const { getRoomRole } = useAuthStore();

  if (!roomId) return true;
  
  const userRole = getRoomRole(roomId);
  return allowedRoles.includes(userRole);
}
