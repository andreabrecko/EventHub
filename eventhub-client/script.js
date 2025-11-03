document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home-link');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button');
    const createEventButton = document.getElementById('create-event-button');
    const adminButton = document.getElementById('admin-button'); // This is the new admin button in navbar-left

    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const welcomeMessage = document.getElementById('welcome-message');

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

    let currentView = 'home';
    let currentUser = null;

    const API_BASE_URL = 'http://localhost:3000/api';

    function showPage(pageToShow) {
        homePage.style.display = 'none';
        registerPage.style.display = 'none';
        loginPage.style.display = 'none';
        createEventPage.style.display = 'none';
        adminPage.style.display = 'none';

        pageToShow.style.display = 'block';
        currentView = pageToShow.id.replace('-page', '');
    }

    function updateAuthUI() {
        const token = localStorage.getItem('token');
        if (token) {
            authLinks.style.display = 'none';
            userInfo.style.display = 'flex';
            const username = localStorage.getItem('username');
            const role = localStorage.getItem('role');
            welcomeMessage.textContent = `Benvenuto, ${username} (${role})`;

            // Hide the admin button in the navbar-left if logged in
            adminButton.style.display = 'none';

            if (role === 'admin') {
                createEventButton.style.display = 'block';
                // The admin page itself will be shown via the modal login, not this button
            } else if (role === 'organizer') {
                createEventButton.style.display = 'block';
            } else {
                createEventButton.style.display = 'none';
            }
        } else {
            authLinks.style.display = 'flex';
            userInfo.style.display = 'none';
            createEventButton.style.display = 'none';
            // Show the admin button in the navbar-left only if not logged in
            adminButton.style.display = 'block';
        }
    }

    async function fetchEvents() {
        try {
            const response = await fetch(`${API_BASE_URL}/events`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            displayEvents(data.events);
        } catch (error) {
            console.error('Errore nel recupero degli eventi:', error);
            eventsList.innerHTML = '<p class="error-message">Errore di rete. Impossibile caricare gli eventi.</p>';
        }
    }

    function displayEvents(events) {
        eventsList.innerHTML = '';
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
                localStorage.setItem('role', data.role);
                currentUser = { username: data.username, role: data.role };
                loginMessage.textContent = data.message;
                loginMessage.className = 'success-message';
                loginForm.reset();
                updateAuthUI();
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
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
                    localStorage.setItem('role', data.role);
                    currentUser = { username: data.username, role: data.role };
                    adminLoginMessage.textContent = data.message;
                    adminLoginMessage.className = 'success-message';
                    adminLoginForm.reset();
                    updateAuthUI();
                    adminLoginModal.style.display = 'none'; // Hide modal on successful admin login
                    showPage(adminPage); // Show admin page
                    adminLoginMessage.textContent = '';
                } else {
                    adminLoginMessage.textContent = 'Accesso negato: non sei un amministratore.';
                    adminLoginMessage.className = 'error-message';
                }
            } else {
                adminLoginMessage.textContent = data.message;
                adminLoginMessage.className = 'error-message';
            }
        } catch (error) {
            console.error('Errore durante il login amministratore:', error);
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
                    category
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
});