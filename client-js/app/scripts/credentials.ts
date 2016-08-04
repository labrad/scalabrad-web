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
}

export type Credential = Password | OAuthToken;

/**
 * Load credential from the given Storage object (session or local).
 *
 * If valid a credential is not found, return null.
 */
export function loadCredential(manager: string, storage: Storage): Credential {
  var key = 'labrad-credentials';
  if (manager) {
    key += '.' + manager;
  }
  try {
    return JSON.parse(storage.getItem(key)) as Credential;
  } catch (e) {
    return null;
  }
}

/**
 * Save credential to the given Storage object.
 */
export function saveCredential(manager: string, storage: Storage,
                               credential: Credential) {
  var key = 'labrad-credentials';
  if (manager) {
    key += '.' + manager;
  }
  storage.setItem(key, JSON.stringify(credential));
}
