// File: src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware'); 
const rateLimiter = require('../middleware/rateLimiter');

// Tutti gli endpoint admin DEVONO essere protetti e ristretti al ruolo 'admin'
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));
// Limite: max 50 richieste ogni 5 minuti per gli endpoint admin
router.use(rateLimiter({ windowMs: 5 * 60 * 1000, max: 50 }));

// Rotta per ottenere eventi in attesa di approvazione
router.get('/events/pending', adminController.getPendingEvents);

// Rotta per approvare/rifiutare un evento (PATCH /api/admin/events/:id/approve)
router.patch('/events/:id/approve', adminController.approveEvent);

// Rotta per bloccare/sbloccare un utente (PATCH /api/admin/users/:id/block)
router.patch('/users/:id/block', adminController.blockUser);

// Rotta per eliminare un evento (DELETE /api/admin/events/:id)
router.delete('/events/:id', adminController.deleteEventAdmin);

// Rotta per ottenere tutti gli utenti (GET /api/admin/users)
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createAdminUser);

// Rotte per gestire segnalazioni
router.get('/reports', adminController.getReportedEvents);
router.patch('/reports/:id', adminController.resolveReport);

module.exports = router;