const nodemailer = require('nodemailer');

// Supporto test/fallback: usa JSON transport o dry-run se configurato
const useJsonTransport = process.env.SMTP_JSON_TRANSPORT === 'true';
const isDryRun = process.env.SMTP_DRY_RUN === 'true';

function buildTransportConfig() {
  if (useJsonTransport) return { jsonTransport: true };
  const svc = (process.env.EMAIL_SERVICE || '').toLowerCase();
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (svc === 'gmail' && emailUser && emailPass) {
    return {
      service: 'gmail',
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
      pool: false,
    };
  }
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
    tls: process.env.SMTP_TLS_SKIP_VERIFY === 'true' ? { rejectUnauthorized: false } : undefined,
    pool: false,
  };
}

const transporter = nodemailer.createTransport(buildTransportConfig());

async function verifySMTP() {
  // Verifica disponibilità del trasporto: in mock/dry-run ritorna sempre ok
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

function validateEmailEnv() {
  const svc = (process.env.EMAIL_SERVICE || '').toLowerCase();
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (useJsonTransport || isDryRun) return { ok: true, message: 'Email in modalità mock/dry-run' };
  if (svc === 'gmail') {
    if (!emailUser || !emailPass) return { ok: false, message: 'EMAIL_USER/PASS mancanti per Gmail' };
    return { ok: true, message: 'Credenziali Gmail caricate' };
  }
  if (process.env.SMTP_HOST) {
    const hasAuth = process.env.SMTP_USER && process.env.SMTP_PASS;
    return { ok: true, message: `SMTP configurato${hasAuth ? ' con auth' : ' senza auth'}` };
  }
  return { ok: false, message: 'Nessuna configurazione email trovata' };
}

const queue = [];
let processing = false;

function enqueue(job) {
  queue.push(job);
  processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift();
    try {
      await job.fn();
      if (job.onSuccess) job.onSuccess();
    } catch (err) {
      if (job.onError) job.onError(err);
    }
  }
  processing = false;
}

async function logEmail({ pool, userId, email, type, subject, status, error_message, meta }) {
  try {
    await pool.query(
      'INSERT INTO EmailLogs (user_id, email, type, subject, status, error_message, meta) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId || null, email, type, subject, status, error_message || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (e) {}
}

function buildBaseTemplate(content) {
  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f6f6f6;color:#222}
        .container{max-width:600px;margin:0 auto;background:#fff;padding:16px}
        .btn{display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px}
        .muted{color:#666;font-size:13px}
      </style>
    </head>
    <body>
      <div class="container">${content}</div>
    </body>
  </html>`;
}

async function sendVerificationEmail({ to, token, pool, userId }) {
  // Costruisce il link di verifica e invia l'email con timeout controllato
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/users/verify-email?token=${encodeURIComponent(token)}`;

  const from = process.env.FROM_EMAIL || 'no-reply@eventhub.local';
  const subject = 'Conferma la tua iscrizione - EventHub';
  const html = buildBaseTemplate(`
    <h2>Conferma la tua email</h2>
    <p>Grazie per esserti registrato su EventHub.</p>
    <p>Clicca il seguente link per confermare la tua email:</p>
    <p><a class="btn" href="${verifyUrl}">Verifica email</a></p>
    <p class="muted">Se non hai richiesto la registrazione, ignora questa email.</p>
  `);

  if (isDryRun) {
    console.log('[SMTP dry-run] Invio email di verifica simulato:', { to, subject, verifyUrl });
    return;
  }

  // Wrapper con timeout per evitare stalli lunghi
  const maxWaitMs = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8000);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout invio email (> ${maxWaitMs} ms)`)), maxWaitMs));

  const sendFn = async () => {
    await Promise.race([
      transporter.sendMail({ from, to, subject, html }),
      timeoutPromise,
    ]);
  };
  enqueue({ fn: async () => {
    try {
      await sendFn();
      if (pool) await logEmail({ pool, userId, email: to, type: 'verify_link', subject, status: 'sent' });
    } catch (err) {
      if (pool) await logEmail({ pool, userId, email: to, type: 'verify_link', subject, status: 'error', error_message: err?.message });
      throw err;
    }
  }});
}

async function sendVerificationCodeEmail({ to, code, pool, userId }) {
  const from = process.env.FROM_EMAIL || 'no-reply@eventhub.local';
  const subject = 'Codice di verifica - EventHub';
  const supportUrl = process.env.SUPPORT_URL || 'https://support.eventhub.local/';
  const html = buildBaseTemplate(`
    <h2>Completa la registrazione</h2>
    <p>Usa il codice di verifica per completare la registrazione:</p>
    <div style="font-size:24px;font-weight:bold;letter-spacing:2px">${code}</div>
    <p>Il codice è valido per 24 ore.</p>
    <p>Vai nella pagina di verifica e inserisci il codice. In caso di problemi visita <a href="${supportUrl}">Supporto</a>.</p>
  `);
  if (isDryRun) {
    console.log('[SMTP dry-run] Invio codice verifica simulato:', { to, subject, code });
    return;
  }
  const maxWaitMs = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8000);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout invio email (> ${maxWaitMs} ms)`)), maxWaitMs));
  const sendFn = async () => {
    await Promise.race([
      transporter.sendMail({ from, to, subject, html }),
      timeoutPromise,
    ]);
  };
  enqueue({ fn: async () => {
    try {
      await sendFn();
      if (pool) await logEmail({ pool, userId, email: to, type: 'verify_code', subject, status: 'sent' });
    } catch (err) {
      if (pool) await logEmail({ pool, userId, email: to, type: 'verify_code', subject, status: 'error', error_message: err?.message });
      throw err;
    }
  }});
}

