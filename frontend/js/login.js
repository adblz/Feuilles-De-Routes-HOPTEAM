import { getSession, isSessionValid, connexion, refreshSession } from './modules/auth.js';
import { getLogoBase64 } from './modules/fdr.js';
import { chargerMonProfil } from './modules/db_responsable.js';
import { attachPasswordToggle } from './utils/utils.js';

async function redirigerSelonRole() {
    const profil = await chargerMonProfil();
    if (profil?.role === 'admin')        window.location.href = '/pages/admin.html';
    else if (profil?.role === 'responsable') window.location.href = '/pages/responsable.html';
    else                                 window.location.href = '/index.html';
}

window.addEventListener('load', async () => {
    document.getElementById('login-logo').src = getLogoBase64();

    let session = getSession();
    if (session && !isSessionValid()) {
        session = await refreshSession();
    }
    if (session?.user) {
        await redirigerSelonRole();
        return;
    }

    attachPasswordToggle('login-password', 'toggle-login-password');
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
        await redirigerSelonRole();
    } catch (err) {
        errorEl.textContent = err.message;
        btn.disabled    = false;
        btn.textContent = 'Se connecter';
    }
}
