// File: src/utils/errorHandler.js

module.exports = (err, req, res, next) => {
    console.error('ERRORE CRITICO:', err.stack); 

    // Imposta lo stato HTTP a 500 se non è già stato definito
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Invia una risposta JSON standardizzata
    res.status(statusCode).json({
        status: status,
        message: err.message || 'Qualcosa è andato storto nel server!'
    });
};