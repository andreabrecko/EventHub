import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const toggleAdminMenu = () => {
    setIsAdminMenuOpen(!isAdminMenuOpen);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/">EventHub</Link>
        </div>
        <div className="navbar-right">
          {!isAuthenticated ? (
            <>
              <Link to="/register">Registrati</Link>
              <Link to="/login">Accedi</Link>
              {/* Only show Admin Area dropdown if user is an admin */}
              {user && user.role === 'admin' && (
                <div className="admin-dropdown">
                  <button onClick={toggleAdminMenu} className="admin-button">Area Admin</button>
                  {isAdminMenuOpen && (
                    <div className="admin-dropdown-content">
                      <Link to="/admin/login" className="dropdown-item">Accedi Admin</Link>
                      <Link to="/admin/home" className="dropdown-item">Admin Home</Link>
                      <Link to="/admin/users" className="dropdown-item">Gestione Utenti</Link>
                      <Link to="/admin/create" className="dropdown-item">Crea Admin</Link>
                      <Link to="/admin/reports" className="dropdown-item">Segnalazioni</Link>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <span>Benvenuto, {user.username || user.email}!</span>
              <button onClick={logout} style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>Logout</button>
              {/* Only show Admin Area dropdown if user is an admin */}
              {user && user.role === 'admin' && (
                <div className="admin-dropdown">
                  <button onClick={toggleAdminMenu} className="admin-button">Area Admin</button>
                  {isAdminMenuOpen && (
                    <div className="admin-dropdown-content">
                      <Link to="/admin/home" className="dropdown-item">Admin Home</Link>
                      <Link to="/admin/users" className="dropdown-item">Gestione Utenti</Link>
                      <Link to="/admin/create" className="dropdown-item">Crea Admin</Link>
                      <Link to="/admin/reports" className="dropdown-item">Segnalazioni</Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </nav>
      <div className="content-area">
        <Outlet /> {/* This is where child routes will be rendered */}
      </div>
    </div>
  );
}

export default App;
