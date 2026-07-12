import { reportError } from '../api/admin_api.js';
import { getSession }  from './auth.js';

const LS_KEY     = 'fdr_err_last';
const COOLDOWN   = 5 * 60 * 1000;
const MAX_STORED = 20;

function getUserInfo() {
    try {
        const user = getSession()?.user;
        return { email: user?.email || null, role: user?.user_metadata?.role || null };
    } catch {
        return { email: null, role: null };
    }
}

function getStored() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function shouldReport(fp) {
    const now     = Date.now();
    const entries = getStored();
    return !entries.some(e => e.fp === fp && now - e.ts < COOLDOWN);
}

function markReported(fp) {
    let entries = getStored().filter(e => e.fp !== fp);
    entries.push({ fp, ts: Date.now() });
    if (entries.length > MAX_STORED) entries = entries.slice(-MAX_STORED);
    try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch { /* */ }
}

function handleError(message, source) {
    if (!message) return;
    const fp = (message + '|' + (source || '')).slice(0, 150);
    if (!shouldReport(fp)) return;
    markReported(fp);
    const { email, role } = getUserInfo();
    reportError({
        message:   String(message).slice(0, 500),
        source:    String(source  || '').slice(0, 200),
        userEmail: email,
        userRole:  role,
        page:      window.location.pathname,
    });
}

window.onerror = function(message, url, line) {
    handleError(message, url ? `${url}:${line}` : '');
};

window.addEventListener('unhandledrejection', function(event) {
    const msg = event.reason?.message || String(event.reason) || 'Unhandled rejection';
    const src = event.reason?.stack?.split('\n')[1]?.trim() || '';
    handleError(msg, src);
});
