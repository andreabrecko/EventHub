// File: src/utils/errorHandler.js
// Middleware di errore Express centralizzato.
// Normalizza risposta JSON e registra lo stack in console per diagnosi.

module.exports = (err, req, res, next) => {
    // Log stack per debugging e auditing di errori runtime
    console.error('ERRORE CRITICO:', err.stack); 

    // Imposta lo stato HTTP a 500 se non è già stato definito
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Risposta JSON standardizzata
    res.status(statusCode).json({
        status: status,
        message: err.message || 'Qualcosa è andato storto nel server!'
    });
};