async function sendLoginNotificationEmail({ to, ua, ip, when, pool, userId }) {
  const from = process.env.FROM_EMAIL || 'no-reply@eventhub.local';
  const subject = 'Accesso effettuato';
  const reportUrl = process.env.REPORT_LOGIN_URL || 'https://support.eventhub.local/security';
  const html = buildBaseTemplate(`
    <h2>Accesso effettuato</h2>
    <p>Data e ora: ${new Date(when).toLocaleString()}</p>
    <p>Dispositivo/Browser: ${ua || 'N/D'}</p>
    <p>IP approssimativo: ${ip || 'N/D'}</p>
    <p><a class="btn" href="${reportUrl}">Segnala accesso non autorizzato</a></p>
  `);
  if (isDryRun) {
    console.log('[SMTP dry-run] Invio notifica login simulato:', { to, subject, ua, ip });
    return;
  }
  const maxWaitMs = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8000);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout invio email (> ${maxWaitMs} ms)`)), maxWaitMs));
  const sendFn = async () => {
    await Promise.race([
      transporter.sendMail({ from, to, subject, html }),
      timeoutPromise,
    ]);
  };
  enqueue({ fn: async () => {
    try {
      await sendFn();
      if (pool) await logEmail({ pool, userId, email: to, type: 'login_notify', subject, status: 'sent', meta: { ua, ip, when } });
    } catch (err) {
      if (pool) await logEmail({ pool, userId, email: to, type: 'login_notify', subject, status: 'error', error_message: err?.message, meta: { ua, ip, when } });
      throw err;
    }
  }});
}

module.exports = { sendVerificationEmail, verifySMTP, sendVerificationCodeEmail, sendLoginNotificationEmail, enqueue, validateEmailEnv };
// File: src/services/emailService.js
// Servizio SMTP per verifica email utenti.
// Supporta modalità mock (jsonTransport) e dry-run per sviluppo/sistemi senza SMTP.
// Espone: verifySMTP() per testare la connessione, sendVerificationEmail() per inviare link di conferma.