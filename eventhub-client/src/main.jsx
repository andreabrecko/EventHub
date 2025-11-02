import React from 'react';
import ReactDOM from 'react-dom/client';
import Register from './pages/Register.jsx'; // Importa il tuo nuovo componente
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Register /> {/* Mostra il componente Register */}
  </React.StrictMode>,
);