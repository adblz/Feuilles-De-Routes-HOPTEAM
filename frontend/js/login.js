import { getSession, isSessionValid, connexion, refreshSession } from './modules/auth.js';
import { getLogoBase64 } from './modules/fdr.js';

window.addEventListener('load', async () => {
    document.getElementById('login-logo').src = getLogoBase64();

    let session = getSession();
    if (session && !isSessionValid()) {
        session = await refreshSession();
    }
    if (session?.user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('login-password').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-email').focus();
});

async function handleLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const btn      = document.getElementById('btn-login');

    if (!email || !password) {
        errorEl.textContent = 'Veuillez remplir tous les champs.';
        return;
    }

    errorEl.textContent = '';
    btn.disabled    = true;
    btn.textContent = 'Connexion…';

    try {
        await connexion(email, password);
        window.location.href = 'index.html';
    } catch (err) {
        errorEl.textContent = err.message;
        btn.disabled    = false;
        btn.textContent = 'Se connecter';
    }
}
