export const APP_USERS = {
  matt: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "matt",
    displayName: "Matt",
  },
  chris: {
    id: "00000000-0000-0000-0000-000000000002",
    name: "chris",
    displayName: "Chris",
  },
} as const;

export type AppUserName = keyof typeof APP_USERS;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_APP_USER = APP_USERS.matt;

export function resolveAppUserId(candidate?: string | null): string {
  const normalized = candidate?.trim().toLowerCase();

  if (!normalized) {
    return DEFAULT_APP_USER.id;
  }

  if (normalized in APP_USERS) {
    return APP_USERS[normalized as AppUserName].id;
  }

  if (UUID_PATTERN.test(normalized)) {
    return normalized;
  }

  return DEFAULT_APP_USER.id;
}

export function getCurrentAppUserId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_APP_USER.id;
  }

  return resolveAppUserId(window.localStorage.getItem("amc8_current_user"));
}
