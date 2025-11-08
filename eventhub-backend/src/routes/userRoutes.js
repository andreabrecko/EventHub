// File: src/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Rotte pubbliche
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser); 
router.get('/verify-email', userController.verifyEmail);

// Rotta protetta (per testare il token)
router.get('/me', 
    authMiddleware.protect, // Richiede un token valido
    (req, res) => {
        res.status(200).json({
            message: 'Dati profilo utente autenticato',
            user: req.user
        });
});

module.exports = router;