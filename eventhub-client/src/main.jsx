import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminHome from './pages/AdminHome.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import CreateAdmin from './pages/CreateAdmin.jsx';
import Reports from './pages/Reports.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin/home" element={<AdminHome />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/create" element={<CreateAdmin />} />
            <Route path="admin/reports" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>,
);