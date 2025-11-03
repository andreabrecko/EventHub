import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/events');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data.events);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to the EventHub!</p>
      {!user ? (
        <div>
          <Link to="/register">Registrati</Link>
          <Link to="/login">Accedi</Link>
        </div>
      ) : (
        <>
          <button onClick={logout} style={{ backgroundColor: 'red', color: 'white', marginRight: '10px' }}>Logout</button>
          <Link to="/create-event" style={{ backgroundColor: 'green', color: 'white', padding: '8px 12px', textDecoration: 'none', borderRadius: '5px' }}>Crea un nuovo evento</Link>
          <h2>Eventi Disponibili</h2>
          {loading && <p>Caricamento eventi...</p>}
          {error && <p>Errore: {error}</p>}
          {!loading && events.length === 0 && <p>Nessun evento disponibile al momento.</p>}
          <div className="event-list">
            {events.map(event => (
              <div key={event.id} className="event-card">
                <h3>{event.title}</h3>
                <p><strong>Data:</strong> {new Date(event.event_date).toLocaleDateString()}</p>
                <p><strong>Ora:</strong> {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p><strong>Luogo:</strong> {event.location}</p>
                <p><strong>Descrizione:</strong> {event.description}</p>
                <p><strong>Categoria:</strong> {event.category_name}</p>
                <p><strong>Posti disponibili:</strong> {event.capacity - event.current_registrations}</p>
                {event.image_url && <img src={event.image_url} alt={event.title} style={{ maxWidth: '200px' }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;