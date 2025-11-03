// Utility functions for showing/hiding pages
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

// Navigation event listeners
document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('home-page');
    fetchEvents(); // Fetch events when navigating to home
});

document.getElementById('register-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('register-page');
});

document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('login-page');
});

document.getElementById('create-event-button').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('create-event-page');
    fetchCategories(); // Fetch categories when navigating to create event page
});

document.getElementById('logout-button').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI();
    showPage('home-page');
    fetchEvents();
});

// Function to update UI based on authentication status
function updateAuthUI() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const welcomeMessage = document.getElementById('welcome-message');
    const createEventButton = document.getElementById('create-event-button');

    if (token && username) {
        authLinks.style.display = 'none';
        userInfo.style.display = 'block';
        welcomeMessage.textContent = `Benvenuto, ${username}!`;
        createEventButton.style.display = 'inline-block'; // Show create event button for logged in users
    } else {
        authLinks.style.display = 'block';
        userInfo.style.display = 'none';
        createEventButton.style.display = 'none';
    }
}

// Initial UI update and event fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    showPage('home-page');
    fetchEvents();
});

// Placeholder for other functions (authentication, event fetching, event creation)
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const messageElement = document.getElementById('register-message');

    try {
        const response = await fetch('http://localhost:3000/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();

        if (response.ok) {
            messageElement.textContent = data.message; // Assuming backend sends a 'message' on success
            messageElement.className = 'success-message';
            document.getElementById('register-form').reset();
            showPage('login-page'); // Redirect to login after successful registration
            showPage('home-page'); // Redirect to home after successful registration
            updateAuthUI(); // Update UI to reflect logged-in state
            fetchEvents(); // Refresh events on home page
        } else {
            messageElement.textContent = data.error || 'Errore di registrazione sconosciuto.';
            messageElement.className = 'error-message';
        }
    } catch (error) {
        messageElement.textContent = 'Errore di rete. Impossibile connettersi al server.';
        messageElement.className = 'error-message';
    }
}

document.getElementById('register-form').addEventListener('submit', handleRegister);

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageElement = document.getElementById('login-message');

    try {
        const response = await fetch('http://localhost:3000/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            updateAuthUI();
            messageElement.textContent = 'Accesso effettuato con successo!';
            messageElement.className = 'success-message';
            document.getElementById('login-form').reset();
            showPage('home-page');
            fetchEvents();
        } else {
            messageElement.textContent = data.error || 'Errore di accesso sconosciuto.';
            messageElement.className = 'error-message';
        }
    } catch (error) {
        messageElement.textContent = 'Errore di rete. Impossibile connettersi al server.';
        messageElement.className = 'error-message';
    }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);

async function fetchEvents() {
    const eventsListDiv = document.getElementById('events-list');
    eventsListDiv.innerHTML = 'Caricamento eventi...';

    try {
        const response = await fetch('http://localhost:3000/api/events');
        const data = await response.json();

        if (response.ok) {
            if (data.events.length === 0) {
                eventsListDiv.innerHTML = '<p>Nessun evento disponibile al momento.</p>';
                return;
            }
            eventsListDiv.innerHTML = ''; // Clear loading message
            data.events.forEach(event => {
                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.innerHTML = `
                    <h3>${event.title}</h3>
                    <p><strong>Data:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                    <p><strong>Ora:</strong> ${event.time}</p>
                    <p><strong>Luogo:</strong> ${event.location}</p>
                    <p><strong>Descrizione:</strong> ${event.description}</p>
                    <p><strong>Categoria:</strong> ${event.category_name}</p>
                    <p><strong>Posti disponibili:</strong> ${event.capacity}</p>
                    ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}">` : ''}
                `;
                eventsListDiv.appendChild(eventCard);
            });
        } else {
            eventsListDiv.innerHTML = `<p class="error-message">Errore nel caricamento degli eventi: ${data.error || 'Sconosciuto'}</p>`;
        }
    } catch (error) {
        eventsListDiv.innerHTML = '<p class="error-message">Errore di rete. Impossibile caricare gli eventi.</p>';
    }
}

async function fetchCategories() {
    const categorySelect = document.getElementById('event-category');
    categorySelect.innerHTML = '<option value="">Caricamento categorie...</option>';

    try {
        const response = await fetch('http://localhost:3000/api/categories'); // Assuming a categories endpoint
        const data = await response.json();

        if (response.ok) {
            categorySelect.innerHTML = '<option value="">Seleziona una categoria</option>'; // Clear loading message
            data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                categorySelect.appendChild(option);
            });
        } else {
            categorySelect.innerHTML = '<option value="">Errore nel caricamento categorie</option>';
        }
    } catch (error) {
        categorySelect.innerHTML = '<option value="">Errore di rete</option>';
    }
}

async function handleCreateEvent(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('create-event-message').textContent = 'Devi essere loggato per creare un evento.';
        document.getElementById('create-event-message').className = 'error-message';
        return;
    }

    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const location = document.getElementById('event-location').value;
    const imageUrl = document.getElementById('event-image-url').value;
    const capacity = parseInt(document.getElementById('event-capacity').value);
    const minParticipants = parseInt(document.getElementById('event-min-participants').value) || 0;
    const maxParticipants = parseInt(document.getElementById('event-max-participants').value) || capacity;
    const categoryId = document.getElementById('event-category').value;
    const messageElement = document.getElementById('create-event-message');

    try {
        const response = await fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                date,
                time,
                location,
                image_url: imageUrl,
                capacity,
                min_participants: minParticipants,
                max_participants: maxParticipants,
                category_id: categoryId
            })
        });
        const data = await response.json();

        if (response.ok) {
            messageElement.textContent = data.message || 'Evento creato con successo! In attesa di approvazione.';
            messageElement.className = 'success-message';
            document.getElementById('create-event-form').reset();
            showPage('home-page');
            fetchEvents();
        } else {
            messageElement.textContent = data.error || 'Errore nella creazione dell\'evento.';
            messageElement.className = 'error-message';
        }
    } catch (error) {
        messageElement.textContent = 'Errore di rete. Impossibile creare l\'evento.';
        messageElement.className = 'error-message';
    }
}

document.getElementById('create-event-form').addEventListener('submit', handleCreateEvent);