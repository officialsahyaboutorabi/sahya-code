// New Sahya Code keys
const SAHYA_AUTH_TOKEN_KEY = "sahya_auth_token";
const SAHYA_AUTH_TOKEN_TIMESTAMP_KEY = "sahya_auth_token_ts";

// Legacy Kimi keys for migration
const LEGACY_AUTH_TOKEN_KEY = "kimi_auth_token";
const LEGACY_AUTH_TOKEN_TIMESTAMP_KEY = "kimi_auth_token_ts";

const AUTH_TOKEN_PARAM = "token";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getStorageKeys(): { tokenKey: string; timestampKey: string } {
  // Check if we have data in new Sahya keys
  if (localStorage.getItem(SAHYA_AUTH_TOKEN_KEY)) {
    return {
      tokenKey: SAHYA_AUTH_TOKEN_KEY,
      timestampKey: SAHYA_AUTH_TOKEN_TIMESTAMP_KEY,
    };
  }
  // Fall back to legacy Kimi keys
  return {
    tokenKey: LEGACY_AUTH_TOKEN_KEY,
    timestampKey: LEGACY_AUTH_TOKEN_TIMESTAMP_KEY,
  };
}

function migrateToNewKeys(token: string, timestamp: string): void {
  localStorage.setItem(SAHYA_AUTH_TOKEN_KEY, token);
  localStorage.setItem(SAHYA_AUTH_TOKEN_TIMESTAMP_KEY, timestamp);
  // Keep legacy keys for backward compatibility with other tabs
}

export function getAuthToken(): string | null {
  const { tokenKey, timestampKey } = getStorageKeys();
  const token = localStorage.getItem(tokenKey);
  if (!token) {
    return null;
  }

  // Check if token has expired
  const timestamp = localStorage.getItem(timestampKey);
  if (timestamp) {
    const storedAt = parseInt(timestamp, 10);
    if (Number.isNaN(storedAt)) {
      // Treat non-parsable timestamps as expired/corrupted
      clearAuthToken();
      return null;
    }
    const age = Date.now() - storedAt;
    if (age > TOKEN_EXPIRY_MS) {
      clearAuthToken();
      return null;
    }
  }

  // Migrate to new keys if using legacy
  if (tokenKey === LEGACY_AUTH_TOKEN_KEY) {
    migrateToNewKeys(token, timestamp || Date.now().toString());
  }

  return token;
}

export function setAuthToken(token: string): void {
  localStorage.setItem(SAHYA_AUTH_TOKEN_KEY, token);
  localStorage.setItem(SAHYA_AUTH_TOKEN_TIMESTAMP_KEY, Date.now().toString());
  // Also update legacy keys for backward compatibility
  localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_AUTH_TOKEN_TIMESTAMP_KEY, Date.now().toString());
}

export function clearAuthToken(): void {
  // Clear both new and legacy keys
  localStorage.removeItem(SAHYA_AUTH_TOKEN_KEY);
  localStorage.removeItem(SAHYA_AUTH_TOKEN_TIMESTAMP_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_TIMESTAMP_KEY);
}

export function consumeAuthTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(AUTH_TOKEN_PARAM);
  if (!token) {
    return null;
  }
  url.searchParams.delete(AUTH_TOKEN_PARAM);
  window.history.replaceState({}, "", url.toString());
  return token;
}

export function getAuthHeader(): Record<string, string> {
  let token = getAuthToken();
  // Fallback: try reading from URL if localStorage is empty
  if (!token) {
    const url = new URL(window.location.href);
    token = url.searchParams.get(AUTH_TOKEN_PARAM);
  }
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
