const STORAGE_KEY = "eventhorizon-pending-room-invite";
export const PENDING_INVITE_EVENT = "eventhorizon:pending-room-invite";

const notifyChange = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PENDING_INVITE_EVENT));
};

const normalizeInviteCode = (inviteCode: string) => inviteCode.trim().toUpperCase();

export const storePendingInviteCode = (inviteCode: string) => {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, normalized);
  notifyChange();
};

export const getPendingInviteCode = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const clearPendingInviteCode = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  notifyChange();
};
