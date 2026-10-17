// Configuration for API endpoints.
// Backend URL resolution (first match wins):
//   1. localStorage "openshorts.backend" (set from the in-app "Backend" settings panel / ?backend=)
//   2. VITE_API_URL at build time
//   3. '' (relative paths, proxied in dev)
// Optional access token (OPENSHORTS_ACCESS_TOKEN on the server): sent as the
// X-OpenShorts-Token header by fetch() and as ?ost= on URLs built here, so
// <video>/<img>/download links work on mobile too. (moha700m/OpenShorts addition)

const LS_BACKEND = 'openshorts.backend';
const LS_TOKEN = 'openshorts.token';
const LS_GEMINI = 'gemini_key'; // read by App.jsx as the user's Gemini API key

function readLS(k) {
  try { return localStorage.getItem(k) || ''; } catch { return ''; }
}

// Allow one-tap setup links: https://<pages>/?backend=https://x&token=y&gemini=KEY
// Also accepted inside the hash (…/#app?gemini=KEY) because some share sheets /
// link builders put the query after '#'. Runs synchronously before React mounts,
// so App.jsx's useState(localStorage.gemini_key) already sees the value.
try {
  const q = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hi = hash.indexOf('?');
  const hq = new URLSearchParams(hi >= 0 ? hash.slice(hi + 1) : '');
  const pick = (...names) => {
    for (const n of names) { const v = q.get(n) || hq.get(n); if (v && v.trim()) return v.trim(); }
    return '';
  };
  const backend = pick('backend');
  const token = pick('token');
  const gemini = pick('gemini', 'gemini_key');
  if (backend) localStorage.setItem(LS_BACKEND, backend.replace(/\/$/, ''));
  if (token) localStorage.setItem(LS_TOKEN, token);
  // ?gemini=<key> → same storage the Gemini key setting uses (App.jsx 'gemini_key'),
  // sent to the backend as the X-Gemini-Key header per request.
  if (gemini) localStorage.setItem(LS_GEMINI, gemini);
  const KEYS = ['backend', 'token', 'gemini', 'gemini_key'];
  if (KEYS.some((k) => q.has(k) || hq.has(k))) {
    KEYS.forEach((k) => { q.delete(k); hq.delete(k); });
    const rest = q.toString();
    const hrest = hq.toString();
    const newHash = hi >= 0 ? hash.slice(0, hi) + (hrest ? `?${hrest}` : '') : hash;
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + newHash);
  }
} catch { /* non-browser / storage blocked */ }

// This app ships no service worker. Unregister any stale one (e.g. from an older
// build or another app on this origin) so an old cached index.html can't be served.
try {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  }
} catch { /* ignore */ }

export const API_BASE_URL = (readLS(LS_BACKEND) || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const ACCESS_TOKEN = readLS(LS_TOKEN);

export const saveBackendSettings = (backend, token) => {
  localStorage.setItem(LS_BACKEND, (backend || '').trim().replace(/\/$/, ''));
  localStorage.setItem(LS_TOKEN, (token || '').trim());
};

const isOurApi = (url) => {
  if (!API_BASE_URL) return url.startsWith('/');
  return url.startsWith(API_BASE_URL);
};

export const withToken = (url) => {
  if (!ACCESS_TOKEN || !isOurApi(url) || /[?&]ost=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}ost=${encodeURIComponent(ACCESS_TOKEN)}`;
};

export const getApiUrl = (path) => {
    if (path.startsWith('http')) return withToken(path);
    // Ensure path starts with / if not present
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return withToken(`${API_BASE_URL}${normalizedPath}`);
};

// Attach the access token header to every fetch() aimed at our backend.
if (typeof window !== 'undefined' && ACCESS_TOKEN && !window.__openshortsFetchPatched) {
  window.__openshortsFetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (isOurApi(url)) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
      headers.set('X-OpenShorts-Token', ACCESS_TOKEN);
      init = { ...init, headers };
    }
    return orig(input, init);
  };
}
