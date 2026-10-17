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
try {
  const q = new URLSearchParams(window.location.search);
  if (q.get('backend')) localStorage.setItem(LS_BACKEND, q.get('backend').replace(/\/$/, ''));
  if (q.get('token')) localStorage.setItem(LS_TOKEN, q.get('token'));
  // ?gemini=<key> → same storage the Gemini key setting uses (App.jsx 'gemini_key'),
  // sent to the backend as the X-Gemini-Key header per request.
  if (q.get('gemini')) localStorage.setItem(LS_GEMINI, q.get('gemini').trim());
  if (q.has('backend') || q.has('token') || q.has('gemini')) {
    q.delete('backend'); q.delete('token'); q.delete('gemini');
    const rest = q.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  }
} catch { /* non-browser */ }

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
