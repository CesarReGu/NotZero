const SESSION_COOKIE = "notzero_session";
const sessionPattern = /^[a-f0-9]{64}$/;

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function operationalSession(request: Request) {
  const existing = cookieValue(request, SESSION_COOKIE);
  const id = sessionPattern.test(existing) ? existing : Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    hash: await sha256(id),
    setCookie: existing === id ? null : `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
  };
}

export async function analysisCacheKey(input: unknown) {
  return sha256(JSON.stringify(input));
}
