document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home-link');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button');
    const createEventButton = document.getElementById('create-event-button');
    const adminButton = document.getElementById('admin-button'); // This is the new admin button in navbar-left

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
    const eventCategorySelect = document.getElementById('event-category');

    // Admin Login Modal elements
    const adminLoginModal = document.getElementById('admin-login-modal');
    const closeButton = adminLoginModal.querySelector('.close-button');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminLoginMessage = document.getElementById('admin-login-message');

    // Admin Dashboard elements
    const pendingEventsList = document.getElementById('pending-events-list');
    const approvedEventsList = document.getElementById('approved-events-list');
    const reportedEventsList = document.getElementById('reported-events-list');

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
        console.log('updateAuthUI called. Token:', localStorage.getItem('token') ? 'Present' : 'Absent', 'isAdmin:', localStorage.getItem('role') === 'admin', 'currentUser:', currentUser);
        const token = localStorage.getItem('token');
        const isAdmin = localStorage.getItem('role') === 'admin';
    
        if (token) {
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';
            logoutButton.style.display = 'block';
            createEventButton.style.display = isAdmin ? 'none' : 'block';
            welcomeMessage.textContent = `Benvenuto, ${localStorage.getItem('username')}${isAdmin ? ' (admin)' : ''}`;
            welcomeMessage.style.display = 'block';
        } else {
            if (loginLink) loginLink.style.display = 'inline-block';
            if (registerLink) registerLink.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            createEventButton.style.display = 'none';
            welcomeMessage.style.display = 'none';
        }
    }

    // Chiamata iniziale per aggiornare l'interfaccia utente all'avvio
    updateAuthUI();

    async function fetchEvents() {
        try {
            const response = await fetch(`${API_BASE_URL}/events?status=approved`); // Modificato per recuperare solo eventi approvati
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Errore nel recupero degli eventi:', errorData.message);
                displayEvents([]); // Passa un array vuoto in caso di errore
                return;
            }
            let events = await response.json();
            
            // Assicurati che events sia un array
            if (!Array.isArray(events)) {
                console.warn('La risposta dell\'API per gli eventi non è un array. Reinizializzazione a un array vuoto.', events);
                events = [];
            }
            displayEvents(events);
        } catch (error) {
            console.error('Errore di rete durante il recupero degli eventi:', error);
            displayEvents([]); // Passa un array vuoto in caso di errore di rete
        }
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
        }
    }

    async function fetchAdminEvents() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, cannot fetch admin events.');
            return;
        }

        try {
            const [pendingRes, approvedRes, reportedRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/events/pending`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/admin/events/approved`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/admin/events/reported`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const pendingEvents = await pendingRes.json();
            const approvedEvents = await approvedRes.json();
            const reportedEvents = await reportedRes.json();

            displayAdminEvents(pendingEvents, pendingEventsList, 'pending');
            displayAdminEvents(approvedEvents, approvedEventsList, 'approved');
            displayAdminEvents(reportedEvents, reportedEventsList, 'reported');

        } catch (error) {
            console.error('Errore nel recupero degli eventi admin:', error);
        }
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
                    ${type === 'pending' ? `<button data-id="${event._id}" data-action="approve">Approva</button>` : ''}
                    <button data-id="${event._id}" data-action="delete" class="delete">Elimina</button>
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
                    let method = 'PUT';

                    if (action === 'approve') {
                        url = `${API_BASE_URL}/admin/events/${eventId}/approve`;
                    } else if (action === 'delete') {
                        url = `${API_BASE_URL}/admin/events/${eventId}/delete`;
                        method = 'DELETE';
                    }

                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        alert(`Evento ${action === 'approve' ? 'approvato' : 'eliminato'} con successo!`);
                        fetchAdminEvents(); // Refresh the lists
                    } else {
                        const errorData = await response.json();
                        alert(`Errore: ${errorData.message}`);
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
            eventCard.innerHTML = `
                <img src="${event.imageUrl || 'https://via.placeholder.com/150'}" alt="${event.title}">
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <p class="event-date-time">${new Date(event.date).toLocaleDateString()} ${event.time}</p>
                    <p class="event-location">${event.location}</p>
                    <p>${event.description}</p>
                    <p class="event-category">Categoria: ${event.category ? event.category.name : 'N/A'}</p>
                </div>
            `;
            eventsList.appendChild(eventCard);
        });
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const categories = await response.json();
            eventCategorySelect.innerHTML = '<option value="">Seleziona una categoria</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                eventCategorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Errore nel recupero delle categorie:', error);
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
        currentUser = null;
        updateAuthUI();
        showPage(homePage);
        fetchEvents();
    });

    createEventButton.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(createEventPage);
        fetchCategories();
    });

    // Admin button click to show modal
    adminButton.addEventListener('click', (e) => {
        e.preventDefault();
        adminLoginModal.style.display = 'flex'; // Show the modal
    });

    // Close modal button
    closeButton.addEventListener('click', () => {
        adminLoginModal.style.display = 'none';
        adminLoginForm.reset();
        adminLoginMessage.textContent = '';
    });

    // Close modal if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === adminLoginModal) {
            adminLoginModal.style.display = 'none';
            adminLoginForm.reset();
            adminLoginMessage.textContent = '';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
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
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role); // Aggiunto: Salva il ruolo dell'admin
                currentUser = { username: data.username, role: data.role }; // Aggiorna currentUser
                loginMessage.textContent = data.message;
                loginMessage.className = 'success-message';
                loginForm.reset();
                setTimeout(() => {
                    showPage(homePage);
                    fetchEvents();
                    loginMessage.textContent = '';
                }, 2000);
            } else {
                loginMessage.textContent = data.message;
                loginMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante il login:', error);
            loginMessage.textContent = 'Errore di rete. Impossibile connettersi al server.';
            loginMessage.className = 'error-message';
        }
    });

    // Admin login form submission
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;

        // Basic email format validation
        if (!/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
            adminLoginMessage.textContent = 'Formato email non valido.';
            adminLoginMessage.className = 'error-message';
            return;
        }

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
                if (data.role === 'admin') {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('isAdmin', 'true');
                    localStorage.setItem('role', data.role); // Aggiunto: Salva il ruolo dell'admin
                    currentUser = { username: data.username, role: data.role }; // Aggiorna currentUser
                    adminLoginMessage.textContent = 'Login effettuato con successo!';
                    adminLoginMessage.className = 'success-message';
                    adminLoginForm.reset();
                    setTimeout(() => {
                        adminLoginModal.style.display = 'none';
                        adminLoginMessage.textContent = '';
                        updateAuthUI();
                        showPage(adminPage);
                        fetchAdminEvents();
                    }, 1000); // Mostra il messaggio per 1 secondo
                } else {
                    adminLoginMessage.textContent = 'Accesso negato: non sei un amministratore.';
                    adminLoginMessage.className = 'error-message';
                }
            } else {
                adminLoginMessage.textContent = data.message || 'Credenziali non valide.';
                adminLoginMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante il login admin:', error);
            adminLoginMessage.textContent = 'Errore di rete. Impossibile connettersi al server.';
            adminLoginMessage.className = 'error-message';
        }
    });

    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;
        const imageUrl = document.getElementById('event-image-url').value;
        const capacity = document.getElementById('event-capacity').value;
        const minParticipants = document.getElementById('event-min-participants').value;
        const maxParticipants = document.getElementById('event-max-participants').value;
        const category = eventCategorySelect.value;

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title, description, date, time, location, imageUrl,
                    capacity: parseInt(capacity),
                    minParticipants: minParticipants ? parseInt(minParticipants) : undefined,
                    maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
                    category,
                    status: 'pending' // Imposta lo stato iniziale come 'pending'
                })
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
                createEventMessage.textContent = data.message;
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
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (token) {
        if (isAdmin) {
            showPage(adminPage);
            fetchAdminEvents();
        } else {
            showPage(homePage);
        }
    } else {
        showPage(homePage);
    }
});