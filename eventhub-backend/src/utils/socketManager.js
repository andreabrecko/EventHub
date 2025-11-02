// File: src/utils/socketManager.js
// Manager per condividere l'istanza IO di Socket.IO in tutta l'applicazione.

let ioInstance = null;

/**
 * Imposta l'istanza IO (chiamato una sola volta in server.js).
 * @param {object} io - L'istanza di Socket.IO Server.
 */
exports.setIoInstance = (io) => {
    ioInstance = io;
};

/**
 * Restituisce l'istanza IO per l'uso nei controller.
 * @returns {object|null} L'istanza IO o null se non è stata impostata.
 */
exports.getIoInstance = () => {
    return ioInstance;
};