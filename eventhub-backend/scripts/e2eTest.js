const base = 'http://localhost:3000/api';

async function j(r) {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t }; }
}

async function login(email, password) {
  const r = await fetch(base + '/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return j(r);
}

async function run() {
  const user = await login('andrea.brecko@edu-its.it', 'Its2025!');
  console.log('USER', JSON.stringify({ status: user.status, user: user.user }));
  try {
    const { pool } = require('../src/config/db');
    const r = await pool.query("SELECT status, subject, created_at FROM EmailLogs WHERE email = $1 AND type = 'login_notify' ORDER BY created_at DESC LIMIT 1", ['andrea.brecko@edu-its.it']);
    const last = r.rows[0];
    console.log('EMAIL_LOGIN_NOTIFY', JSON.stringify(last || {}));
  } catch (e) { console.log('EMAIL_LOGS_ERROR', e && e.message); }
  const cats = await j(await fetch(base + '/events/categories'));
  console.log('CATEGORIES', JSON.stringify(Array.isArray(cats) ? cats.slice(0, 3) : cats));
  const catId = (Array.isArray(cats) && cats[0] && cats[0].id) || 1;
  const fd = new FormData();
  fd.append('title', 'Evento E2E');
  fd.append('description', 'Creazione evento automatizzata');
  fd.append('date', new Date(Date.now() + 86400000).toISOString());
  fd.append('location', 'Torino');
  fd.append('capacity', '20');
  fd.append('category_id', String(catId));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#09f"/></svg>';
  fd.append('photos', new Blob([svg], { type: 'image/svg+xml' }), 'pixel.svg');
  const ev = await j(await fetch(base + '/events', { method: 'POST', headers: { Authorization: 'Bearer ' + user.token }, body: fd }));
  console.log('EVENT', JSON.stringify({ id: (ev.event && ev.event.id) || ev.id, message: ev.message }));
  const eventId = (ev.event && ev.event.id) || ev.id;
  const admin = await login('admin@test.com', 'Password123');
  console.log('ADMIN', JSON.stringify({ user: admin.user }));
  const appr = await j(await fetch(base + `/admin/events/${eventId}/approve`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isApproved: true }) }));
  console.log('APPROVE', JSON.stringify(appr));
  const reg = await j(await fetch(base + `/events/${eventId}/register`, { method: 'POST', headers: { Authorization: 'Bearer ' + user.token } }));
  console.log('REGISTER', JSON.stringify(reg));
  const unreg = await j(await fetch(base + `/events/${eventId}/register`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + user.token } }));
  console.log('UNREGISTER', JSON.stringify(unreg));
  const rep = await j(await fetch(base + `/events/${eventId}/report`, { method: 'POST', headers: { Authorization: 'Bearer ' + user.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Segnalazione E2E' }) }));
  console.log('REPORT', JSON.stringify(rep));
  const notif = await j(await fetch(base + '/users/notifications', { method: 'PATCH', headers: { Authorization: 'Bearer ' + user.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) }));
  console.log('NOTIFY_ENABLE', JSON.stringify(notif));

  const delAuth = await fetch(base + `/events/${eventId}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + user.token } });
  console.log('DELETE_OWNER_STATUS', delAuth.status);

  const fd2 = new FormData();
  fd2.append('title', 'Evento Admin');
  fd2.append('description', 'Creato da admin');
  fd2.append('date', new Date(Date.now() + 86400000 * 2).toISOString());
  fd2.append('location', 'Roma');
  fd2.append('capacity', '10');
  fd2.append('category_id', String(catId));
  const svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#0f9"/></svg>';
  fd2.append('photos', new Blob([svg2], { type: 'image/svg+xml' }), 'pixel2.svg');
  const evAdmin = await j(await fetch(base + '/events', { method: 'POST', headers: { Authorization: 'Bearer ' + admin.token }, body: fd2 }));
  console.log('EVENT_ADMIN', JSON.stringify({ id: (evAdmin.event && evAdmin.event.id) || evAdmin.id }));
  const apprAdmin = await j(await fetch(base + `/admin/events/${(evAdmin.event && evAdmin.event.id) || evAdmin.id}/approve`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isApproved: true }) }));
  console.log('APPROVE_ADMIN', JSON.stringify(apprAdmin));
  const delUnauth = await j(await fetch(base + `/events/${(evAdmin.event && evAdmin.event.id) || evAdmin.id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + user.token } }));
  console.log('DELETE_UNAUTHORIZED', JSON.stringify(delUnauth));
}

run().catch(e => { console.error(e); process.exit(1); });