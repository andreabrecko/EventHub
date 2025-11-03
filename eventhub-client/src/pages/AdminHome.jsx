import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminHome = () => {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    if (!token) {
      setMessage('Non autorizzato. Effettua il login come amministratore.');
      return;
    }

    try {
      const response = await fetch('/api/admin/events/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events);
        console.log("Fetched events:", data.events);
      } else {
        setMessage(`Errore nel recupero degli eventi: ${data.error || 'Errore sconosciuto.'}`);
      }
    } catch (error) {
      setMessage('Errore di rete durante il recupero degli eventi.');
      console.error('Errore di rete:', error);
    }
  };

  const handleApprove = (id, status) => {
    console.log(`Attempting to ${status} event with ID: ${id}`);
    if (!token) {
      setMessage('Non autorizzato. Effettua il login come amministratore.');
      return;
    }

    try {
      console.log("Inside try block, before fetch");
    } catch (error) {
      // console.error('Errore di rete:', error);
    }
  };

  return (
    <div>
      <h1>Admin Home Page (Fetching Data)</h1>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      {token ? <p>Logged in as admin</p> : <p>Not logged in</p>}

      <h2>Eventi in attesa di approvazione</h2>
      {events.length === 0 ? (
        <p>Nessun evento in attesa di approvazione.</p>
      ) : (
        <ul>
          {events.map(event => (
            <li key={event._id}>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <p>Data: {new Date(event.date).toLocaleDateString()}</p>
              <p>Stato: {event.status}</p>
              {event.status === 'pending' && (
                <div>
                  <button onClick={() => handleApprove(event._id, 'approved')}>Approva</button>
                  <button onClick={() => handleApprove(event._id, 'rejected')}>Rifiuta</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminHome;