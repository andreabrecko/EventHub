#!/usr/bin/env node
require('dotenv').config();
const { verifySMTP } = require('../src/services/emailService');
const nodemailer = require('nodemailer');

async function main() {
  const res = await verifySMTP();
  if (!res.ok) {
    console.error('SMTP non pronto:', res.message);
    process.exit(1);
  }
  const svc = (process.env.EMAIL_SERVICE || '').toLowerCase();
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.FROM_EMAIL || user || 'no-reply@eventhub.local';
  const to = process.env.TEST_EMAIL_TO || user;
  const transporter = nodemailer.createTransport(
    svc === 'gmail' && user && pass
      ? { service: 'gmail', auth: { user, pass } }
      : { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined }
  );
  await transporter.sendMail({
    from,
    to,
    subject: 'EventHub - Email di test',
    html: '<strong>Test OK</strong>: invio email EventHub funzionante.'
  });
  console.log('Email di test inviata a', to);
}

main().catch(err => { console.error('Errore invio test:', err?.message || err); process.exit(1); });