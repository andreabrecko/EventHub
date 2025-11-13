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
  const user = await login('user.e2e.test@example.com', 'Aa1!test123');
  console.log('USER', JSON.stringify(user));
  const cats = await j(await fetch(base + '/events/categories'));
  console.log('CATEGORIES', JSON.stringify(Array.isArray(cats) ? cats.slice(0, 3) : cats));
  const catId = (Array.isArray(cats) && cats[0] && cats[0].id) || 1;
  const fd = new FormData();
  fd.append('title', 'Evento Test Upload');
  fd.append('description', 'Prova upload immagine e approvazione');
  fd.append('date', new Date(Date.now() + 86400000).toISOString());
  fd.append('location', 'Milano');
  fd.append('capacity', '25');
  fd.append('category_id', String(catId));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#09f"/></svg>';
  fd.append('photos', new Blob([svg], { type: 'image/svg+xml' }), 'pixel.svg');
  const ev = await j(await fetch(base + '/events', { method: 'POST', headers: { Authorization: 'Bearer ' + user.token }, body: fd }));
  console.log('EVENT', JSON.stringify(ev));
  const eventId = (ev.event && ev.event.id) || ev.id;
  const admin = await login('admin@test.com', 'Password123');
  console.log('ADMIN', JSON.stringify({ user: admin.user }));
  const pend = await j(await fetch(base + '/admin/events/pending', { headers: { Authorization: 'Bearer ' + admin.token } }));
  console.log('PENDING', JSON.stringify(pend.count));
  const appr = await j(await fetch(base + `/admin/events/${eventId}/approve`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isApproved: true }) }));
  console.log('APPROVE', JSON.stringify(appr));
  const pub = await j(await fetch(base + '/events'));
  const found = Array.isArray(pub.events) && pub.events.some(e => e.id === eventId);
  console.log('PUBLIC_FOUND', found);
  const rep = await j(await fetch(base + `/events/${eventId}/report`, { method: 'POST', headers: { Authorization: 'Bearer ' + user.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Segnalazione automatica E2E' }) }));
  console.log('REPORT', JSON.stringify(rep));
  const reps = await j(await fetch(base + '/admin/reports', { headers: { Authorization: 'Bearer ' + admin.token } }));
  console.log('REPORTS', JSON.stringify({ count: reps.count }));
  const reportId = (Array.isArray(reps.reports) && reps.reports.find(r => r.event_id === eventId)?.report_id) || (reps.reports && reps.reports[0]?.report_id);
  const keep = await j(await fetch(base + `/admin/reports/${reportId}`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'keep' }) }));
  console.log('REPORT_KEEP', JSON.stringify(keep));
  const del = await j(await fetch(base + `/admin/events/${eventId}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + admin.token } }));
  console.log('ADMIN_DELETE', JSON.stringify(del));
  const uid = user.user && user.user.id;
  const blk = await j(await fetch(base + `/admin/users/${uid}/block`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isBlocked: true }) }));
  console.log('ADMIN_BLOCK', JSON.stringify(blk));
  const unb = await j(await fetch(base + `/admin/users/${uid}/block`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isBlocked: false }) }));
  console.log('ADMIN_UNBLOCK', JSON.stringify(unb));
  const bad = await fetch(base + '/events', { method: 'POST', headers: { Authorization: 'Bearer badtoken' }, body: fd });
  console.log('EXPIRED_TOKEN_STATUS', bad.status);
}

run().catch(e => { console.error(e); process.exit(1); });