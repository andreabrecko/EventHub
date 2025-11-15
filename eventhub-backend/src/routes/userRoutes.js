// File: src/routes/userRoutes.js
// Gestione utenti: registrazione, login, verifica email e recupero profilo.
// Le rotte pubbliche non richiedono token; le rotte protette usano authMiddleware.

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verificationController = require('../controllers/verificationController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Rotte pubbliche
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/logout', authMiddleware.protect, userController.logoutUser);
router.patch('/notifications', authMiddleware.protect, userController.toggleLoginNotifications);

// Verifica email: richiesta token e verifica tramite link
router.post('/verify-email', verificationController.requestEmailVerification);
router.get('/verify-email', verificationController.verifyEmail);

// Reset password: richiesta e conferma
router.post('/password-reset/request', verificationController.requestPasswordReset);
router.post('/reset-password', verificationController.resetPassword);

// Rotta protetta (esempio): ritorna i dati utente estratti dal token
router.get('/me', authMiddleware.protect, userController.getMe);
// Eventi creati dall'utente
router.get('/me/events', authMiddleware.protect, userController.getMyEvents);
// Eventi a cui l'utente è registrato
router.get('/me/registrations', authMiddleware.protect, userController.getMyRegistrations);

module.exports = router;