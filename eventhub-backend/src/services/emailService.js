const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

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

  await transporter.sendMail({ from, to, subject, html });
}

module.exports = { sendVerificationEmail };