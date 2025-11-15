#!/usr/bin/env node
const base = 'http://localhost:3000/api';

async function j(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { status: r.status, text: t }; } }

async function login(email, password) {
  const r = await fetch(base + '/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return j(r);
}

async function run() {
  const eventId = Number(process.argv[2]);
  const approveArg = String(process.argv[3] || 'approve'); // 'approve' | 'reject'
  if (!eventId || !['approve','reject'].includes(approveArg)) {
    console.error('Uso: node scripts/adminApproveToggle.js <eventId> <approve|reject>');
    process.exit(1);
  }
  const admin = await login('admin@test.com', 'Password123');
  if (!admin.token) {
    console.error('Login admin fallito:', admin);
    process.exit(1);
  }
  const payload = await j(await fetch(base + `/admin/events/${eventId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isApproved: approveArg === 'approve' })
  }));
  console.log('RESULT', JSON.stringify(payload));
}

run().catch(e => { console.error(e); process.exit(1); });