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

    // Funzione per mostrare o nascondere le pagine
    function showPage(page) {
        homePage.style.display = 'none';
        registerPage.style.display = 'none';
        loginPage.style.display = 'none';
        createEventPage.style.display = 'none';
        adminPage.style.display = 'none';

        page.style.display = 'block';
    }

    const API_BASE_URL = 'http://localhost:3000/api';

    // Test di connettività al backend
    fetch(`${API_BASE_URL}/health`)
        .then(response => {
            if (response.ok) {
                console.log('Connessione al backend riuscita!');
            } else {
                console.error('Connessione al backend fallita:', response.statusText);
            }
        })
        .catch(error => {
            console.error('Errore di rete durante il test di connettività:', error);
        });

    function updateAuthUI() {
        console.log('updateAuthUI called. Token:', localStorage.getItem('token') ? 'Present' : 'Absent', 'role:', localStorage.getItem('role'), 'currentUser:', currentUser);
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');
    
        if (token) {
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';
            logoutButton.style.display = 'block';
            createEventButton.style.display = userRole === 'admin' ? 'none' : 'block';
            adminDashboardButton.style.display = userRole === 'admin' ? 'block' : 'none';
            welcomeMessage.textContent = `Benvenuto, ${localStorage.getItem('username')}${userRole === 'admin' ? ' (admin)' : ''}`;
            welcomeMessage.style.display = 'block';
        } else {
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

    async function fetchEvents() {
        try {
            const response = await fetch(`${API_BASE_URL}/events`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Errore nel recupero degli eventi:', errorData.message || response.statusText);
                homeEventsCache = [];
                applyEventsFilter();
                return;
            }
            const payload = await response.json();
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
            console.error('Errore di rete durante il recupero degli eventi:', error);
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
            const pendingRes = await fetch(`${API_BASE_URL}/admin/events/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const pendingPayload = await pendingRes.json();
            const pendingEvents = Array.isArray(pendingPayload) ? pendingPayload : (Array.isArray(pendingPayload.events) ? pendingPayload.events : []);
            displayAdminEvents(pendingEvents, pendingEventsList, 'pending');
            approvedEventsList.innerHTML = '<p>Integrazione in corso.</p>';
            reportedEventsList.innerHTML = '<p>Integrazione in corso.</p>';

        } catch (error) {
            console.error('Errore nel recupero degli eventi admin:', error);
        }
    }

    async function fetchAdminUsers() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, cannot fetch admin users.');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const payload = await res.json();
            const users = Array.isArray(payload) ? payload : (Array.isArray(payload.users) ? payload.users : []);
            adminUsersCache = users;
            applyUsersFilter();
        } catch (error) {
            console.error('Errore nel recupero degli utenti admin:', error);
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
                    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/block`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ isBlocked: action === 'block' })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message || 'Operazione completata.');
                        fetchAdminUsers();
                    } else {
                        alert(data.error || data.message || 'Operazione non riuscita.');
                    }
                } catch (err) {
                    console.error('Errore blocco/sblocco utente:', err);
                    alert('Errore di rete durante il blocco/sblocco utente.');
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
            eventItem.innerHTML = `
                <span>${event.title}</span>
                <div class="actions">
                    ${type === 'pending' ? `
                        <button data-id="${event.id}" data-action="approve">Accetta</button>
                        <button data-id="${event.id}" data-action="reject" class="reject">Rifiuta</button>
                    ` : ''}
                    <button data-id="${event.id}" data-action="delete" class="delete">Elimina</button>
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
                        url = `${API_BASE_URL}/admin/events/${eventId}/approve`;
                        method = 'PATCH';
                        headers['Content-Type'] = 'application/json';
                        body = JSON.stringify({ isApproved: action === 'approve' });
                    } else if (action === 'delete') {
                        url = `${API_BASE_URL}/admin/events/${eventId}`;
                        method = 'DELETE';
                    }

                    const response = await fetch(url, {
                        method,
                        headers,
                        body
                    });

                    if (response.ok) {
                        const okMsg = action === 'approve' ? 'Evento approvato con successo!' : (action === 'reject' ? 'Evento rifiutato con successo!' : 'Evento eliminato con successo!');
                        alert(okMsg);
                        fetchAdminEvents(); // Refresh the lists
                    } else {
                        const errorData = await response.json();
                        alert(`Errore: ${errorData.error || errorData.message || 'Azione non riuscita.'}`);
                    }
                } catch (error) {
                    console.error(`Errore durante l'azione ${action} sull'evento:`, error);
                    alert(`Errore di rete durante l'azione ${action}.`);
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

            const photos = Array.isArray(event.photos) && event.photos.length > 0 ? event.photos : [
                'https://via.placeholder.com/600x300?text=Evento'
            ];

            const carouselId = `carousel-${event.id}`;
            const dateStr = event.event_date ? new Date(event.event_date).toLocaleString() : '';
            const categoryName = event.category_name || 'N/A';

            eventCard.innerHTML = `
                <div class="carousel" id="${carouselId}">
                    <button class="prev">‹</button>
                    <div class="slides">
                        ${photos.map((url, idx) => `<img class="slide${idx === 0 ? ' active' : ''}" src="${url}" alt="${event.title} - foto ${idx+1}">`).join('')}
                    </div>
                    <button class="next">›</button>
                </div>
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <p class="event-date-time">${dateStr}</p>
                    <p class="event-location">${event.location || ''}</p>
                    <p>${event.description || ''}</p>
                    <p class="event-category">Categoria: ${categoryName}</p>
                </div>
            `;
            eventsList.appendChild(eventCard);

            // Carosello handlers
            const carousel = eventCard.querySelector(`#${carouselId}`);
            const slides = carousel.querySelectorAll('.slide');
            let currentIndex = 0;
            const showSlide = (i) => {
                slides.forEach((img, idx) => img.classList.toggle('active', idx === i));
            };
            carousel.querySelector('.prev').addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                showSlide(currentIndex);
            });
            carousel.querySelector('.next').addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slides.length;
                showSlide(currentIndex);
            });
        });
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/events/categories`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const categories = await response.json();
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
            console.error('Errore nel recupero delle categorie:', error);
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

    createEventButton.addEventListener('click', (e) => {
        e.preventDefault();
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
            if (!isUsernameAllowed(username)) {
                registerMessage.textContent = 'Username non consentito. Scegli un nome appropriato.';
                registerMessage.className = 'error-message';
                return;
            }
            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (response.ok) {
                registerMessage.textContent = data.message;
                registerMessage.className = 'success-message';
                registerForm.reset();
                setTimeout(() => {
                    showPage(loginPage);
                    registerMessage.textContent = '';
                }, 2000);
            } else {
                registerMessage.textContent = data.message;
                registerMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante la registrazione:', error);
            registerMessage.textContent = 'Errore di rete. Impossibile registrare l\'utente.';
            registerMessage.className = 'error-message';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user?.username || '');
                localStorage.setItem('role', data.user?.role || 'user');
                if (data.user?.id !== undefined && data.user?.id !== null) {
                    localStorage.setItem('userId', String(data.user.id));
                } else {
                    localStorage.removeItem('userId');
                }
                currentUser = { username: data.user?.username || '', role: data.user?.role || 'user' };
                loginMessage.textContent = data.message || 'Login effettuato con successo!';
                loginMessage.className = 'success-message';
                loginForm.reset();
                setTimeout(() => {
                    // Se è admin, vai direttamente al pannello admin
                    if ((data.user?.role || localStorage.getItem('role')) === 'admin') {
                        showPage(adminPage);
                        fetchAdminEvents();
                    } else {
                        // Altrimenti vai alla home standard
                        showPage(homePage);
                        fetchEvents();
                    }
                    loginMessage.textContent = '';
                }, 2000);
            } else {
                // Messaggio specifico richiesto quando utente non è registrato
                if (response.status === 401 && (data.error === 'Credenziali non valide.' || data.message === 'Credenziali non valide.')) {
                    loginMessage.textContent = 'Utente non registrato. Per favore procedi con la registrazione.';
                } else {
                    loginMessage.textContent = data.error || data.message || 'Credenziali non valide.';
                }
                loginMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante il login:', error);
            loginMessage.textContent = 'Errore di rete. Impossibile connettersi al server.';
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

            const response = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                createEventMessage.textContent = data.message;
                createEventMessage.className = 'success-message';
                createEventForm.reset();
                setTimeout(() => {
                    showPage(homePage);
                    fetchEvents();
                    createEventMessage.textContent = '';
                }, 2000);
            } else {
                createEventMessage.textContent = data.error || data.message || 'Errore nella creazione dell\'evento.';
                createEventMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante la creazione dell\'evento:', error);
            createEventMessage.textContent = 'Errore di rete. Impossibile creare l\'evento.';
            createEventMessage.className = 'error-message';
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