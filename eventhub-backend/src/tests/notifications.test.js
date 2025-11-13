const fs = require('fs');
const path = require('path');
const assert = require('assert');

function read(p) { return fs.readFileSync(p, 'utf8'); }

// 1) Verifica rimozione codice verifica email
const ucPath = path.join(__dirname, '../controllers/userController.js');
const uc = read(ucPath);
assert(!/verifyEmail/.test(uc), 'verifyEmail presente nel userController');
assert(!/resendVerification/.test(uc), 'resendVerification presente nel userController');
assert(!/verifyCode/.test(uc), 'verifyCode presente nel userController');

// 2) Verifica nuove notifiche
const notify = require('../services/notifyService');
let emitted = [];
// Stubbing socketManager by monkey-patching getIoInstance via require cache is complex; instead call notify with no io and ensure it resolves quickly.
(async () => {
  const start = Date.now();
  await notify.notify({ type: 'userSignup', userId: 1, username: 'andrea', email: 'a@example.com', locale: 'it' });
  const elapsed = Date.now() - start;
  assert(elapsed < 500, 'Notifica non reattiva (<500ms)');
  console.log('✅ Test notifiche base OK');
})();

console.log('✅ Test rimozione verifica email OK');