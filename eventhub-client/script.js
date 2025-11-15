document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home-link');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button');
    const createEventButton = document.getElementById('create-event-button');
    const adminDashboardButton = document.getElementById('admin-dashboard-button'); // Bottone per admin dashboard
    const myEventsButton = document.getElementById('my-events-button');
    const backToHomeButton = document.getElementById('back-to-home-button'); // Bottone per tornare alla home

    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const welcomeMessage = document.createElement('span');
    welcomeMessage.id = 'welcome-message';
    userInfo.prepend(welcomeMessage);

    const loginNotifyToggle = document.getElementById('login-notify-toggle');
    const loginNotifyCheckbox = document.getElementById('login-notify-checkbox');

    let currentUser = null;

    const ageOverlay = document.getElementById('age-gate-overlay');
    const ageEnter = document.getElementById('age-enter');
    const ageExit = document.getElementById('age-exit');
    const ageGateNoticeBtn = document.querySelector('.age-gate-notice');
    const noticePage = document.getElementById('notice-page');
    const no18Page = document.getElementById('no18-page');
    let no18OverlayEl = null;
    let no18ImageAvailable = false;
    let no18ImageSrc = 'Homeno18.jpg';
    const NO18_CANDIDATE_PATHS = ['Homeno18.jpg','./Homeno18.jpg','/Homeno18.jpg','public/Homeno18.jpg','/public/Homeno18.jpg'];
    async function preloadNo18(src) {
        try {
            const ok = await new Promise((resolve) => {
                const im = new Image();
                im.onload = () => resolve(true);
                im.onerror = () => resolve(false);
                im.src = src;
            });
            return ok;
        } catch (_) { return false; }
    }
    async function resolveNo18Path() {
        for (const p of NO18_CANDIDATE_PATHS) {
            const ok = await preloadNo18(p);
            if (ok) return p;
        }
        return null;
    }
    (async () => { const f = await resolveNo18Path(); if (f) { no18ImageSrc = f; no18ImageAvailable = true; } })();

    function setCookie(name, value, days = 365) {
        const d = new Date(); d.setDate(d.getDate() + days);
        document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/`;
    }
    function getCookie(name) {
        const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return m ? m[2] : null;
    }
    function isAuthenticated() { return !!localStorage.getItem('token'); }
    function showAgeGateIfNeeded() {
        if (ageOverlay) {
            ageOverlay.hidden = false;
            ageOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
    if (ageEnter) {
        ageEnter.addEventListener('click', () => {
            if (ageOverlay) {
                ageOverlay.classList.remove('open');
                setTimeout(() => { ageOverlay.hidden = true; document.body.style.overflow = ''; }, 240);
            }
            showPage(homePage);
        });
    }
    if (ageExit) {
        ageExit.addEventListener('click', () => {
            if (ageOverlay) { ageOverlay.classList.remove('open'); ageOverlay.hidden = true; }
            openNo18Overlay();
        });
    }
    if (ageGateNoticeBtn) { ageGateNoticeBtn.addEventListener('click', () => showPage(noticePage)); }
    showAgeGateIfNeeded();
    (function initAgeGateIntegrity(){
        try {
            const overlay = document.getElementById('age-gate-overlay');
            if (!overlay) return;
            const titleEl = document.getElementById('age-gate-title');
            const enterEl = document.getElementById('age-enter');
            const exitEl = document.getElementById('age-exit');
            const expected = {
                title: 'Questo è un sito per adulti',
                enter: 'Ho 18 anni o più - Entra',
                exit: 'Ho meno di 18 anni - Esci'
            };
            function notify(msg) {
                try { showToast(msg, 'error'); } catch(_) { alert(msg); }
            }
            function record(detail) {
                try {
                    const arr = JSON.parse(localStorage.getItem('ageGateTamperLog') || '[]');
                    arr.push({ t: new Date().toISOString(), detail });
                    localStorage.setItem('ageGateTamperLog', JSON.stringify(arr));
                } catch(_) {}
                console.error('AGE_GATE_TAMPER', detail);
                notify('Alterazione rilevata nella finestra età');
            }
            function assert() {
                if (titleEl && titleEl.textContent !== expected.title) { titleEl.textContent = expected.title; record({ field: 'title' }); }
                if (enterEl && enterEl.textContent !== expected.enter) { enterEl.textContent = expected.enter; record({ field: 'enter' }); }
                if (exitEl && exitEl.textContent !== expected.exit) { exitEl.textContent = expected.exit; record({ field: 'exit' }); }
            }
            assert();
            const mo = new MutationObserver(() => { assert(); });
            mo.observe(overlay, { subtree: true, childList: true, characterData: true, attributes: true });
        } catch(_) {}
    })();

    const homePage = document.getElementById('home-page');
    const eventDetailPage = document.getElementById('event-detail-page');
    const registerPage = document.getElementById('register-page');
    const loginPage = document.getElementById('login-page');
    const createEventPage = document.getElementById('create-event-page');
    const adminPage = document.getElementById('admin-page');
    const myEventsPage = document.getElementById('my-events-page');
    const myCreatedEvents = document.getElementById('my-created-events');
    const myRegisteredEvents = document.getElementById('my-registered-events');

    const registerForm = document.getElementById('register-form');
    
    const loginForm = document.getElementById('login-form');
    const createEventForm = document.getElementById('create-event-form');

    const registerMessage = document.getElementById('register-message');
    const loginMessage = document.getElementById('login-message');
    const createEventMessage = document.getElementById('create-event-message');
    const eventsList = document.getElementById('events-list');
    const eventDetailBack = document.getElementById('event-detail-back');
    const eventDetailRoot = document.getElementById('event-detail');
    const eventDetailCarousel = document.getElementById('event-detail-carousel');
    const eventDetailTitle = document.getElementById('event-detail-title');
    const eventDetailDateTime = document.getElementById('event-detail-datetime');
    const eventDetailLocation = document.getElementById('event-detail-location');
    const eventDetailCategory = document.getElementById('event-detail-category');
    const eventDetailDescription = document.getElementById('event-detail-description');
    const eventDetailActions = document.getElementById('event-detail-actions');
    const eventsSearch = document.getElementById('events-search');
    const topicChips = document.getElementById('topic-chips');
    const searchButtonEl = document.getElementById('events-search-button');
    const searchOverlay = document.getElementById('search-modal-overlay');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-modal-input');
    const searchSubmit = document.getElementById('search-modal-submit');
    const searchCancel = document.getElementById('search-modal-cancel');
    const searchMessage = document.getElementById('search-modal-message');
    const filterButtonEl = document.getElementById('filter-button');
    const filtersOverlay = document.getElementById('filters-modal-overlay');
    const filtersModal = document.getElementById('filters-modal');
    const filtersList = document.getElementById('filters-list');
    const filtersApply = document.getElementById('filters-apply');
    const filtersCancel = document.getElementById('filters-cancel');
    const filtersMessage = document.getElementById('filters-modal-message');
    let homeEventsCache = [];
    const eventDomRefs = new Map();
    const eventCategorySelect = document.getElementById('event-category');

    // Admin elements (solo per admin dashboard)
    const adminButton = document.getElementById('admin-button'); // Riferimento per eventuale uso futuro

    // Admin Dashboard elements
    const pendingEventsList = document.getElementById('pending-events-list');
    const approvedEventsList = document.getElementById('approved-events-list');
    const reportedEventsList = document.getElementById('reported-events-list');
    const usersList = document.getElementById('users-list');
    const usersSearch = document.getElementById('users-search');
    const usersShowBlocked = document.getElementById('users-show-blocked');
    let adminUsersCache = [];

    const adminCreateForm = document.getElementById('admin-create-form');
    const adminCreateFirstName = document.getElementById('admin-create-firstname');
    const adminCreateLastName = document.getElementById('admin-create-lastname');
    const adminCreateUsername = document.getElementById('admin-create-username');
    const adminCreateEmail = document.getElementById('admin-create-email');
    const adminCreatePassword = document.getElementById('admin-create-password');
    const adminCreatePhone = document.getElementById('admin-create-phone');
    const adminCreateMessage = document.getElementById('admin-create-message');

    let currentView = 'home';

    // Toast notifications
    const toastRoot = document.createElement('div');
    toastRoot.className = 'toast-container';
    document.body.appendChild(toastRoot);
    function showToast(message, type = 'success', durationMs = 3000) {
        const el = document.createElement('div');
        const cls = type === 'warn' ? 'warning' : type;
        el.className = `toast ${cls}`;
        el.textContent = String(message || '');
        toastRoot.appendChild(el);
        setTimeout(() => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, Math.max(1500, durationMs));
        return el;
    }

    // Funzione per mostrare o nascondere le pagine
    function showPage(page) {
        homePage.style.display = 'none';
        registerPage.style.display = 'none';
        loginPage.style.display = 'none';
        createEventPage.style.display = 'none';
        adminPage.style.display = 'none';
        if (myEventsPage) myEventsPage.style.display = 'none';
        if (noticePage) noticePage.style.display = 'none';
        if (no18Page) no18Page.style.display = 'none';

        page.style.display = 'block';
    }

    async function openNo18Overlay() {
        if (!no18OverlayEl) {
            no18OverlayEl = document.createElement('div');
            no18OverlayEl.id = 'no18-overlay';
            no18OverlayEl.className = 'no18-overlay';
            const content = document.createElement('div');
            content.className = 'no18-content';
            const msg = document.createElement('div');
            msg.className = 'no18-message';
            msg.innerHTML = '<h3>Accesso vietato ai minori</h3>'+
              '<p>Se hai meno di 18 anni (o la maggiore età prevista dalla tua giurisdizione), non puoi accedere ai contenuti di questo sito. L\'accesso è limitato agli adulti e alcune sezioni potrebbero contenere materiale non adatto ai minori.</p>'+
              '<p>Per ulteriori informazioni o per segnalazioni, contatta l\'assistenza all\'indirizzo <a href="mailto:support@eventhub.local">support@eventhub.local</a> oppure chiedi a un genitore/tutore di consultare la nostra pagina di informazioni.</p>'+
              '<p>Puoi tornare alla homepage quando raggiungerai l\'età richiesta.</p>';
            const img = document.createElement('img');
            let finalSrc = no18ImageSrc;
            if (!no18ImageAvailable) {
                const found = await resolveNo18Path();
                if (found) { finalSrc = found; no18ImageAvailable = true; }
            }
            img.src = no18ImageAvailable ? finalSrc : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="%23000"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-family="Arial" font-size="28">Immagine Homeno18.jpg non trovata</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="%23bbb" font-family="Arial" font-size="18">Percorsi tentati: '+NO18_CANDIDATE_PATHS.join(', ')+'</text><text x="50%" y="66%" dominant-baseline="middle" text-anchor="middle" fill="%23bbb" font-family="Arial" font-size="18">Codice: script.js::openNo18Overlay</text></svg>';
            img.alt = 'Accesso vietato ai minori';
            img.className = 'no18-image';
            content.appendChild(msg);
            content.appendChild(img);
            if (!no18ImageAvailable) {
                console.error('IMG_NOT_FOUND', {
                    attempted: ['Homeno18.jpg','/Homeno18.jpg','public/Homeno18.jpg','/public/Homeno18.jpg'],
                    location: 'eventhub-client/script.js::openNo18Overlay',
                });
            }
            no18OverlayEl.appendChild(content);
            document.body.appendChild(no18OverlayEl);
            no18OverlayEl.addEventListener('click', (e) => { if (e.target === no18OverlayEl) closeNo18Overlay(); });
            document.addEventListener('keydown', onNo18Esc, true);
            no18OverlayEl.addEventListener('touchstart', (e) => { if (e.target === no18OverlayEl) closeNo18Overlay(); }, { passive: true });
        }
        no18OverlayEl.hidden = false;
        no18OverlayEl.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeNo18Overlay() {
        if (!no18OverlayEl) return;
        no18OverlayEl.classList.remove('open');
        setTimeout(() => { no18OverlayEl.hidden = true; document.body.style.overflow = ''; }, 240);
        document.removeEventListener('keydown', onNo18Esc, true);
    }

    function onNo18Esc(e) { if (e.key === 'Escape') closeNo18Overlay(); }

    async function runNo18OverlayTest() {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('ageGateAccepted');
            const btn = document.getElementById('age-exit');
            if (!btn) throw new Error('Pulsante age-exit non trovato');
            btn.click();
            await new Promise(res => setTimeout(res, 60));
            const overlay = document.getElementById('no18-overlay');
            const message = overlay && overlay.querySelector('.no18-message');
            const img = overlay && overlay.querySelector('.no18-image');
            if (!overlay || overlay.hidden) throw new Error('Overlay non visibile');
            const hasHeading = message && /Accesso vietato ai minori/i.test(message.textContent || '');
            const hasContact = message && /support@eventhub\.local/i.test(message.innerHTML || '');
            const hasAlt = img && /vietato ai minori/i.test(img.alt || '');
            if (!hasHeading || !hasContact || !hasAlt) throw new Error('Contenuto incompleto');
            const ev = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(ev);
            await new Promise(res => setTimeout(res, 280));
            const closed = overlay.hidden === true;
            if (!closed) throw new Error('Overlay non si chiude con ESC');
            // Touch test
            btn.click();
            await new Promise(res => setTimeout(res, 60));
            const ov2 = document.getElementById('no18-overlay');
            if (ov2 && typeof TouchEvent !== 'undefined') {
                ov2.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
            } else if (ov2) {
                ov2.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
            }
            await new Promise(res => setTimeout(res, 280));
            const closedTouch = ov2 && ov2.hidden === true;
            if (!closedTouch) throw new Error('Overlay non si chiude con touch');
            console.log('TEST_NO18_OVERLAY_PASS');
        } catch (err) {
            console.error('TEST_NO18_OVERLAY_FAIL', err && err.message ? err.message : err);
        }
    }
    if (localStorage.getItem('runNo18Test') === '1') {
        setTimeout(runNo18OverlayTest, 100);
    }

    const DEFAULT_API_ORIGIN = 'http://localhost:3000';
    const API_ORIGIN = (() => {
        const origin = window.location.origin;
        if (/:(3000)$/i.test(origin)) return origin;
        return DEFAULT_API_ORIGIN;
    })();
    const API_BASE_URL = `${API_ORIGIN}/api`;
    const PLACEHOLDER_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23bbb" font-family="Arial" font-size="32">Evento</text></svg>';
    const DEFAULT_AUTOPLAY_MS = 5000;

    // --- Wrapper API con timeout, retry e header uniformi ---
    const DEFAULT_TIMEOUT_MS = 8000;
    const DEFAULT_RETRY_GET = 2;
    const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function buildUrl(path) {
        if (!path) return API_BASE_URL;
        if (/^https?:\/\//i.test(path)) return path;
        return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    function normalizePhotoUrl(url) {
        if (!url) return '';
        // Already absolute
        if (/^https?:\/\//i.test(url)) return url;
        // Normalize slashes
        let u = String(url).replace(/\\/g, '/');
        // Handle common relative forms
        if (u.startsWith('/uploads/')) return `${API_ORIGIN}${u}`;
        if (u.startsWith('uploads/')) return `${API_ORIGIN}/${u}`;
        if (u.startsWith('/api/uploads/')) return `${API_ORIGIN}${u.replace('/api', '')}`;
        if (u.startsWith('events/')) return `${API_ORIGIN}/uploads/${u}`;
        return u;
    }

    function createEventImage(src, alt) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = alt || 'Evento';
        img.src = src || PLACEHOLDER_PHOTO;
        img.onerror = () => {
            const tried = img.src;
            console.warn('Immagine evento non caricata, fallback al placeholder:', tried);
            img.src = PLACEHOLDER_PHOTO;
        };
        return img;
    }
    function extractPhotos(raw) {
        let photos = [];
        if (Array.isArray(raw)) {
            photos = raw.map(p => {
                if (typeof p === 'string') return p;
                if (p && typeof p === 'object') return p.file_path || p.url || '';
                return '';
            }).filter(Boolean);
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    photos = parsed.map(p => {
                        if (typeof p === 'string') return p;
                        if (p && typeof p === 'object') return p.file_path || p.url || '';
                        return '';
                    }).filter(Boolean);
                }
            } catch {}
        }
        if (!Array.isArray(photos) || photos.length === 0) {
            photos = [PLACEHOLDER_PHOTO];
        }
        return photos;
    }

    function getAuthHeader() {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    async function ensureAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        try {
            await apiRequest('/users/me', { useAuth: true, timeoutMs: 4000, retry: 0 });
            return true;
        } catch (err) {
            if (err && err.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('role');
                localStorage.removeItem('userId');
                updateAuthUI();
                showToast('Sessione scaduta. Effettua nuovamente il login.', 'warn');
                showPage(loginPage);
            }
            return false;
        }
    }

    async function safeJson(response) {
        try { return await response.json(); } catch { return {}; }
    }

    async function apiRequest(path, {
        method = 'GET',
        headers = {},
        body,
        useAuth = false,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retry = (method === 'GET' ? DEFAULT_RETRY_GET : 0),
    } = {}) {
        const url = buildUrl(path);
        const finalHeaders = { Accept: 'application/json', ...headers };
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        if (body && !isFormData && !finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = 'application/json';
        }
        if (useAuth) Object.assign(finalHeaders, getAuthHeader());

        let attempt = 0;
        let lastError = null;
        while (attempt <= retry) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
            try {
                const response = await fetch(url, {
                    method,
                    headers: finalHeaders,
                    body: isFormData ? body : (body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined),
                    signal: controller.signal,
                });
                clearTimeout(timer);
                if (response.ok) {
                    if (response.status === 204) return { ok: true, status: 204 };
                    const data = await safeJson(response);
                    return data;
                }
                if (RETRYABLE_STATUS.has(response.status) && attempt < retry) {
                    attempt++;
                    await sleep(300 * attempt);
                    continue;
                }
                const errData = await safeJson(response);
                const err = new Error(errData.error || errData.message || response.statusText || 'Errore richiesta API');
                err.status = response.status;
                err.data = errData;
                throw err;
            } catch (err) {
                clearTimeout(timer);
                lastError = err;
                const isAbort = err && (err.name === 'AbortError' || /aborted/i.test(String(err.message)));
                const isNetwork = err && (err instanceof TypeError || /NetworkError|Failed to fetch/i.test(String(err.message)));
                if ((isAbort || isNetwork) && attempt < retry) {
                    attempt++;
                    await sleep(300 * attempt);
                    continue;
                }
                throw err;
            }
        }
        throw lastError || new Error('Errore sconosciuto nella chiamata API');
    }

    // Parse token da callback OAuth o verifica email
    (function handleCallbackParams() {
        try {
            const url = new URL(window.location.href);
            const token = url.searchParams.get('token');
            const username = url.searchParams.get('username');
            const role = url.searchParams.get('role');
            const emailVerified = url.searchParams.get('emailVerified');
            if (token) {
                localStorage.setItem('token', token);
                if (username) localStorage.setItem('username', username);
                if (role) localStorage.setItem('role', role);
                // Pulisci la query string
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (emailVerified === '1') {
                showToast('Email verificata con successo! Ora puoi accedere.', 'success');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {
            console.warn('Impossibile parsare i parametri di callback:', e);
        }
    })();

    // Test di connettività al backend con messaggi dettagliati
    apiRequest('/health', { timeoutMs: 2500, retry: 1 })
        .then((h) => {
            try {
                const ok = h && h.status === 'API running';
                if (ok) {
                    console.log('Connessione al backend riuscita!', h);
                    if (!h.dbConnected) {
                        const via = h.dbVia ? `via: ${h.dbVia}` : '';
                        const err = h.dbError && h.dbError.message ? ` (errore: ${h.dbError.message}${h.dbError.code ? ' ['+h.dbError.code+']' : ''})` : '';
                        showToast(`Database non disponibile: modalità offline. Alcuni dati potrebbero essere incompleti. ${via}${err}`, 'warning');
                    } else {
                        const via = h.dbVia ? `via: ${h.dbVia}` : '';
                        console.log(`DB connesso ${via}`);
                    }
                }
            } catch (_) {}
        })
        .catch(error => {
            console.error('Connessione al backend fallita:', error.message || error);
            showToast('Backend non raggiungibile. Ritenta più tardi.', 'error');
        });

    function updateAuthUI() {
        console.log('updateAuthUI called. Token:', localStorage.getItem('token') ? 'Present' : 'Absent', 'role:', localStorage.getItem('role'), 'currentUser:', currentUser);
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');
        try {
            const existing = document.getElementById('admin-reset-btn');
            if (existing) existing.remove();
            if (userRole === 'admin') {
                const btn = document.createElement('button');
                btn.id = 'admin-reset-btn';
                btn.className = 'admin-reset-btn';
                btn.textContent = 'Reset (admin)';
                btn.title = 'Reset filtri, backup eventi e preferenze';
                btn.addEventListener('click', () => {
                    try {
                        selectedCategoryIds = new Set();
                        currentSearchQuery = '';
                        if (eventsSearch) eventsSearch.value = '';
                        applyEventsFilter();
                        localStorage.removeItem('eventsBackup');
                        localStorage.removeItem('ageGateAccepted');
                        localStorage.removeItem('ageGateMeta');
                        localStorage.removeItem('ageGateTestMode');
                        showToast('Reset effettuato: filtri/backup/preferenze', 'success');
                    } catch (e) {
                        showToast('Reset non riuscito: ' + (e && e.message ? e.message : 'Errore'), 'error');
                    }
                });
                document.body.appendChild(btn);
            }
        } catch(_) {}
    
        if (token) {
            // Nascondi i link di autenticazione e mostra l'area utente
            if (authLinks) authLinks.style.display = 'none';
            if (userInfo) userInfo.style.display = 'block';
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';
            logoutButton.style.display = 'block';
            createEventButton.style.display = userRole === 'admin' ? 'none' : 'block';
            adminDashboardButton.style.display = userRole === 'admin' ? 'block' : 'none';
            if (myEventsButton) myEventsButton.style.display = userRole === 'admin' ? 'none' : 'inline-block';
            welcomeMessage.textContent = `Benvenuto, ${localStorage.getItem('username')}${userRole === 'admin' ? ' (admin)' : ''}`;
            welcomeMessage.style.display = 'block';
            if (loginNotifyToggle) loginNotifyToggle.style.display = 'inline-block';
            (async () => {
                try {
                    const me = await apiRequest('/users/me', { useAuth: true, timeoutMs: 6000 });
                    if (loginNotifyCheckbox && me && me.user && typeof me.user.login_notify_enabled === 'boolean') {
                        loginNotifyCheckbox.checked = !!me.user.login_notify_enabled;
                    }
                } catch (_) {}
            })();
        } else {
            // Mostra i link di autenticazione e nascondi l'area utente
            if (authLinks) authLinks.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (loginLink) loginLink.style.display = 'inline-block';
            if (registerLink) registerLink.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            createEventButton.style.display = 'none';
            adminDashboardButton.style.display = 'none';
            if (myEventsButton) myEventsButton.style.display = 'none';
            welcomeMessage.style.display = 'none';
            if (loginNotifyToggle) loginNotifyToggle.style.display = 'none';
        }
    }

    // Chiamata iniziale per aggiornare l'interfaccia utente all'avvio
    updateAuthUI();

    let currentSearchQuery = '';
    let selectedCategoryIds = new Set();
    function openSearch() {
        if (!searchOverlay) return;
        searchOverlay.hidden = false;
        setTimeout(() => { try { searchInput && searchInput.focus(); } catch(_){} }, 10);
        searchMessage.textContent = '';
        if (searchInput) searchInput.value = currentSearchQuery || '';
    }
    function closeSearch() {
        if (!searchOverlay) return;
        searchOverlay.hidden = true;
        searchMessage.textContent = '';
    }
    async function openFilters() {
        if (!filtersOverlay) return;
        filtersOverlay.hidden = false;
        filtersMessage.textContent = '';
        try {
            const cats = await apiRequest('/events/categories', { timeoutMs: 6000 });
            if (!Array.isArray(cats)) return;
            filtersList.innerHTML = '';
            cats.forEach(cat => {
                const idStr = String(cat.id);
                const label = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = idStr;
                cb.checked = selectedCategoryIds.has(idStr);
                const span = document.createElement('span');
                span.textContent = cat.name;
                label.appendChild(cb);
                label.appendChild(span);
                filtersList.appendChild(label);
            });
        } catch (e) {
            filtersMessage.textContent = 'Errore nel caricamento delle categorie.';
        }
    }
    function closeFilters() {
        if (!filtersOverlay) return;
        filtersOverlay.hidden = true;
        filtersMessage.textContent = '';
    }
    function applyFiltersSelection() {
        if (!filtersList) return;
        const newSet = new Set();
        filtersList.querySelectorAll('input[type=checkbox]').forEach(cb => {
            if (cb.checked) newSet.add(String(cb.value));
        });
        selectedCategoryIds = newSet;
        applyEventsFilter();
        closeFilters();
    }
    async function performSearch() {
        if (!searchInput) return;
        const q = (searchInput.value || '').trim();
        searchMessage.textContent = '';
        if (q.length < 2) {
            searchMessage.textContent = 'Inserisci almeno 2 caratteri.';
            return;
        }
        try {
            searchSubmit && searchSubmit.classList.add('loading');
            currentSearchQuery = q;
            applyEventsFilter();
            const count = Array.isArray(homeEventsCache) ? homeEventsCache.filter(ev => {
                const title = String(ev.title || '').toLowerCase();
                const desc = String(ev.description || '').toLowerCase();
                const loc = String(ev.location || '').toLowerCase();
                const cat = String(ev.category_name || '').toLowerCase();
                const s = q.toLowerCase();
                return title.includes(s) || desc.includes(s) || loc.includes(s) || cat.includes(s);
            }).length : 0;
            searchMessage.textContent = `${count} risultati`;
        } catch (err) {
            const msg = err && err.message ? err.message : 'Errore durante la ricerca.';
            searchMessage.textContent = msg;
        } finally {
            searchSubmit && searchSubmit.classList.remove('loading');
        }
    }

    if (searchButtonEl) {
        searchButtonEl.addEventListener('click', () => {
            searchButtonEl.classList.add('pulse');
            setTimeout(() => searchButtonEl.classList.remove('pulse'), 320);
            openSearch();
        });
    }
    if (searchCancel) searchCancel.addEventListener('click', closeSearch);
    if (searchSubmit) searchSubmit.addEventListener('click', performSearch);
    if (searchOverlay) searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });
    if (searchModal) searchModal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); if (e.key === 'Enter') performSearch(); });
    if (filterButtonEl) filterButtonEl.addEventListener('click', openFilters);
    if (filtersCancel) filtersCancel.addEventListener('click', closeFilters);
    if (filtersApply) filtersApply.addEventListener('click', applyFiltersSelection);
    if (filtersOverlay) filtersOverlay.addEventListener('click', (e) => { if (e.target === filtersOverlay) closeFilters(); });
    if (filtersModal) filtersModal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilters(); });

    if (loginNotifyCheckbox) {
        loginNotifyCheckbox.addEventListener('change', async (e) => {
            try {
                const res = await apiRequest('/users/notifications', { method: 'PATCH', useAuth: true, timeoutMs: 6000, retry: 0, body: { enabled: !!loginNotifyCheckbox.checked } });
                showToast(res.message || 'Impostazione aggiornata.', 'success');
            } catch (err) {
                const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Aggiornamento non riuscito.') : 'Errore di rete.';
                showToast(msg, 'error');
                loginNotifyCheckbox.checked = !loginNotifyCheckbox.checked;
            }
        });
    }

    // Socket.IO client initialisation and admin listeners
    let socket;
    try {
        if (typeof io !== 'undefined') {
            socket = io('http://localhost:3000');
            socket.on('connect', () => {
                console.log('Socket connesso');
            });
            socket.on('connect_error', (err) => {
                console.warn('Errore connessione socket:', err && (err.message || err));
            });
            socket.on('userSignup', (payload = {}) => {
                const msg = payload.message || `Benvenuto ${payload.username || ''}!`;
                showToast(msg, 'success');
            });
            socket.on('userLogin', (payload = {}) => {
                const msg = payload.message || `Accesso effettuato. Bentornato, ${payload.username || ''}!`;
                showToast(msg, 'success');
            });
        }
    } catch (e) {
        console.warn('Socket.IO non disponibile:', e && (e.message || e));
    }

    (function initAdminSocketListeners() {
        const role = localStorage.getItem('role');
        if (!socket || role !== 'admin') return;
        // Join the admins room to receive targeted notifications from the server
        try { socket.emit('joinAdmin'); } catch (_) {}
        const refresh = () => { try { fetchAdminEvents(); } catch {} };
        // Fallback listeners (legacy names if emitted globally)
        socket.on('event_created', (payload = {}) => {
            showToast(`Nuovo evento da revisionare: ${payload.title || ''}`.trim(), 'warn');
            refresh();
        });
        socket.on('event_approved', (payload = {}) => {
            showToast(`Evento approvato: ${payload.title || ''}`.trim(), 'success');
            refresh();
        });
        socket.on('event_rejected', (payload = {}) => {
            showToast(`Evento rifiutato: ${payload.title || ''}`.trim(), 'warn');
            refresh();
        });
        socket.on('event_deleted', (payload = {}) => {
            showToast(`Evento eliminato: ${payload.title || ''}`.trim(), 'warn');
            refresh();
        });
        // Primary listeners aligned with server-side emissions to the 'admins' room
        socket.on('admin:eventCreated', (payload = {}) => {
            const title = (payload && payload.event && payload.event.title) || payload.title || '';
            showToast(`Nuovo evento da revisionare: ${title}`.trim(), 'warn');
            refresh();
        });
        socket.on('admin:eventUpdated', (payload = {}) => {
            const ev = payload.event || payload || {};
            const title = ev.title || '';
            const approved = ev.is_approved === true;
            showToast(`${approved ? 'Evento approvato' : 'Evento rifiutato'}: ${title}`.trim(), approved ? 'success' : 'warn');
            refresh();
        });
        socket.on('admin:eventDeleted', (payload = {}) => {
            showToast('Evento eliminato'.trim(), 'warn');
            refresh();
        });

        // Admin report notifications
        socket.on('admin:reportCreated', (payload = {}) => {
            const eventId = payload.eventId || (payload.report && payload.report.event_id);
            showToast(`Nuova segnalazione su evento ${eventId ? '#' + eventId : ''}`.trim(), 'warn');
            refresh();
        });
        socket.on('admin:reportResolved', (payload = {}) => {
            const status = (payload && payload.status) || '';
            const msg = status === 'removed' ? 'Segnalazione risolta: evento eliminato' : 'Segnalazione risolta: evento mantenuto';
            showToast(msg, status === 'removed' ? 'warn' : 'info');
            refresh();
        });
    })();

    async function fetchEvents() {
        try {
            const payload = await apiRequest('/events', { timeoutMs: 6000, retry: 2 });
            let events = Array.isArray(payload) ? payload : (Array.isArray(payload.events) ? payload.events : []);

            // Mostra tutti gli eventi approvati, inclusi quelli creati dall'utente

            homeEventsCache = events;
            try { localStorage.setItem('eventsBackup', JSON.stringify({ ts: Date.now(), events })); } catch(_) {}
            console.info('EVENTS_FETCH_OK', { count: events.length });
            applyEventsFilter();
        } catch (error) {
            console.error('Errore di rete durante il recupero degli eventi:', error.message || error);
            try {
                const b = JSON.parse(localStorage.getItem('eventsBackup') || '{}');
                if (Array.isArray(b.events)) {
                    console.warn('EVENTS_FETCH_FALLBACK_LOCAL', { count: b.events.length, ts: b.ts });
                    homeEventsCache = b.events;
                } else {
                    homeEventsCache = [];
                }
            } catch (_) { homeEventsCache = []; }
            applyEventsFilter();
        }
    }

    let activeCategoryId = null;
    function applyEventsFilter() {
        let filtered = Array.isArray(homeEventsCache) ? [...homeEventsCache] : [];
        const q = String(currentSearchQuery || (eventsSearch && eventsSearch.value) || '').trim().toLowerCase();
        if (q) {
            filtered = filtered.filter(ev => {
                const title = String(ev.title || '').toLowerCase();
                const desc = String(ev.description || '').toLowerCase();
                const loc = String(ev.location || '').toLowerCase();
                const cat = String(ev.category_name || '').toLowerCase();
                return title.includes(q) || desc.includes(q) || loc.includes(q) || cat.includes(q);
            });
        }
        const catIdStr = activeCategoryId ? String(activeCategoryId) : null;
        if (selectedCategoryIds && selectedCategoryIds.size > 0) {
            filtered = filtered.filter(ev => selectedCategoryIds.has(String(ev.category_id || ev.categoryId || '')));
        } else if (catIdStr) {
            filtered = filtered.filter(ev => String(ev.category_id || ev.categoryId || '') === catIdStr);
        }
        displayEvents(filtered);
    }

    function showPage(pageToShow) {
        homePage.style.display = 'none';
        registerPage.style.display = 'none';
        loginPage.style.display = 'none';
        createEventPage.style.display = 'none';
        adminPage.style.display = 'none';
        eventDetailPage.style.display = 'none';
        if (myEventsPage) myEventsPage.style.display = 'none';

        pageToShow.style.display = 'block';
        currentView = pageToShow.id.replace('-page', '');

        if (searchOverlay) {
            searchOverlay.hidden = true;
            if (searchMessage) searchMessage.textContent = '';
        }

        if (pageToShow === adminPage) {
            fetchAdminEvents();
            fetchAdminUsers();
        }
        if (pageToShow === myEventsPage) {
            fetchMyEventsAndRegistrations();
        }
    }

    (function initOAuthButtons(){
        try {
            const githubBtn = document.getElementById('github-login-btn');
            if (githubBtn) {
                githubBtn.addEventListener('click', () => {
                    const origin = API_ORIGIN;
                    window.location.href = `${origin}/api/auth/github`;
                });
            }
        } catch(_) {}
    })();

    async function fetchAdminEvents() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, cannot fetch admin events.');
            return;
        }

        try {
            const pendingPayload = await apiRequest('/admin/events/pending', { useAuth: true, timeoutMs: 6000, retry: 1 });
            const pendingEvents = Array.isArray(pendingPayload) ? pendingPayload : (Array.isArray(pendingPayload.events) ? pendingPayload.events : []);
            displayAdminEvents(pendingEvents, pendingEventsList, 'pending');
            const approvedPayload = await apiRequest('/events', { timeoutMs: 6000, retry: 1 });
            const approvedEvents = Array.isArray(approvedPayload) ? approvedPayload : (Array.isArray(approvedPayload.events) ? approvedPayload.events : []);
            displayAdminEvents(approvedEvents, approvedEventsList, 'approved');
            const reportsPayload = await apiRequest('/admin/reports', { useAuth: true, timeoutMs: 6000, retry: 1 });
            const reports = Array.isArray(reportsPayload) ? reportsPayload : (Array.isArray(reportsPayload.reports) ? reportsPayload.reports : []);
            displayAdminReports(reports);

        } catch (error) {
            console.error('Errore nel recupero degli eventi admin:', error.message || error);
        }
    }

    async function fetchAdminUsers() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, cannot fetch admin users.');
            return;
        }
        try {
            const payload = await apiRequest('/admin/users', { useAuth: true, timeoutMs: 6000, retry: 1 });
            const users = Array.isArray(payload) ? payload : (Array.isArray(payload.users) ? payload.users : []);
            adminUsersCache = users;
            applyUsersFilter();
        } catch (error) {
            console.error('Errore nel recupero degli utenti admin:', error.message || error);
        }
    }

    async function fetchMyEventsAndRegistrations() {
        try {
            const [createdRes, regRes] = await Promise.all([
                apiRequest('/users/me/events', { useAuth: true, timeoutMs: 8000 }),
                apiRequest('/users/me/registrations', { useAuth: true, timeoutMs: 8000 })
            ]);
            const created = Array.isArray(createdRes?.events) ? createdRes.events : (Array.isArray(createdRes) ? createdRes : []);
            const registered = Array.isArray(regRes?.events) ? regRes.events : (Array.isArray(regRes) ? regRes : []);
            displayMyEventsList(myCreatedEvents, created, { showCreator: false });
            displayMyEventsList(myRegisteredEvents, registered, { showCreator: true });
        } catch (error) {
            console.error('Errore nel recupero dei miei eventi/registrazioni:', error.message || error);
            if (myCreatedEvents) myCreatedEvents.innerHTML = '<p>Errore nel caricamento dei tuoi eventi.</p>';
            if (myRegisteredEvents) myRegisteredEvents.innerHTML = '<p>Errore nel caricamento delle tue iscrizioni.</p>';
        }
    }

    function displayMyEventsList(container, events, opts = {}) {
        if (!container) return;
        container.innerHTML = '';
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<p>Nessun evento trovato.</p>';
            return;
        }
        const showCreator = !!opts.showCreator;
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';
            const photos = extractPhotos(event.photos);
            const firstPhoto = normalizePhotoUrl(photos[0]);
            const dateStr = event.event_date ? new Date(event.event_date).toLocaleString() : '';
            const categoryName = event.category_name || 'N/A';
            const count = Number(event.current_registrations || 0);
            const capacity = Number(event.capacity || 0);
            card.innerHTML = `
                <div class="card-image">
                    <div class="reg-badge" aria-label="Iscritti" aria-live="polite">${count}${capacity ? '/' + capacity : ''}</div>
                </div>
                <div class="event-card-content">
                    ${showCreator ? `<div class="creator-label">${event.creator_username || ''}</div>` : ''}
                    <h3>${event.title}</h3>
                    <p class="event-date-time">${dateStr}</p>
                    <p class="event-location">${event.location || ''}</p>
                    <p class="event-category">Categoria: ${categoryName}</p>
                </div>
            `;
            const imgEl = createEventImage(firstPhoto, event.title);
            card.querySelector('.card-image').prepend(imgEl);
            container.appendChild(card);
            card.addEventListener('click', () => {
                try { showEventDetail(event); } catch(_) {}
            });
        });
    }

    function applyUsersFilter() {
        let filtered = Array.isArray(adminUsersCache) ? [...adminUsersCache] : [];
        const query = (usersSearch && usersSearch.value ? usersSearch.value : '').trim().toLowerCase();
        const onlyBlocked = !!(usersShowBlocked && usersShowBlocked.checked);

        if (onlyBlocked) {
            filtered = filtered.filter(u => !!u.is_blocked);
        }
        if (query) {
            filtered = filtered.filter(u => {
                const uname = String(u.username || '').toLowerCase();
                const email = String(u.email || '').toLowerCase();
                return uname.includes(query) || email.includes(query);
            });
        }
        displayUsers(filtered);
    }

    function displayUsers(users) {
        usersList.innerHTML = '';
        if (!Array.isArray(users) || users.length === 0) {
            usersList.innerHTML = '<li>Nessun utente trovato.</li>';
            return;
        }
        users.forEach(u => {
            const li = document.createElement('li');
            const blocked = !!u.is_blocked;
            const isAdmin = u.role === 'admin';
            li.innerHTML = `
                <span>${u.username} — ${u.email} (${u.role}) ${blocked ? '<span class="badge blocked">Bloccato</span>' : ''}</span>
                <div class="actions" style="margin-left: 8px;">
                    <button data-id="${u.id}" data-action="${blocked ? 'unblock' : 'block'}" ${isAdmin ? 'disabled' : ''}>
                        ${blocked ? 'Sblocca' : 'Blocca'}
                    </button>
                </div>
            `;
            usersList.appendChild(li);
        });

        usersList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.dataset.id;
                const action = e.target.dataset.action;
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                    const data = await apiRequest(`/admin/users/${userId}/block`, {
                        method: 'PATCH',
                        useAuth: true,
                        timeoutMs: 6000,
                        retry: 0,
                        body: { isBlocked: action === 'block' }
                    });
                    if (!data.status || (data.status && data.status < 400)) {
                        showToast(data.message || 'Operazione completata.', 'success');
                        fetchAdminUsers();
                    } else {
                        showToast(data.error || data.message || 'Operazione non riuscita.', 'error');
                    }
                } catch (err) {
                    console.error('Errore blocco/sblocco utente:', err.message || err);
                    showToast('Errore di rete durante il blocco/sblocco utente.', 'error');
                }
            });
        });
    }

    if (usersSearch) {
        usersSearch.addEventListener('input', applyUsersFilter);
    }
    if (usersShowBlocked) {
        usersShowBlocked.addEventListener('change', applyUsersFilter);
    }

    if (adminCreateForm) {
        adminCreateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = adminCreateFirstName.value.trim();
            const lastName = adminCreateLastName.value.trim();
            const username = adminCreateUsername.value.trim();
            const email = adminCreateEmail.value.trim();
            const password = adminCreatePassword.value;
            const phone = adminCreatePhone.value.trim();
            adminCreateMessage.textContent = '';
            try {
                const data = await apiRequest('/admin/users', {
                    method: 'POST',
                    useAuth: true,
                    timeoutMs: 8000,
                    retry: 0,
                    body: { firstName, lastName, username, email, password, phone }
                });
                showToast(data.message || 'Admin creato.', 'success');
                adminCreateForm.reset();
                fetchAdminUsers();
            } catch (err) {
                const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Creazione admin non riuscita.') : 'Errore di rete.';
                adminCreateMessage.textContent = msg;
                adminCreateMessage.className = 'error-message';
                showToast(msg, 'error');
            }
        });
    }

    // --- Validazioni lato client per Register ---
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        return re.test(String(email));
    }
    function isStrongPassword(pw) {
        const p = String(pw || '');
        return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
    }
    function isUsernameAllowed(username) {
        const normalized = String(username || '').toLowerCase();
        const badWords = ['cazzo','merda','stronzo','puttana','vaffanculo'];
        if (normalized.length < 3 || normalized.length > 20) return false;
        if (!/^[a-z0-9_]+$/i.test(username)) return false;
        return !badWords.some(w => normalized.includes(w));
    }

    function displayAdminEvents(events, container, type) {
        container.innerHTML = '';
        if (events.length === 0) {
            container.innerHTML = '<p>Nessun evento disponibile.</p>';
            return;
        }

        events.forEach(event => {
            const eventItem = document.createElement('li');
            const photos = extractPhotos(event.photos);
            const thumb = normalizePhotoUrl(photos[0]);
            eventItem.innerHTML = `
                <div class="admin-event-row">
                    <img class="admin-event-thumb" src="${thumb}" alt="${event.title}">
                    <span class="admin-event-title">${event.title}</span>
                    <div class="actions">
                        ${type === 'pending' ? `
                            <button data-id="${event.id}" data-action="approve">Accetta</button>
                            <button data-id="${event.id}" data-action="reject" class="reject">Rifiuta</button>
                        ` : ''}
                        <button data-id="${event.id}" data-action="delete" class="delete">Elimina</button>
                    </div>
                </div>
            `;
            container.appendChild(eventItem);
        });

        container.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.target.dataset.id;
                const action = e.target.dataset.action;
                const token = localStorage.getItem('token');

                if (!token) {
                    console.error('No token found.');
                    return;
                }

                try {
                    let url = '';
                    let method = 'GET';
                    let headers = { 'Authorization': `Bearer ${token}` };
                    let body = undefined;

                    if (action === 'approve' || action === 'reject') {
                        url = `/admin/events/${eventId}/approve`;
                        method = 'PATCH';
                        headers['Content-Type'] = 'application/json';
                        body = { isApproved: action === 'approve' };
                    } else if (action === 'delete') {
                        url = `/admin/events/${eventId}`;
                        method = 'DELETE';
                    }

                    const result = await apiRequest(url, {
                        method,
                        useAuth: true,
                        timeoutMs: 8000,
                        retry: method === 'DELETE' ? 1 : 0,
                        headers,
                        body
                    });

                    const okMsg = action === 'approve' ? 'Evento approvato con successo!' : (action === 'reject' ? 'Evento rifiutato con successo!' : 'Evento eliminato con successo!');
                    showToast(result.message || okMsg, 'success');
                    fetchAdminEvents(); // Refresh the lists
                } catch (error) {
                    console.error(`Errore durante l'azione ${action} sull'evento:`, error.message || error);
                    const msg = (error && error.status)
                        ? (error.data?.message || error.data?.error || `Operazione ${action} non riuscita.`)
                        : `Errore di rete durante l'azione ${action}.`;
                    showToast(msg, 'error');
                }
            });
        });
    }

    function displayEvents(events) {
        eventsList.innerHTML = '';
        // Aggiungi un controllo per assicurarti che events sia un array
        if (!Array.isArray(events)) {
            console.error('displayEvents ha ricevuto dati non validi. Previsto un array.', events);
            eventsList.innerHTML = '<p>Errore nel caricamento degli eventi.</p>';
            return;
        }

        if (events.length === 0) {
            eventsList.innerHTML = '<p>Nessun evento disponibile al momento.</p>';
            return;
        }
        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            const photos = extractPhotos(event.photos);
            const firstPhoto = normalizePhotoUrl(photos[0]);
            const dateStr = event.event_date ? new Date(event.event_date).toLocaleString() : '';
            const categoryName = event.category_name || 'N/A';
            const count = Number(event.current_registrations || 0);
            const capacity = Number(event.capacity || 0);

            eventCard.innerHTML = `
                <div class="card-image">
                    <div class="reg-badge" aria-label="Iscritti" aria-live="polite">${count}${capacity ? '/' + capacity : ''}</div>
                </div>
                <div class="event-card-content">
                    <div class="creator-label">${event.creator_username || ''}</div>
                    <h3>${event.title}</h3>
                    <p class="event-date-time">${dateStr}</p>
                    <p class="event-location">${event.location || ''}</p>
                    <p class="event-category">Categoria: ${categoryName}</p>
                    <div class="event-actions"></div>
                    <div class="quick-actions"></div>
                </div>
            `;
            const imgEl = createEventImage(firstPhoto, event.title);
            eventCard.querySelector('.card-image').prepend(imgEl);
            eventsList.appendChild(eventCard);

            const actions = eventCard.querySelector('.event-actions');
            const quickActions = eventCard.querySelector('.quick-actions');
            const badgeEl = eventCard.querySelector('.reg-badge');
            try { eventDomRefs.set(String(event.id), { badgeEl, count, capacity }); } catch(_){}
            try {
                const role = localStorage.getItem('role');
                const hasToken = !!localStorage.getItem('token');
                if (hasToken && role !== 'admin') {
                    const currentUsername = localStorage.getItem('username') || '';
                    const qbtn = document.createElement('button');
                    qbtn.className = 'quick-register';
                    qbtn.setAttribute('aria-label', 'Iscriviti rapidamente all\'evento');
                    let isReg = false;
                    const updateQBtn = () => { 
                        qbtn.textContent = isReg ? 'Annulla iscrizione' : 'Iscriviti';
                        qbtn.setAttribute('aria-label', isReg ? 'Annulla iscrizione' : 'Iscriviti');
                    };
                    updateQBtn();
                    qbtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const ok = await ensureAuthenticated();
                        if (!ok) return;
                        try {
                            if (isReg) {
                                const res = await apiRequest(`/events/${event.id}/register`, { method: 'DELETE', useAuth: true, timeoutMs: 6000, retry: 0 });
                                isReg = false;
                                showToast(res.message || 'Iscrizione annullata.', 'success');
                                const ref = eventDomRefs.get(String(event.id));
                                if (ref) { ref.count = Math.max(0, (ref.count || 0) - 1); if (ref.badgeEl) ref.badgeEl.textContent = `${ref.count || 0}${ref.capacity ? '/' + ref.capacity : ''}`; }
                            } else {
                                const res = await apiRequest(`/events/${event.id}/register`, { method: 'POST', useAuth: true, timeoutMs: 6000, retry: 0 });
                                isReg = true;
                                showToast(res.message || 'Iscritto all\'evento.', 'success');
                                const ref = eventDomRefs.get(String(event.id));
                                if (ref) { ref.count = (ref.count || 0) + 1; if (ref.badgeEl) ref.badgeEl.textContent = `${ref.count || 0}${ref.capacity ? '/' + ref.capacity : ''}`; }
                            }
                        } catch (err) {
                            if (err && err.status === 409) { isReg = true; updateQBtn(); showToast('Sei già iscritto a questo evento.', 'info'); return; }
                            if (err && err.status === 404) { isReg = false; updateQBtn(); showToast('Non eri iscritto a questo evento.', 'info'); return; }
                            const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Operazione non riuscita.') : 'Errore di rete.';
                            showToast(msg, 'error');
                        } finally { updateQBtn(); }
                    });
                    quickActions.appendChild(qbtn);
                    const btn = document.createElement('button');
                    btn.className = 'report-btn';
                    btn.textContent = 'Segnala evento';
                    btn.addEventListener('click', async () => {
                        const reason = window.prompt('Motivo della segnalazione (facoltativo):') || '';
                        try {
                            const res = await apiRequest(`/events/${event.id}/report`, { method: 'POST', useAuth: true, timeoutMs: 6000, retry: 0, body: { reason } });
                            showToast(res.message || 'Segnalazione inviata.', 'success');
                        } catch (err) {
                            const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Segnalazione non riuscita.') : 'Errore di rete durante la segnalazione.';
                            showToast(msg, 'error');
                        }
                    });
                    actions.appendChild(btn);
                    if (String(event.creator_username || '') === String(currentUsername || '')) {
                        const delBtn = document.createElement('button');
                        delBtn.className = 'delete-btn';
                        delBtn.textContent = 'Elimina evento';
                        delBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const ok = await ensureAuthenticated();
                            if (!ok) return;
                            const confirmDel = window.confirm('Confermi l\'eliminazione di questo evento?');
                            if (!confirmDel) return;
                            try {
                                delBtn.disabled = true; delBtn.classList.add('loading'); delBtn.setAttribute('aria-busy','true');
                                const res = await apiRequest(`/events/${event.id}`, { method: 'DELETE', useAuth: true, timeoutMs: 8000, retry: 0 });
                                showToast('Evento eliminato.', 'success');
                                eventCard.remove();
                            } catch (err) {
                                const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Eliminazione non riuscita.') : 'Errore di rete durante l\'eliminazione.';
                                showToast(msg, 'error');
                            } finally {
                                delBtn.disabled = false; delBtn.classList.remove('loading'); delBtn.removeAttribute('aria-busy');
                            }
                        });
                        actions.appendChild(delBtn);
                    }
                }
                eventCard.addEventListener('click', (e) => {
                    const t = e.target;
                    if (t.closest('.report-btn')) return;
                    if (t.closest('.quick-register')) return;
                    showEventDetail(event);
                });
            } catch (_) {}
        });
    }

    async function renderChips() {
        try {
            const cats = await apiRequest('/categories', { method: 'GET', timeoutMs: 6000 });
            if (!Array.isArray(cats)) return;
            topicChips.innerHTML = '';
            const allChip = document.createElement('button');
            allChip.className = 'chip active';
            allChip.textContent = 'Tutti';
            allChip.addEventListener('click', () => {
                topicChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                allChip.classList.add('active');
                fetchEvents();
            });
            topicChips.appendChild(allChip);
            cats.forEach(cat => {
                const chip = document.createElement('button');
                chip.className = 'chip';
                chip.textContent = cat.name;
                chip.addEventListener('click', () => {
                    topicChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    fetchEvents({ category_id: cat.id });
                });
                topicChips.appendChild(chip);
            });
        } catch (e) {
            console.error('Errore caricamento categorie:', e);
        }
    }

    function displayAdminReports(reports) {
        reportedEventsList.innerHTML = '';
        if (!Array.isArray(reports) || reports.length === 0) {
            reportedEventsList.innerHTML = '<p>Nessuna segnalazione.</p>';
            return;
        }
        reports.forEach(r => {
            const li = document.createElement('li');
            const photos = extractPhotos(r.photos);
            const thumb = normalizePhotoUrl(photos[0]);
            li.innerHTML = `
                <div class="admin-event-row">
                    <img class="admin-event-thumb" src="${thumb}" alt="${r.title}">
                    <span class="admin-event-title">${r.title} — segnalato da ${r.reporter_username}</span>
                    <div class="actions">
                        <button data-id="${r.report_id}" data-action="remove" class="delete">Elimina</button>
                        <button data-id="${r.report_id}" data-action="keep" class="reject">Mantieni</button>
                    </div>
                </div>
            `;
            reportedEventsList.appendChild(li);
        });
        reportedEventsList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const action = e.target.dataset.action;
                try {
                    const res = await apiRequest(`/admin/reports/${id}`, { method: 'PATCH', useAuth: true, timeoutMs: 8000, retry: 0, body: { action } });
                    showToast(res.message || 'Operazione completata.', 'success');
                    fetchAdminEvents();
                } catch (err) {
                    const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Operazione non riuscita.') : 'Errore di rete.';
                    showToast(msg, 'error');
                }
            });
        });
    }

    async function fetchCategories() {
        try {
            const categories = await apiRequest('/events/categories', { timeoutMs: 6000, retry: 2 });
            eventCategorySelect.innerHTML = '<option value="">Seleziona una categoria</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                eventCategorySelect.appendChild(option);
            });
            if (!Array.isArray(categories) || categories.length === 0) {
                createEventMessage.textContent = 'Nessuna categoria disponibile. Contatta un amministratore.';
                createEventMessage.className = 'error-message';
            } else {
                createEventMessage.textContent = '';
                createEventMessage.className = '';
            }
        } catch (error) {
            console.error('Errore nel recupero delle categorie:', error.message || error);
            createEventMessage.textContent = 'Impossibile recuperare le categorie al momento.';
            createEventMessage.className = 'error-message';
        }
    }

    // Event Listeners
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(homePage);
        fetchEvents();
    });

    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(registerPage);
    });

    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(loginPage);
    });

    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        currentUser = null;
        updateAuthUI();
        showPage(homePage);
        fetchEvents();
    });

    // Debounce per la ricerca eventi
    let eventsSearchDebounceTimer = null;
    function onEventsSearchInput() {
        if (eventsSearchDebounceTimer) clearTimeout(eventsSearchDebounceTimer);
        eventsSearchDebounceTimer = setTimeout(() => {
            applyEventsFilter();
        }, 250);
    }
    if (eventsSearch) {
        eventsSearch.addEventListener('input', onEventsSearchInput);
    }

    if (topicChips) {
        topicChips.style.display = 'none';
    }

    createEventButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await ensureAuthenticated();
        if (!ok) return;
        showPage(createEventPage);
        fetchCategories();
    });

    adminDashboardButton.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(adminPage);
        fetchAdminEvents();
    });

    if (myEventsButton) {
        myEventsButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const ok = await ensureAuthenticated();
            if (!ok) return;
            showPage(myEventsPage);
        });
    }

    backToHomeButton.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(homePage);
        fetchEvents();
    });

    let lastRegisteredEmail = null;
    const resendBtn = document.getElementById('resend-verify-btn');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            if (!isValidEmail(email)) {
                registerMessage.textContent = 'Email non valida.';
                registerMessage.className = 'error-message';
                return;
            }
            if (!isStrongPassword(password)) {
                registerMessage.textContent = 'Password troppo debole: almeno 8 caratteri, maiuscola, minuscola, numero e simbolo.';
                registerMessage.className = 'error-message';
                return;
            }
            if (!isUsernameAllowed(username)) {
                registerMessage.textContent = 'Username non consentito. Scegli un nome appropriato.';
                registerMessage.className = 'error-message';
                return;
            }
            const data = await apiRequest('/users/register', {
                method: 'POST',
                timeoutMs: 10000,
                retry: 0,
                body: { username, email, password }
            });
            if (!data.status || (data.status && data.status < 400)) {
                registerMessage.textContent = data.message;
                registerMessage.className = 'success-message';
                showToast(`Benvenuto ${username}!`, 'success');
                setTimeout(() => {
                    showPage(loginPage);
                    registerMessage.textContent = '';
                    registerForm.reset();
                }, 1200);
            } else {
                registerMessage.textContent = data.message;
                registerMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante la registrazione:', error.message || error);
            registerMessage.textContent = (error && error.status)
                ? (error.data?.message || error.data?.error || error.message || 'Registrazione non riuscita.')
                : 'Errore di rete. Impossibile registrare l\'utente.';
            registerMessage.className = 'error-message';
        }
    });

    

    

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const data = await apiRequest('/users/login', {
                method: 'POST',
                timeoutMs: 10000,
                retry: 0,
                body: { email, password }
            });
            if (!data.status || (data.status && data.status < 400)) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user?.username || '');
                localStorage.setItem('role', data.user?.role || 'user');
                if (data.user?.id !== undefined && data.user?.id !== null) {
                    localStorage.setItem('userId', String(data.user.id));
                } else {
                    localStorage.removeItem('userId');
                }
                currentUser = { username: data.user?.username || '', role: data.user?.role || 'user' };
                console.log('Login success. Stored token and role:', !!localStorage.getItem('token'), localStorage.getItem('role'));
                // Aggiorna immediatamente l'UI in base all'autenticazione
                updateAuthUI();
                loginMessage.textContent = data.message || 'Login effettuato con successo!';
                showToast(`Bentornato ${data.user?.username || ''}!`, 'success');
                loginMessage.className = 'success-message';
                loginForm.reset();
                // Reindirizza subito alla vista corretta senza delay
                if ((data.user?.role || localStorage.getItem('role')) === 'admin') {
                    showPage(adminPage);
                    fetchAdminEvents();
                } else {
                    showPage(homePage);
                    fetchEvents();
                }
                // Pulisci il messaggio dopo il reindirizzamento
                loginMessage.textContent = '';
            } else {
                // Messaggio specifico richiesto quando utente non è registrato
                if ((data.status === 401 || data.code === 401) && (data.error === 'Credenziali non valide.' || data.message === 'Credenziali non valide.')) {
                    loginMessage.textContent = 'Utente non registrato. Per favore procedi con la registrazione.';
                } else {
                    loginMessage.textContent = data.error || data.message || 'Credenziali non valide.';
                }
                loginMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante il login:', error.message || error);
            loginMessage.textContent = (error && error.status)
                ? (error.data?.message || error.data?.error || error.message || 'Credenziali non valide.')
                : 'Errore di rete. Impossibile connettersi al server.';
            loginMessage.className = 'error-message';
        }
    });



    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;
        const capacity = document.getElementById('event-capacity').value;
        const minParticipants = document.getElementById('event-min-participants').value;
        const maxParticipants = document.getElementById('event-max-participants').value;
        const category = eventCategorySelect.value;
        const photosInput = document.getElementById('event-photos');
        const files = photosInput.files;

        const token = localStorage.getItem('token');

        try {
            const submitBtn = createEventForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('loading'); submitBtn.setAttribute('aria-busy','true'); }
            const stillAuth = await ensureAuthenticated();
            if (!stillAuth) {
                createEventMessage.textContent = 'Sessione scaduta. Accedi di nuovo per creare un evento.';
                createEventMessage.className = 'error-message';
                return;
            }
            // Validazione lato client
            if (!title || !description || !date || !time || !location || !capacity || !category) {
                createEventMessage.textContent = 'Compila tutti i campi obbligatori.';
                createEventMessage.className = 'error-message';
                return;
            }
            if (files && files.length > 0) {
                for (const f of files) {
                    if (!f.type || !f.type.startsWith('image/')) {
                        createEventMessage.textContent = 'Sono consentite solo immagini.';
                        createEventMessage.className = 'error-message';
                        return;
                    }
                }
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            // Combina data+ora in formato ISO-like
            formData.append('date', `${date}T${time}`);
            formData.append('location', location);
            formData.append('capacity', parseInt(capacity));
            if (minParticipants) formData.append('min_participants', parseInt(minParticipants));
            if (maxParticipants) formData.append('max_participants', parseInt(maxParticipants));
            formData.append('category_id', parseInt(category));
            if (files && files.length > 0) {
                Array.from(files).forEach(file => formData.append('photos', file));
            }

            const data = await apiRequest('/events', {
                method: 'POST',
                useAuth: true,
                timeoutMs: 15000,
                retry: 0,
                body: formData
            });
            if (!data.status || (data.status && data.status < 400)) {
                createEventMessage.textContent = 'Evento inviato. In attesa di approvazione da parte dell\'admin.';
                createEventMessage.className = 'success-message';
                showToast('Evento inviato per approvazione.', 'success');
                createEventForm.reset();
                setTimeout(() => {
                    showPage(homePage);
                    fetchEvents();
                    createEventMessage.textContent = '';
                }, 2000);
            } else {
                createEventMessage.textContent = data.error || data.message || 'Errore nella creazione dell\'evento.';
                createEventMessage.className = 'error-message';
                showToast(createEventMessage.textContent, 'error');
            }
        } catch (error) {
            console.error('Errore durante la creazione dell\'evento:', error.message || error);
            if (error && error.status === 401) {
                createEventMessage.textContent = 'Sessione scaduta o token non valido. Effettua il login.';
                createEventMessage.className = 'error-message';
                showToast(createEventMessage.textContent, 'warn');
                showPage(loginPage);
            } else {
                createEventMessage.textContent = (error && error.status)
                    ? (error.data?.message || error.data?.error || error.message || 'Errore nella creazione dell\'evento.')
                    : 'Errore di rete. Impossibile creare l\'evento.';
                createEventMessage.className = 'error-message';
                showToast(createEventMessage.textContent, 'error');
            }
        } finally {
            const submitBtn = createEventForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); submitBtn.removeAttribute('aria-busy'); }
        }
    });

    // Initial load
    updateAuthUI();
    fetchEvents();

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (token) {
        if (userRole === 'admin') {
            showPage(adminPage);
            fetchAdminEvents();
        } else {
            showPage(homePage);
        }
    } else {
        showPage(homePage);
    }
    async function showEventDetail(ev) {
        const photos = extractPhotos(ev.photos);
        eventDetailCarousel.innerHTML = `
            <div class="carousel">
                <button class="prev" aria-label="Precedente">‹</button>
                <div class="slides">
                    ${photos.map((url, idx) => `<img class="slide${idx === 0 ? ' active' : ''}" src="${normalizePhotoUrl(url)}" alt="${ev.title} - foto ${idx+1}">`).join('')}
                </div>
                <div class="indicators">
                    ${photos.map((_, idx) => `<button class="indicator-dot${idx === 0 ? ' active' : ''}" data-index="${idx}" aria-label="Vai alla slide ${idx+1}"></button>`).join('')}
                </div>
                <button class="next" aria-label="Successiva">›</button>
                <button class="autoplay-toggle" aria-pressed="true" title="Auto-play">Auto</button>
            </div>`;
        eventDetailTitle.textContent = ev.title || '';
        eventDetailDateTime.textContent = ev.event_date ? new Date(ev.event_date).toLocaleString() : '';
        eventDetailLocation.textContent = ev.location || '';
        eventDetailCategory.textContent = `Categoria: ${ev.category_name || 'N/A'}`;
        eventDetailDescription.textContent = ev.description || '';
        eventDetailActions.innerHTML = '';
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        if (token && role !== 'admin') {
            const currentUsername = localStorage.getItem('username') || '';
            let isRegistered = null;
            const regBtn = document.createElement('button');
            regBtn.className = 'register-btn';
            const updateRegBtn = () => { 
                regBtn.textContent = isRegistered ? 'Annulla iscrizione' : 'Iscriviti all\'evento';
                regBtn.setAttribute('aria-label', isRegistered ? 'Annulla iscrizione' : 'Iscriviti all\'evento');
            };
            updateRegBtn();
            regBtn.addEventListener('click', async () => {
                const ok = await ensureAuthenticated();
                if (!ok) return;
                try {
                    regBtn.disabled = true; regBtn.classList.add('loading'); regBtn.setAttribute('aria-busy','true');
                    if (isRegistered) {
                        const res = await apiRequest(`/events/${ev.id}/register`, { method: 'DELETE', useAuth: true, timeoutMs: 6000, retry: 0 });
                        isRegistered = false;
                        showToast(res.message || 'Iscrizione annullata.', 'success');
                    } else {
                        const res = await apiRequest(`/events/${ev.id}/register`, { method: 'POST', useAuth: true, timeoutMs: 6000, retry: 0 });
                        isRegistered = true;
                        showToast(res.message || 'Iscritto all\'evento.', 'success');
                    }
                } catch (err) {
                    if (err && err.status === 409) { isRegistered = true; updateRegBtn(); showToast('Sei già iscritto a questo evento.', 'info'); return; }
                    if (err && err.status === 404) { isRegistered = false; updateRegBtn(); showToast('Non eri iscritto a questo evento.', 'info'); return; }
                    const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Operazione non riuscita.') : 'Errore di rete.';
                    showToast(msg, 'error');
                } finally {
                    updateRegBtn();
                    regBtn.disabled = false; regBtn.classList.remove('loading'); regBtn.removeAttribute('aria-busy');
                }
            });
            const moreActionsEl = document.getElementById('event-detail-more-actions');
            if (moreActionsEl) { moreActionsEl.innerHTML = ''; moreActionsEl.appendChild(regBtn); }
            else { eventDetailActions.appendChild(regBtn); }
            const btn = document.createElement('button');
            btn.className = 'report-btn';
            btn.textContent = 'Segnala evento';
            btn.addEventListener('click', async () => {
                const reason = window.prompt('Motivo della segnalazione (facoltativo):') || '';
                try {
                    btn.disabled = true; btn.classList.add('loading'); btn.setAttribute('aria-busy','true');
                    const res = await apiRequest(`/events/${ev.id}/report`, { method: 'POST', useAuth: true, timeoutMs: 6000, retry: 0, body: { reason } });
                    showToast(res.message || 'Segnalazione inviata.', 'success');
                } catch (err) {
                    const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Segnalazione non riuscita.') : 'Errore di rete durante la segnalazione.';
                    showToast(msg, 'error');
                } finally { btn.disabled = false; btn.classList.remove('loading'); btn.removeAttribute('aria-busy'); }
            });
            eventDetailActions.appendChild(btn);
            if (String(ev.creator_username || '') === String(currentUsername || '')) {
                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.textContent = 'Elimina evento';
                delBtn.addEventListener('click', async () => {
                    const ok = await ensureAuthenticated();
                    if (!ok) return;
                    const confirmDel = window.confirm('Confermi l\'eliminazione di questo evento?');
                    if (!confirmDel) return;
                    try {
                        delBtn.disabled = true; delBtn.classList.add('loading'); delBtn.setAttribute('aria-busy','true');
                        const res = await apiRequest(`/events/${ev.id}`, { method: 'DELETE', useAuth: true, timeoutMs: 8000, retry: 0 });
                        showToast('Evento eliminato.', 'success');
                        showPage(homePage);
                        fetchEvents();
                    } catch (err) {
                        const msg = (err && err.status) ? (err.data?.error || err.data?.message || 'Eliminazione non riuscita.') : 'Errore di rete durante l\'eliminazione.';
                        showToast(msg, 'error');
                    } finally {
                        delBtn.disabled = false; delBtn.classList.remove('loading'); delBtn.removeAttribute('aria-busy');
                    }
                });
                eventDetailActions.appendChild(delBtn);
            }
        }
        showPage(eventDetailPage);
        const participantsSummary = document.getElementById('event-detail-participants-summary');
        const participantsList = document.getElementById('event-detail-participants-list');
        const addressEl = document.getElementById('event-detail-address');
        const mapEl = document.getElementById('event-detail-map');
        const carousel = eventDetailCarousel.querySelector('.carousel');
        const slides = carousel.querySelectorAll('.slide');
        const dots = carousel.querySelectorAll('.indicator-dot');
        let currentIndex = 0;
        const showSlide = (i) => {
            slides.forEach((img, idx) => img.classList.toggle('active', idx === i));
            dots.forEach((dot, idx) => dot.classList.toggle('active', idx === i));
        };
        showSlide(0);
        carousel.querySelector('.prev').addEventListener('click', () => { currentIndex = (currentIndex - 1 + slides.length) % slides.length; showSlide(currentIndex); });
        carousel.querySelector('.next').addEventListener('click', () => { currentIndex = (currentIndex + 1) % slides.length; showSlide(currentIndex); });
        dots.forEach(dot => { dot.addEventListener('click', () => { const idx = parseInt(dot.getAttribute('data-index'), 10); currentIndex = Number.isNaN(idx) ? 0 : idx; showSlide(currentIndex); }); });
        slides.forEach(img => { img.addEventListener('error', () => { img.src = PLACEHOLDER_PHOTO; img.classList.add('img-error'); }); });
        const minP = Number(ev.min_participants || ev.minParticipants || 0);
        const maxP = Number(ev.max_participants || ev.capacity || ev.maxParticipants || 0);
        const initialCount = Number(ev.current_registrations || 0);
        if (participantsSummary) participantsSummary.textContent = `Iscritti: ${initialCount}${maxP ? '/' + maxP : ''}  •  Min: ${minP || 0}  •  Max: ${maxP || 'N/D'}`;
        if (addressEl) addressEl.textContent = ev.location || '';
        if (mapEl) {
            if (ev.location) {
                const q = encodeURIComponent(ev.location);
                mapEl.innerHTML = `<iframe title="Mappa" src="https://maps.google.com/maps?q=${q}&output=embed" loading="lazy"></iframe>`;
            } else { mapEl.innerHTML = ''; }
        }
        if (participantsList) {
            participantsList.innerHTML = '';
            try {
                const plist = await apiRequest(`/events/${ev.id}/participants`, { timeoutMs: 6000 });
                if (plist && Array.isArray(plist.participants)) {
                    plist.participants.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p.username;
                        participantsList.appendChild(li);
                    });
                    if (participantsSummary) participantsSummary.textContent = `Iscritti: ${plist.count}${maxP ? '/' + maxP : ''}  •  Min: ${minP || 0}  •  Max: ${maxP || 'N/D'}`;
                }
            } catch (_) {}
        }
        if (socket) {
            try {
                const userId = localStorage.getItem('userId');
                socket.emit('joinEventChat', { eventId: ev.id, userId });
                socket.off('registrationChange');
                socket.on('registrationChange', (payload = {}) => {
                    if (String(payload.eventId) !== String(ev.id)) return;
                    const isReg = payload.action === 'registered';
                    let current = initialCount;
                    if (participantsSummary) {
                        const text = participantsSummary.textContent || '';
                        const m = text.match(/Iscritti: (\d+)/);
                        if (m) current = Number(m[1] || initialCount);
                    }
                    current = current + (isReg ? 1 : -1);
                    if (current < 0) current = 0;
                    if (participantsSummary) participantsSummary.textContent = `Iscritti: ${current}${maxP ? '/' + maxP : ''}  •  Min: ${minP || 0}  •  Max: ${maxP || 'N/D'}`;
                    if (participantsList && payload.username) {
                        if (isReg) {
                            const li = document.createElement('li');
                            li.textContent = payload.username;
                            participantsList.appendChild(li);
                        } else {
                            const items = Array.from(participantsList.querySelectorAll('li'));
                            const found = items.find(li => li.textContent === payload.username);
                            if (found) found.remove();
                        }
                    }
                });

                // Chat UI references
                const chatList = document.getElementById('event-chat-list');
                const chatInput = document.getElementById('event-chat-input');
                const chatSend = document.getElementById('event-chat-send');
                if (chatList) chatList.innerHTML = '';

                const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
                const renderMsg = (m) => {
                    if (!chatList || !m) return;
                    const li = document.createElement('li');
                    const ts = m.created_at ? new Date(m.created_at).toLocaleTimeString() : '';
                    const user = m.username || m.user_username || 'Utente';
                    const text = m.message || m.text || '';
                    li.innerHTML = `<strong>${user}</strong> <span style="opacity:0.7; font-size:0.9em;">${ts}</span><br>${escapeHtml(text)}`;
                    chatList.appendChild(li);
                    chatList.scrollTop = chatList.scrollHeight;
                };

                // Ricezione storia chat all'ingresso
                socket.off('chatHistory');
                socket.on('chatHistory', (history = []) => {
                    if (!Array.isArray(history)) return;
                    if (chatList) chatList.innerHTML = '';
                    history.forEach(renderMsg);
                });

                // Nuovi messaggi broadcast
                socket.off('newMessage');
                socket.on('newMessage', (m = {}) => {
                    if (String(m.eventId || m.event_id) !== String(ev.id)) return;
                    renderMsg(m);
                });

                // Invio messaggi
                if (chatSend) {
                    chatSend.onclick = async () => {
                        const ok = await ensureAuthenticated();
                        if (!ok) return;
                        const text = (chatInput && chatInput.value || '').trim();
                        if (!text) return;
                        try {
                            socket.emit('chatMessage', { eventId: ev.id, userId, message: text });
                            if (chatInput) chatInput.value = '';
                        } catch (_) {}
                    };
                }
            } catch (_) {}
        }
    }

    {
        const backEl = document.getElementById('event-detail-back');
        if (backEl) {
            backEl.addEventListener('click', (e) => {
                e.preventDefault();
                showPage(homePage);
            });
        }
    }
});