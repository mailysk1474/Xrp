const TOKEN_KEY = "xp_token";
const VAULT_KEY = "xp_vault";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getVault() {
  const raw = localStorage.getItem(VAULT_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setVault(username, enc, email) {
  localStorage.setItem(VAULT_KEY, JSON.stringify({ username, enc, email }));
}
export function clearVault() {
  localStorage.removeItem(VAULT_KEY);
}
export function hasVault() {
  return !!localStorage.getItem(VAULT_KEY);
}
