// File: src/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rotta per la registrazione: POST /users/register
router.post('/register', userController.registerUser);

// Rotta per il login: POST /users/login
router.post('/login', userController.loginUser); 

module.exports = router;