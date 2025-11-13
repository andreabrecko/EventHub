// File: src/routes/userRoutes.js
// Gestione utenti: registrazione, login, verifica email e recupero profilo.
// Le rotte pubbliche non richiedono token; le rotte protette usano authMiddleware.

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Rotte pubbliche
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.patch('/notifications', authMiddleware.protect, userController.toggleLoginNotifications);

// Rotta protetta (esempio): ritorna i dati utente estratti dal token
router.get('/me', authMiddleware.protect, userController.getMe);

module.exports = router;