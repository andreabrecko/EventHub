// File: src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Tutti gli endpoint admin DEVONO essere protetti e ristretti al ruolo 'admin'
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

// Rotta per ottenere eventi in attesa di approvazione
router.get('/events/pending', adminController.getPendingEvents);

// Rotta per approvare/rifiutare un evento (PATCH /api/admin/events/:id/approve)
router.patch('/events/:id/approve', adminController.approveEvent);

// Rotta per bloccare/sbloccare un utente (PATCH /api/admin/users/:id/block)
router.patch('/users/:id/block', adminController.blockUser);


module.exports = router;