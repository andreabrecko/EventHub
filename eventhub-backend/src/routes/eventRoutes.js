// File: src/routes/eventRoutes.js

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Configurazione upload foto evento (multer)
const ensureUploadsDir = () => {
    const dirPath = path.join(__dirname, '..', '..', 'uploads', 'events');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = ensureUploadsDir();
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '';
        cb(null, 'event_' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    if (!isImage) {
        return cb(new Error('Sono consentite solo immagini.'));
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadPhotosMiddleware = (req, res, next) => {
    upload.array('photos', 10)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Errore upload file.' });
        }
        next();
    });
};

// Rotta pubblica per la lista e filtri
router.get('/', eventController.getEvents);

// Rotte protette (richiedono token)
// POST /api/events (Creazione Evento)
router.post('/', 
    authMiddleware.protect,
    uploadPhotosMiddleware,
    eventController.createEvent
);

// Rotte protette per Modifica/Cancellazione
// PATCH /api/events/:id (Modifica Evento)
router.patch('/:id', 
    authMiddleware.protect, 
    eventController.updateEvent
);

// DELETE /api/events/:id (Cancellazione Evento)
router.delete('/:id', 
    authMiddleware.protect, 
    eventController.deleteEvent
);

// Rotte per Iscrizione e Annullamento
// POST /api/events/:id/register (Iscrizione)
router.post('/:id/register', 
    authMiddleware.protect, 
    eventController.registerForEvent
);

// DELETE /api/events/:id/register (Annullamento iscrizione)
router.delete('/:id/register', 
    authMiddleware.protect, 
    eventController.unregisterFromEvent
);

// Rotta per ottenere tutte le categorie
router.get('/categories', eventController.getCategories);

// Rotta temporanea per aggiungere una categoria
router.post('/add-category', authMiddleware.protect, authMiddleware.restrictTo('admin'), eventController.addCategory);

module.exports = router;