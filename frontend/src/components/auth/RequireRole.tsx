import { useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { RoomRole } from "@/types/domain";

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: RoomRole[];
  fallback?: React.ReactNode;
}

export function RequireRole({ children, allowedRoles, fallback }: RequireRoleProps) {
  const { accessCode } = useParams<{ accessCode: string }>();
  const { getRoomRole } = useAuthStore();

  if (!accessCode) {
    return <>{children}</>;
  }

  const userRole = getRoomRole(accessCode);
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Hook for checking role access
export function useHasRole(allowedRoles: RoomRole[]): boolean {
  const { accessCode } = useParams<{ accessCode: string }>();
  const { getRoomRole } = useAuthStore();

  if (!accessCode) return true;
  
  const userRole = getRoomRole(accessCode);
  return allowedRoles.includes(userRole);
}
