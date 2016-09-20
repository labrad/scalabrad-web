/**
 * Credential for logging in with username and password.
 */
export interface Password {
  kind: 'username+password';
  username: string;
  password: string;
}

/**
 * Credential for logging in with OAuth.
 */
export interface OAuthToken {
  kind: 'oauth_token';
  clientId: string;
  clientSecret: string;
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken?: string;
  tokenType?: string;
}

export type Credential = Password | OAuthToken;

/**
 * Load credential from the given Storage object (session or local).
 *
 * If valid a credential is not found, return null.
 */
export function loadCredential(manager: string, storage: Storage): Credential {
  try {
    return JSON.parse(storage.getItem(storageKey(manager))) as Credential;
  } catch (e) {
    return null;
  }
}

/**
 * Save credential to the given Storage object.
 */
export function saveCredential(manager: string, storage: Storage,
                               credential: Credential) {
  storage.setItem(storageKey(manager), JSON.stringify(credential));
}

/**
 * Clear credential from the given Storage object.
 */
export function clearCredential(manager: string, storage: Storage): void {
  storage.removeItem(storageKey(manager));
}

function storageKey(manager: string): string {
  var key = 'labrad-credentials';
  if (manager) {
    key = `${key}.${manager}`;
  }
  return key;
}

