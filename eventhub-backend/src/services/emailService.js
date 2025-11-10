const nodemailer = require('nodemailer');

// Supporto test/fallback: usa JSON transport o dry-run se configurato
const useJsonTransport = process.env.SMTP_JSON_TRANSPORT === 'true';
const isDryRun = process.env.SMTP_DRY_RUN === 'true';

const transporter = nodemailer.createTransport(
  useJsonTransport
    ? { jsonTransport: true }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
        // Timeout più brevi per evitare blocchi della richiesta
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000), // 10s
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000), // 8s
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000), // 15s
        tls: process.env.SMTP_TLS_SKIP_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined,
        pool: false,
      }
);

async function verifySMTP() {
  if (useJsonTransport || isDryRun) {
    return { ok: true, message: 'SMTP in modalità mock/dry-run' };
  }
  try {
    const verified = await transporter.verify();
    return { ok: verified === true, message: verified ? 'SMTP verificato' : 'SMTP non verificato' };
  } catch (err) {
    return { ok: false, message: err?.message || String(err) };
  }
}

async function sendVerificationEmail({ to, token }) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/users/verify-email?token=${encodeURIComponent(token)}`;

  const from = process.env.FROM_EMAIL || 'no-reply@eventhub.local';
  const subject = 'Conferma la tua iscrizione - EventHub';
  const html = `
    <p>Ciao!</p>
    <p>Grazie per esserti registrato su EventHub.</p>
    <p>Clicca il seguente link per confermare la tua email:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>Se non hai richiesto la registrazione, ignora questa email.</p>
  `;

  if (isDryRun) {
    console.log('[SMTP dry-run] Invio email di verifica simulato:', { to, subject, verifyUrl });
    return;
  }

  // Wrapper con timeout per evitare stalli lunghi
  const maxWaitMs = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8000);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout invio email (> ${maxWaitMs} ms)`)), maxWaitMs));

  await Promise.race([
    transporter.sendMail({ from, to, subject, html }),
    timeoutPromise,
  ]);
}

module.exports = { sendVerificationEmail, verifySMTP };