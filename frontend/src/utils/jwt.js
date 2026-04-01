/** Decode JWT `sub` (email) on the client — same value the telemedicine service uses. */
export function getEmailFromJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.sub || null;
  } catch {
    return null;
  }
}
