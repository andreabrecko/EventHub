// File: src/routes/userRoutes.js
// Gestione utenti: registrazione, login, verifica email e recupero profilo.
// Le rotte pubbliche non richiedono token; le rotte protette usano authMiddleware.

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Rotte pubbliche
// POST /api/users/register: crea un nuovo utente e invia email di verifica
router.post('/register', userController.registerUser);
// POST /api/users/login: autentica e ritorna JWT
router.post('/login', userController.loginUser); 
// GET /api/users/verify-email: conferma la verifica via token
router.get('/verify-email', userController.verifyEmail);
// POST /api/users/resend-verification: reinvia email di verifica
router.post('/resend-verification', userController.resendVerificationEmail);

// Rotta protetta (esempio): ritorna i dati utente estratti dal token
router.get('/me', 
    authMiddleware.protect, // Richiede un token valido
    (req, res) => {
        res.status(200).json({
            message: 'Dati profilo utente autenticato',
            user: req.user
        });
});

module.exports = router;