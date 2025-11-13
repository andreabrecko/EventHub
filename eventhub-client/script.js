document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home-link');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button');
    const createEventButton = document.getElementById('create-event-button');
    const adminDashboardButton = document.getElementById('admin-dashboard-button'); // Bottone per admin dashboard
    const backToHomeButton = document.getElementById('back-to-home-button'); // Bottone per tornare alla home

    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const welcomeMessage = document.createElement('span');
    welcomeMessage.id = 'welcome-message';
    userInfo.prepend(welcomeMessage);

    let currentUser = null;

    const homePage = document.getElementById('home-page');
    const registerPage = document.getElementById('register-page');
    const loginPage = document.getElementById('login-page');
    const createEventPage = document.getElementById('create-event-page');
    const adminPage = document.getElementById('admin-page');

    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const createEventForm = document.getElementById('create-event-form');

    const registerMessage = document.getElementById('register-message');
    const loginMessage = document.getElementById('login-message');
    const createEventMessage = document.getElementById('create-event-message');
    const eventsList = document.getElementById('events-list');
    const eventsSearch = document.getElementById('events-search');
    let homeEventsCache = [];
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

        page.style.display = 'block';
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
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
        return url;
    }
    function extractPhotos(raw) {
        let photos = [];
        if (Array.isArray(raw)) {
            photos = raw;
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) photos = parsed;
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

    // Test di connettività al backend
    apiRequest('/health', { timeoutMs: 2500, retry: 1 })
        .then(() => {
            console.log('Connessione al backend riuscita!');
        })
        .catch(error => {
            console.error('Connessione al backend fallita:', error.message || error);
        });

    function updateAuthUI() {
        console.log('updateAuthUI called. Token:', localStorage.getItem('token') ? 'Present' : 'Absent', 'role:', localStorage.getItem('role'), 'currentUser:', currentUser);
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');
    
        if (token) {
            // Nascondi i link di autenticazione e mostra l'area utente
            if (authLinks) authLinks.style.display = 'none';
            if (userInfo) userInfo.style.display = 'block';
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';
            logoutButton.style.display = 'block';
            createEventButton.style.display = userRole === 'admin' ? 'none' : 'block';
            adminDashboardButton.style.display = userRole === 'admin' ? 'block' : 'none';
            welcomeMessage.textContent = `Benvenuto, ${localStorage.getItem('username')}${userRole === 'admin' ? ' (admin)' : ''}`;
            welcomeMessage.style.display = 'block';
        } else {
            // Mostra i link di autenticazione e nascondi l'area utente
            if (authLinks) authLinks.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (loginLink) loginLink.style.display = 'inline-block';
            if (registerLink) registerLink.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            createEventButton.style.display = 'none';
            adminDashboardButton.style.display = 'none';
            welcomeMessage.style.display = 'none';
        }
    }

    // Chiamata iniziale per aggiornare l'interfaccia utente all'avvio
    updateAuthUI();

    // Socket.IO client initialisation and admin listeners
    let socket;
    try {
        if (typeof io !== 'undefined') {
            socket = io();
            socket.on('connect', () => {
                console.log('Socket connesso');
            });
            socket.on('connect_error', (err) => {
                console.warn('Errore connessione socket:', err && (err.message || err));
            });
        }
    } catch (e) {
        console.warn('Socket.IO non disponibile:', e && (e.message || e));
    }

    (function initAdminSocketListeners() {
        const role = localStorage.getItem('role');
        if (!socket || role !== 'admin') return;
        const refresh = () => { try { fetchAdminEvents(); } catch {} };
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
    })();

    async function fetchEvents() {
        try {
            const payload = await apiRequest('/events', { timeoutMs: 6000, retry: 2 });
            let events = Array.isArray(payload) ? payload : (Array.isArray(payload.events) ? payload.events : []);

            // Mostra sempre in home solo eventi approvati di altri utenti
            const currentUserIdStr = localStorage.getItem('userId');
            if (currentUserIdStr) {
                const currentUserId = parseInt(currentUserIdStr, 10);
                if (!Number.isNaN(currentUserId)) {
                    events = events.filter(ev => ev.user_id !== currentUserId);
                }
            }

            homeEventsCache = events;
            applyEventsFilter();
        } catch (error) {
            console.error('Errore di rete durante il recupero degli eventi:', error.message || error);
            homeEventsCache = [];
            applyEventsFilter();
        }
    }

    function applyEventsFilter() {
        let filtered = Array.isArray(homeEventsCache) ? [...homeEventsCache] : [];
        const q = (eventsSearch && eventsSearch.value ? eventsSearch.value : '').trim().toLowerCase();
        if (q) {
            filtered = filtered.filter(ev => {
                const title = String(ev.title || '').toLowerCase();
                const desc = String(ev.description || '').toLowerCase();
                const loc = String(ev.location || '').toLowerCase();
                const cat = String(ev.category_name || '').toLowerCase();
                return title.includes(q) || desc.includes(q) || loc.includes(q) || cat.includes(q);
            });
        }
        displayEvents(filtered);
    }

    function showPage(pageToShow) {
        homePage.style.display = 'none';
        registerPage.style.display = 'none';
        loginPage.style.display = 'none';
        createEventPage.style.display = 'none';
        adminPage.style.display = 'none'; // Nascondi adminPage per impostazione predefinita

        pageToShow.style.display = 'block';
        currentView = pageToShow.id.replace('-page', '');

        if (pageToShow === adminPage) {
            fetchAdminEvents();
            fetchAdminUsers();
        }
    }

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

            const carouselId = `carousel-${event.id}`;
            const dateStr = event.event_date ? new Date(event.event_date).toLocaleString() : '';
            const categoryName = event.category_name || 'N/A';

            eventCard.innerHTML = `
                <div class="carousel" id="${carouselId}">
                    <button class="prev" aria-label="Precedente">‹</button>
                    <div class="slides">
                        ${photos.map((url, idx) => `<img class="slide${idx === 0 ? ' active' : ''}" src="${normalizePhotoUrl(url)}" alt="${event.title} - foto ${idx+1}">`).join('')}
                    </div>
                    <div class="indicators">
                        ${photos.map((_, idx) => `<button class="indicator-dot${idx === 0 ? ' active' : ''}" data-index="${idx}" aria-label="Vai alla slide ${idx+1}"></button>`).join('')}
                    </div>
                    <button class="next" aria-label="Successiva">›</button>
                    <button class="autoplay-toggle" aria-pressed="true" title="Auto-play">Auto</button>
                </div>
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <p class="event-date-time">${dateStr}</p>
                    <p class="event-location">${event.location || ''}</p>
                    <p>${event.description || ''}</p>
                    <p class="event-category">Categoria: ${categoryName}</p>
                    <div class="event-actions"></div>
                </div>
            `;
            eventsList.appendChild(eventCard);

            // Carosello handlers
            const carousel = eventCard.querySelector(`#${carouselId}`);
            const slides = carousel.querySelectorAll('.slide');
            const dots = carousel.querySelectorAll('.indicator-dot');
            let currentIndex = 0;
            const showSlide = (i) => {
                slides.forEach((img, idx) => img.classList.toggle('active', idx === i));
                dots.forEach((dot, idx) => dot.classList.toggle('active', idx === i));
            };
            showSlide(0);
            carousel.querySelector('.prev').addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                showSlide(currentIndex);
                pauseAutoplayTemporarily();
            });
            carousel.querySelector('.next').addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slides.length;
                showSlide(currentIndex);
                pauseAutoplayTemporarily();
            });
            dots.forEach(dot => {
                dot.addEventListener('click', () => {
                    const idx = parseInt(dot.getAttribute('data-index'), 10);
                    currentIndex = Number.isNaN(idx) ? 0 : idx;
                    showSlide(currentIndex);
                    pauseAutoplayTemporarily();
                });
            });
            slides.forEach(img => {
                img.addEventListener('error', () => {
                    img.src = PLACEHOLDER_PHOTO;
                    img.classList.add('img-error');
                });
                img.addEventListener('click', () => openImageModal(img.src, img.alt));
            });
            let autoplayEnabled = true;
            let autoplayTimer = null;
            let resumeTimeout = null;
            const startAutoplay = () => {
                clearInterval(autoplayTimer);
                if (!autoplayEnabled) return;
                autoplayTimer = setInterval(() => {
                    currentIndex = (currentIndex + 1) % slides.length;
                    showSlide(currentIndex);
                }, DEFAULT_AUTOPLAY_MS);
            };
            const stopAutoplay = () => {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            };
            const pauseAutoplayTemporarily = () => {
                stopAutoplay();
                clearTimeout(resumeTimeout);
                resumeTimeout = setTimeout(() => { if (autoplayEnabled) startAutoplay(); }, 3000);
            };
            const toggleBtn = carousel.querySelector('.autoplay-toggle');
            toggleBtn.addEventListener('click', () => {
                autoplayEnabled = !autoplayEnabled;
                toggleBtn.setAttribute('aria-pressed', String(autoplayEnabled));
                toggleBtn.classList.toggle('on', autoplayEnabled);
                if (autoplayEnabled) startAutoplay(); else stopAutoplay();
            });
            carousel.addEventListener('mouseenter', () => { stopAutoplay(); });
            carousel.addEventListener('mouseleave', () => { if (autoplayEnabled) startAutoplay(); });
            startAutoplay();

            const actions = eventCard.querySelector('.event-actions');
            try {
                const role = localStorage.getItem('role');
                const hasToken = !!localStorage.getItem('token');
                if (hasToken && role !== 'admin') {
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
                }
            } catch (_) {}
        });
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
                lastRegisteredEmail = email;
                if (resendBtn) {
                    resendBtn.style.display = 'inline-block';
                }
                // Non resetto subito per poter usare il pulsante "Reinvia"
                setTimeout(() => {
                    showPage(loginPage);
                    registerMessage.textContent = '';
                    if (resendBtn) resendBtn.style.display = 'none';
                    registerForm.reset();
                }, 2000);
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

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            const emailToUse = lastRegisteredEmail || document.getElementById('register-email').value;
            if (!isValidEmail(emailToUse)) {
                registerMessage.textContent = 'Email non valida per il reinvio.';
                registerMessage.className = 'error-message';
                return;
            }
            try {
                const data = await apiRequest('/users/resend-verification', {
                    method: 'POST',
                    timeoutMs: 8000,
                    retry: 1,
                    body: { email: emailToUse }
                });
                if (!data.status || (data.status && data.status < 400)) {
                    registerMessage.textContent = data.message || 'Email di verifica reinviata.';
                    registerMessage.className = 'success-message';
                } else {
                    registerMessage.textContent = data.error || data.message || 'Impossibile reinviare l\'email.';
                    registerMessage.className = 'error-message';
                }
            } catch (err) {
                console.error('Errore reinvio verifica:', err.message || err);
                registerMessage.textContent = (err && err.status)
                    ? (err.data?.message || err.data?.error || err.message || 'Impossibile reinviare l\'email.')
                    : 'Errore di rete nel reinvio.';
                registerMessage.className = 'error-message';
            }
        });
    }

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
});