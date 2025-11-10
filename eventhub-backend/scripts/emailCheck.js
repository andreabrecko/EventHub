// Simple SMTP connectivity check
require('dotenv').config();
const { verifySMTP } = require('../src/services/emailService');

(async () => {
  const res = await verifySMTP();
  if (res.ok) {
    console.log('SMTP OK:', res.message);
    process.exit(0);
  } else {
    console.error('SMTP FAIL:', res.message);
    process.exit(1);
  }
})();