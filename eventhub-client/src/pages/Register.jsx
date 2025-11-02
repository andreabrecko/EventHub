import React, { useState } from 'react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Registrazione in corso...');

    try {
      // La richiesta va a /api/user/register, ma Vite la reindirizza a http://localhost:3000/api/user/register
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Registrazione riuscita! Ora puoi accedere.');
      } else {
        setMessage(`❌ Errore di registrazione: ${data.message || 'Errore sconosciuto.'}`);
      }

    } catch (error) {
      // Questo errore si verifica se il backend (server.js) non è avviato.
      setMessage(`❌ Errore di rete. Assicurati che il backend sia avviato su http://localhost:3000.`);
      console.error('Network or server error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Registrazione Utente</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" style={{ marginTop: '10px' }}>Registrati</button>
      </form>
      {message && <p style={{ marginTop: '15px' }}>{message}</p>}
    </div>
  );
};

export default Register;